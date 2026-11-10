"""One place that decides which model answers.

Lesson: nodes call `get_model()` and never import a provider directly. Today the
default provider is the Claude account already logged in to the `claude` CLI, reached
through the Claude Agent SDK. Tomorrow it can be an API key, Gemini, or a local model,
and no node changes.

The interesting part is `ClaudeCodeChatModel`: it adapts the Agent SDK to LangChain's
`BaseChatModel` interface so LangGraph, LangSmith tracing, `with_structured_output` and
`bind_tools` all work with it. Writing an adapter like this is how you plug *anything*
into LangChain.

Milestone 1 adds tool calling. Read `bind_tools` and `_tool_turn_schema`: they show that
"tool calling" is nothing magic. The model fills a schema that says which function to run
with which arguments, your code runs it, and the result goes back as a message.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from typing import Any, Callable, Sequence

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.messages.tool import ToolCall
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.runnables import Runnable, RunnableLambda
from langchain_core.tools import BaseTool
from langchain_core.utils.function_calling import convert_to_openai_tool
from pydantic import BaseModel

from .config import settings


def _text(m: BaseMessage) -> str:
    """Text of a message. For multimodal content, only the text parts: images travel separately."""
    if isinstance(m.content, str):
        return m.content
    return "\n".join(p.get("text", "") if isinstance(p, dict) else str(p)
                     for p in m.content if not (isinstance(p, dict) and p.get("type") in ("image", "image_url")))


def _image_blocks(messages: Sequence[BaseMessage]) -> list[dict]:
    """Collect images from message content, as Anthropic image blocks. Accepts Anthropic-style
    {"type": "image", "source": ...} and LangChain-style {"type": "image_url", "image_url": data URL}."""
    blocks: list[dict] = []
    for m in messages:
        if isinstance(m.content, str):
            continue
        for part in m.content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "image" and "source" in part:
                blocks.append({"type": "image", "source": part["source"]})
            elif part.get("type") == "image_url":
                url = part["image_url"]["url"] if isinstance(part["image_url"], dict) else part["image_url"]
                header, _, data = url.partition(",")
                media = header.removeprefix("data:").split(";")[0] or "image/jpeg"
                blocks.append({"type": "image", "source": {"type": "base64", "media_type": media, "data": data}})
    return blocks


def _split_messages(messages: Sequence[BaseMessage]) -> tuple[str | None, str]:
    """The Agent SDK takes one system prompt and one user prompt per query.

    We fold the conversation into a single transcript, including the tool calls the model
    made and the results that came back. Every ReAct step re-sends the whole transcript,
    which is how chat APIs work too: the model is stateless, the message list is the memory.
    """
    system = "\n\n".join(_text(m) for m in messages if isinstance(m, SystemMessage)) or None
    rest = [m for m in messages if not isinstance(m, SystemMessage)]
    if len(rest) == 1 and isinstance(rest[0], HumanMessage):
        return system, _text(rest[0])

    convo: list[str] = []
    for m in rest:
        text = _text(m)
        if isinstance(m, HumanMessage):
            convo.append(f"User: {text}")
        elif isinstance(m, AIMessage):
            if text:
                convo.append(f"Assistant: {text}")
            for call in m.tool_calls:
                convo.append(f"Assistant called tool `{call['name']}` (call id {call['id']}) "
                             f"with arguments {json.dumps(call['args'], ensure_ascii=False)}")
        elif isinstance(m, ToolMessage):
            flag = ", FAILED" if m.status == "error" else ""
            convo.append(f"Tool result for call id {m.tool_call_id} (`{m.name}`{flag}):\n{text}")
        else:
            convo.append(text)
    return system, "\n\n".join(convo)


def _tool_turn_schema(specs: list[dict], tool_choice: str | None) -> dict:
    """The JSON schema for one ReAct turn: a thought, then either tool calls or a final answer.

    Each allowed call is `{"name": <one tool>, "args": <that tool's own argument schema>}`,
    so the arguments are validated against the tool's signature before our code sees them.
    """
    call_variants = [
        {
            "type": "object",
            "properties": {"name": {"type": "string", "const": spec["name"]}, "args": spec["parameters"]},
            "required": ["name", "args"],
            "additionalProperties": False,
        }
        for spec in specs
    ]
    properties: dict[str, Any] = {
        "thought": {"type": "string", "description": "Briefly: what you know so far and what you will do next."},
        "final_answer": {"type": "string", "description": "Your complete answer to the user. Only when you are done calling tools."},
    }
    required = ["thought"]
    if tool_choice != "none":
        properties["tool_calls"] = {
            "type": "array",
            "items": {"anyOf": call_variants},
            "description": "Tools to run now. Several independent calls may go in one turn. Empty when giving final_answer.",
        }
        if tool_choice in ("any", "required"):
            properties["tool_calls"]["minItems"] = 1
            required.append("tool_calls")
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


def _tool_instructions(specs: list[dict], tool_choice: str | None) -> str:
    lines = ["## Tools", "",
             "You can call the tools below. You do not run them yourself: list the calls in `tool_calls`",
             "and their results come back to you in the next turn.", ""]
    for spec in specs:
        lines.append(f"### {spec['name']}\n{spec.get('description', '').strip()}\n")
    if tool_choice == "none":
        lines.append("Tools are disabled for this turn. Reply with `thought` and `final_answer` only.")
    else:
        lines += ["Reply with one JSON object each turn:",
                  "- To use tools: `thought` plus `tool_calls`. Batch independent calls into one turn.",
                  "- To finish: `thought` plus `final_answer`, with no `tool_calls`."]
    return "\n".join(lines)


async def _run_query(
    prompt: str, system_prompt: str | None, model: str, schema: dict | None, max_turns: int = 3,
    images: list[dict] | None = None,
) -> dict[str, Any]:
    from claude_agent_sdk import AssistantMessage, ClaudeAgentOptions, ResultMessage, TextBlock, query

    options = ClaudeAgentOptions(
        system_prompt=system_prompt or "You are a precise analyst. Answer directly.",
        model=model,
        # Claude Code returns structured output through an internal tool call, and retries when
        # the output fails the schema. Both use turns. With tools=[] nothing else can, so a little
        # headroom costs nothing on success and avoids "Reached maximum number of turns" errors.
        max_turns=max_turns,
        tools=[],                      # a pure model call: no file, shell, or web tools
        output_format={"type": "json_schema", "schema": schema} if schema else None,
    )
    text_parts: list[str] = []
    structured: Any = None
    usage: dict[str, Any] = {}
    request: Any = prompt
    if images:
        # Images need the SDK's streaming-input mode: one user message with image blocks, then text.
        async def one_message():
            yield {"type": "user", "message": {"role": "user", "content": [*images, {"type": "text", "text": prompt}]},
                   "parent_tool_use_id": None, "session_id": "default"}
        request = one_message()
    async for msg in query(prompt=request, options=options):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    text_parts.append(block.text)
        elif isinstance(msg, ResultMessage):
            structured = getattr(msg, "structured_output", None)
            usage = {"cost_usd": msg.total_cost_usd, "duration_ms": msg.duration_ms, "num_turns": msg.num_turns,
                     "usage": msg.usage}
    return {"text": "".join(text_parts), "structured": structured, "usage": usage}


def _run_sync(coro):
    """Run an async coroutine from sync code, even if an event loop is already running."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    # Inside a running loop (notebooks, LangGraph async): run in a worker thread.
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result()


