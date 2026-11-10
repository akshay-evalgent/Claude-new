"""The hand-written ReAct loop, driven by a scripted fake model. No network, no real model."""
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool
from pydantic import Field

from animation_agent.m1_research_agent import FINAL_TURN_NUDGE, run_research


class ScriptedModel(BaseChatModel):
    """Replies from a script. The last reply repeats forever, which lets us simulate a stuck agent."""

    script: list[AIMessage]
    received: list[list[BaseMessage]] = Field(default_factory=list)
    tool_choices: list[Any] = Field(default_factory=list)

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def _generate(self, messages, stop=None, run_manager=None, **kwargs: Any) -> ChatResult:
        self.received.append(list(messages))
        reply = self.script.pop(0) if len(self.script) > 1 else self.script[0]
        return ChatResult(generations=[ChatGeneration(message=reply)])

    def bind_tools(self, tools, tool_choice=None, **kwargs):
        self.tool_choices.append(tool_choice)
        return self


@tool
def echo(text: str) -> str:
    """Echo text back."""
    return f"echo:{text}"


@tool
def explode() -> str:
    """Always fails."""
    raise ValueError("site changed its layout")


def call(name: str, args: dict, i: int = 1) -> AIMessage:
    return AIMessage("", tool_calls=[{"name": name, "args": args, "id": f"c{i}"}], additional_kwargs={"thought": f"use {name}"})


def test_tool_then_answer():
    model = ScriptedModel(script=[call("echo", {"text": "clay"}), AIMessage("Claymation is up.")])
    result = run_research("q", model=model, tools=[echo], max_steps=4)
    assert result.stop_reason == "answered" and result.answer == "Claymation is up."
    assert result.tool_calls == 1 and result.steps[0].results == ["echo:clay"]
    tool_msg = model.received[1][-1]
    assert isinstance(tool_msg, ToolMessage) and tool_msg.content == "echo:clay" and tool_msg.tool_call_id == "c1"


def test_tool_errors_become_observations_not_crashes():
    model = ScriptedModel(script=[call("explode", {}), call("nope", {}, 2), AIMessage("done")])
    result = run_research("q", model=model, tools=[echo, explode], max_steps=5)
    assert result.stop_reason == "answered"
    assert "ValueError: site changed its layout" in result.steps[0].results[0]
    assert "no tool named 'nope'" in result.steps[1].results[0]
    assert result.steps[0].errors == 1


def test_stuck_agent_hits_step_limit_and_still_returns():
    model = ScriptedModel(script=[call("echo", {"text": "same"})])   # asks for the same tool forever
    result = run_research("q", model=model, tools=[echo], max_steps=3)
    assert result.stop_reason == "step_limit"
    assert len(result.steps) == 3 and len(model.received) == 4        # 3 tool turns + 1 forced answer turn
    assert "already made" in result.steps[1].results[0]                # the repeat guard fired
    assert isinstance(model.received[-1][-1], HumanMessage) and model.received[-1][-1].content == FINAL_TURN_NUDGE
    assert model.tool_choices == [None, "none"]                        # tools are taken away for the last turn
    assert "Stopped at the step limit" in result.answer
