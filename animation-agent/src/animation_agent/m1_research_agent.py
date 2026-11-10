"""Milestone 1: a ReAct agent, written by hand so every moving part is visible.

ReAct means Reason + Act. The whole algorithm is this loop:

    1. The model reads the conversation and replies with either tool calls or a final answer.
    2. If it asked for tools, our code runs them and appends each result as a ToolMessage.
    3. Go to 1.

Three things stop that loop from running forever or going wrong, and every agent needs them:

- a step cap (`max_steps`), after which the model is told to answer with what it has;
- tool errors returned to the model as observations instead of crashing the program;
- a guard that refuses to re-run an identical call, the most common way agents spin.

In Milestone 2 we replace this hand-written loop with an explicit LangGraph graph. Keep this
file next to that one: it is the clearest picture of what the graph is doing for you.

Run:  uv run anim research
      uv run anim research "Which stop motion formats are growing this week?" --max-steps 4
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Callable, Literal

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool
from langsmith import traceable

from .llm import get_model
from .tools import ALL_TOOLS

PROMPTS = Path(__file__).parent / "prompts"
DEFAULT_QUESTION = "What animation styles trended on YouTube this month, and why?"
FINAL_TURN_NUDGE = (
    "Your tool turns are used up. Write your final answer to the original question now, using only "
    "the tool results above, and say clearly what you could not check."
)


@dataclass
class Step:
    """One trip around the loop: what the model thought, which tools it called, what came back."""

    number: int
    thought: str
    calls: list[dict[str, Any]] = field(default_factory=list)
    results: list[str] = field(default_factory=list)
    errors: int = 0


@dataclass
class ResearchResult:
    question: str
    answer: str
    stop_reason: Literal["answered", "step_limit"]
    steps: list[Step]
    messages: list[BaseMessage]

    @property
    def tool_calls(self) -> int:
        return sum(len(s.calls) for s in self.steps)


def build_system_prompt(max_steps: int, today: date | None = None) -> str:
    # str.replace, not str.format, so the prompt file can contain braces safely.
    text = (PROMPTS / "researcher.md").read_text()
    return text.replace("{today}", (today or date.today()).isoformat()).replace("{max_steps}", str(max_steps))


def _text(message: AIMessage) -> str:
    return message.content if isinstance(message.content, str) else json.dumps(message.content)


def run_tool(call: dict[str, Any], tools: dict[str, BaseTool], seen: dict[str, str]) -> tuple[str, Literal["success", "error"]]:
    """Run one tool call. Never raises: every failure becomes text the model can react to."""
    tool = tools.get(call["name"])
    if tool is None:
        return f"ERROR: there is no tool named {call['name']!r}. Available tools: {', '.join(tools)}.", "error"

    key = f"{call['name']}:{json.dumps(call['args'], sort_keys=True)}"
    if key in seen:
        return (f"NOTE: this exact call was already made (call id {seen[key]}) and its result is above. "
                "Change the arguments or move on to answering."), "error"
    seen[key] = call["id"]

    try:
        output = tool.invoke(call["args"])
    except Exception as exc:  # bad arguments, network errors, site changes: all are observations
        return f"ERROR: {type(exc).__name__}: {str(exc)[:400]}. Fix the arguments or try a different approach.", "error"
    return output if isinstance(output, str) else json.dumps(output, ensure_ascii=False, default=str), "success"


@traceable(name="m1_research_agent", run_type="chain")
def run_research(
    question: str = DEFAULT_QUESTION,
    *,
    max_steps: int = 6,
    model: BaseChatModel | None = None,
    tools: list[BaseTool] | None = None,
    on_step: Callable[[Step], None] | None = None,
    today: date | None = None,
) -> ResearchResult:
    """Answer `question` by looping model -> tools -> model, at most `max_steps` tool turns."""
    tools = tools or ALL_TOOLS
    by_name = {t.name: t for t in tools}
    base = model or get_model("researcher")
    llm = base.bind_tools(tools)

    messages: list[BaseMessage] = [SystemMessage(build_system_prompt(max_steps, today)), HumanMessage(question)]
    steps: list[Step] = []
    seen: dict[str, str] = {}

    for number in range(1, max_steps + 1):
        ai: AIMessage = llm.invoke(messages)
        messages.append(ai)
        if not ai.tool_calls:                                   # the model chose to answer
            return ResearchResult(question, _text(ai), "answered", steps, messages)

        step = Step(number, thought=ai.additional_kwargs.get("thought") or _text(ai))
        for call in ai.tool_calls:
            content, status = run_tool(call, by_name, seen)
            messages.append(ToolMessage(content, tool_call_id=call["id"], name=call["name"], status=status))
            step.calls.append({"name": call["name"], "args": call["args"]})
            step.results.append(content)
            step.errors += status == "error"
        steps.append(step)
        if on_step:
            on_step(step)

    # Out of tool turns. One last call asks for an answer with the tools taken away
    # (tool_choice="none" keeps their definitions, which some providers need to read the history,
    # but forbids calling them). If the model still asks for tools, we stop anyway: the loop's
    # exit must never depend on the model behaving.
    messages.append(HumanMessage(FINAL_TURN_NUDGE))
    ai = base.bind_tools(tools, tool_choice="none").invoke(messages)
    messages.append(ai)
    answer = _text(ai)
    if ai.tool_calls:
        answer = f"{answer}\n\n(Stopped at the step limit before the agent produced a final answer.)"
    return ResearchResult(question, answer, "step_limit", steps, messages)
