"""One place that decides which model answers.

Lesson: nodes call `get_model()` and never import a provider directly. Today the
default provider is the Claude account already logged in to the `claude` CLI, reached
through the Claude Agent SDK. Tomorrow it can be an API key, Gemini, or a local model,
and no node changes.

The interesting part is `ClaudeCodeChatModel`: it adapts the Agent SDK to LangChain's
`BaseChatModel` interface so LangGraph, LangSmith tracing, and `with_structured_output`
all work with it. Writing an adapter like this is how you plug *anything* into LangChain.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any, Iterator, Sequence

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.runnables import Runnable, RunnableLambda
from pydantic import BaseModel

from .config import settings


def _split_messages(messages: Sequence[BaseMessage]) -> tuple[str | None, str]:
    """The Agent SDK takes one system prompt and one user prompt per query.

    We fold the conversation into a single transcript. Good enough for single-shot
    nodes, which is all this agent needs; multi-turn chat would use ClaudeSDKClient.
    """
    system_parts: list[str] = []
    convo: list[str] = []
    for m in messages:
        text = m.content if isinstance(m.content, str) else json.dumps(m.content)
        if isinstance(m, SystemMessage):
            system_parts.append(text)
        elif isinstance(m, HumanMessage):
            convo.append(text if len(messages) - len(system_parts) == 1 else f"User: {text}")
        elif isinstance(m, AIMessage):
            convo.append(f"Assistant: {text}")
        else:
            convo.append(text)
    return ("\n\n".join(system_parts) or None), "\n\n".join(convo)


async def _run_query(prompt: str, system_prompt: str | None, model: str, schema: dict | None) -> dict[str, Any]:
    from claude_agent_sdk import AssistantMessage, ClaudeAgentOptions, ResultMessage, TextBlock, query

    options = ClaudeAgentOptions(
        system_prompt=system_prompt or "You are a precise analyst. Answer directly.",
        model=model,
        max_turns=1,
        tools=[],                      # a pure model call: no file, shell, or web tools
        output_format={"type": "json_schema", "schema": schema} if schema else None,
    )
    text_parts: list[str] = []
    structured: Any = None
    usage: dict[str, Any] = {}
    async for msg in query(prompt=prompt, options=options):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    text_parts.append(block.text)
        elif isinstance(msg, ResultMessage):
            structured = getattr(msg, "structured_output", None)
            usage = {"cost_usd": msg.total_cost_usd, "duration_ms": msg.duration_ms, "usage": msg.usage}
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
        result = _run_sync(_run_query(prompt, system_prompt, self.model, self.json_schema))
        if os.environ.get("ANIM_DEBUG"):
            print(f"[llm] {self.model} cost=${result['usage'].get('cost_usd', 0):.4f} "
                  f"duration={result['usage'].get('duration_ms', 0)}ms", file=sys.stderr)
        content = json.dumps(result["structured"]) if result["structured"] is not None else result["text"]
        message = AIMessage(content=content, response_metadata=result["usage"])
        return ChatResult(generations=[ChatGeneration(message=message)])

    def with_structured_output(self, schema: type[BaseModel], **kwargs: Any) -> Runnable:
        """Return a runnable that yields a validated Pydantic object.

        The Agent SDK enforces the JSON schema server-side; we still validate with
        Pydantic so field constraints (ge/le, min_length) are checked too.
        """
        bound = self.model_copy(update={"json_schema": schema.model_json_schema()})

        def _parse(msg: AIMessage) -> BaseModel:
            return schema.model_validate_json(msg.content if isinstance(msg.content, str) else json.dumps(msg.content))

        return bound | RunnableLambda(_parse).with_config(run_name=f"parse_{schema.__name__}")


def get_model(role: str = "analyst") -> BaseChatModel:
    """Return the chat model for a role. Roles let us route cheap steps to cheap models later."""
    provider = settings.llm_provider
    if provider == "claude-code":
        return ClaudeCodeChatModel(model=settings.llm_model)
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=settings.llm_model, api_key=settings.anthropic_api_key, max_tokens=16000)
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(model=settings.llm_model, google_api_key=settings.google_api_key)
    if provider == "ollama":
        from langchain_ollama import ChatOllama

        return ChatOllama(model=settings.ollama_model)
    raise ValueError(f"Unknown LLM_PROVIDER {provider!r}")