class ClaudeCodeChatModel(BaseChatModel):
    """LangChain chat model backed by the Claude Agent SDK (the logged-in `claude` CLI)."""

    model: str = "claude-opus-5-5"
    json_schema: dict | None = None   # set by with_structured_output
    tool_specs: list[dict] | None = None  # set by bind_tools
    tool_choice: str | None = None        # None/"auto", "any"/"required", or "none"
    max_turns: int = 3                    # SDK turns per call; see _run_query

    @property
    def _llm_type(self) -> str:
        return "claude-code-agent-sdk"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {"model": self.model}

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        system_prompt, prompt = _split_messages(messages)
        schema = self.json_schema
        if self.tool_specs:
            schema = _tool_turn_schema(self.tool_specs, self.tool_choice)
            system_prompt = f"{system_prompt or ''}\n\n{_tool_instructions(self.tool_specs, self.tool_choice)}".strip()
        images = _image_blocks(messages)
        result = _run_sync(_run_query(prompt, system_prompt, self.model, schema, self.max_turns, images=images or None))
        if os.environ.get("ANIM_DEBUG"):
            print(f"[llm] {self.model} cost=${result['usage'].get('cost_usd') or 0:.4f} "
                  f"duration={result['usage'].get('duration_ms', 0)}ms", file=sys.stderr)
        if self.tool_specs:
            message = _tool_turn_message(result)
        else:
            content = json.dumps(result["structured"]) if result["structured"] is not None else result["text"]
            message = AIMessage(content=content, response_metadata=result["usage"])
        return ChatResult(generations=[ChatGeneration(message=message)])

    def bind_tools(
        self,
        tools: Sequence[dict[str, Any] | type | Callable | BaseTool],
        *,
        tool_choice: str | None = None,
        **kwargs: Any,
    ) -> Runnable:
        """Same signature as every LangChain chat model, so agent code never knows the provider."""
        specs = [convert_to_openai_tool(t)["function"] for t in tools]
        return self.model_copy(update={"tool_specs": specs, "tool_choice": tool_choice})

    def with_structured_output(self, schema: type[BaseModel], **kwargs: Any) -> Runnable:
        """Return a runnable that yields a validated Pydantic object.

        The Agent SDK enforces the JSON schema server-side; we still validate with
        Pydantic so field constraints (ge/le, min_length) are checked too.
        """
        bound = self.model_copy(update={"json_schema": schema.model_json_schema()})

        def _parse(msg: AIMessage) -> BaseModel:
            return schema.model_validate_json(msg.content if isinstance(msg.content, str) else json.dumps(msg.content))

        return bound | RunnableLambda(_parse).with_config(run_name=f"parse_{schema.__name__}")


def _tool_turn_message(result: dict[str, Any]) -> AIMessage:
    """Turn the model's structured reply into a standard AIMessage with `tool_calls`."""
    data = result["structured"]
    if data is None:
        try:
            data = json.loads(result["text"])
        except (TypeError, ValueError):
            return AIMessage(content=result["text"], response_metadata=result["usage"])
    thought = data.get("thought", "")
    calls = [
        ToolCall(name=c["name"], args=c.get("args") or {}, id=f"call_{uuid.uuid4().hex[:12]}")
        for c in data.get("tool_calls") or []
        if isinstance(c, dict) and c.get("name")
    ]
    content = thought if calls else (data.get("final_answer") or thought)
    return AIMessage(content=content, tool_calls=calls, additional_kwargs={"thought": thought},
                     response_metadata=result["usage"])


CHEAP_ROLES = {"triage", "query"}   # quick classification and query parsing


def model_name(role: str) -> str:
    """Cheap steps get the cheap model (LLM_MODEL_TRIAGE); everything else gets LLM_MODEL."""
    if role in CHEAP_ROLES and settings.llm_model_triage:
        return settings.llm_model_triage
    return settings.llm_model


def get_model(role: str = "analyst") -> BaseChatModel:
    """Return the chat model for a role: "triage" routes to LLM_MODEL_TRIAGE, the rest to LLM_MODEL."""
    provider = settings.llm_provider
    if provider == "claude-code":
        return ClaudeCodeChatModel(model=model_name(role))
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=model_name(role), api_key=settings.anthropic_api_key, max_tokens=16000)
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(model=settings.llm_model, google_api_key=settings.google_api_key)
    if provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(model=settings.ollama_model)
    raise ValueError(f"Unknown LLM_PROVIDER {provider!r}")
