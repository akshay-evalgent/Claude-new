"""How the Claude Agent SDK adapter implements LangChain tool calling. No model calls."""
import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from animation_agent import llm
from animation_agent.llm import ClaudeCodeChatModel, _split_messages, _tool_turn_message, _tool_turn_schema


@tool
def lookup(term: str, limit: int = 3) -> str:
    """Look something up."""
    return term


SPECS = [{"name": "lookup", "description": "Look something up.",
          "parameters": {"type": "object", "properties": {"term": {"type": "string"}}, "required": ["term"]}}]


def test_turn_schema_constrains_each_call_to_a_real_tool():
    schema = _tool_turn_schema(SPECS, None)
    variant = schema["properties"]["tool_calls"]["items"]["anyOf"][0]
    assert variant["properties"]["name"]["const"] == "lookup"
    assert variant["properties"]["args"]["required"] == ["term"]
    assert schema["required"] == ["thought"]


def test_tool_choice_none_and_required():
    assert "tool_calls" not in _tool_turn_schema(SPECS, "none")["properties"]
    forced = _tool_turn_schema(SPECS, "any")
    assert "tool_calls" in forced["required"] and forced["properties"]["tool_calls"]["minItems"] == 1


def test_structured_reply_becomes_tool_calls():
    usage = {"cost_usd": 0.01}
    msg = _tool_turn_message({"structured": {"thought": "search first", "tool_calls": [{"name": "lookup", "args": {"term": "clay"}}]},
                              "text": "", "usage": usage})
    assert msg.tool_calls[0]["name"] == "lookup" and msg.tool_calls[0]["args"] == {"term": "clay"}
    assert msg.tool_calls[0]["id"].startswith("call_")
    assert msg.content == "search first"

    final = _tool_turn_message({"structured": {"thought": "done", "final_answer": "Claymation."}, "text": "", "usage": usage})
    assert final.tool_calls == [] and final.content == "Claymation."


def test_transcript_includes_calls_and_results():
    call = {"name": "lookup", "args": {"term": "clay"}, "id": "call_1"}
    system, prompt = _split_messages([
        SystemMessage("sys"), HumanMessage("q"), AIMessage("thinking", tool_calls=[call]),
        ToolMessage("boom", tool_call_id="call_1", name="lookup", status="error"),
    ])
    assert system == "sys"
    assert 'called tool `lookup` (call id call_1) with arguments {"term": "clay"}' in prompt
    assert "Tool result for call id call_1 (`lookup`, FAILED):\nboom" in prompt


def test_single_human_message_is_sent_verbatim():
    assert _split_messages([SystemMessage("s"), HumanMessage("just this")]) == ("s", "just this")


def test_bind_tools_end_to_end_with_fake_sdk(monkeypatch):
    seen = {}

    async def fake_query(prompt, system_prompt, model, schema, max_turns, images=None):
        seen.update(prompt=prompt, system=system_prompt, schema=schema, max_turns=max_turns)
        return {"text": "", "usage": {}, "structured": {"thought": "t", "tool_calls": [{"name": "lookup", "args": {"term": "x"}}]}}

    monkeypatch.setattr(llm, "_run_query", fake_query)
    out = ClaudeCodeChatModel().bind_tools([lookup]).invoke([SystemMessage("be brief"), HumanMessage("hi")])
    assert out.tool_calls[0]["args"] == {"term": "x"}
    assert seen["system"].startswith("be brief") and "### lookup" in seen["system"]
    assert seen["max_turns"] >= 2                     # headroom for Claude Code's structured-output turn
    assert seen["schema"]["properties"]["tool_calls"]["items"]["anyOf"][0]["properties"]["name"]["const"] == "lookup"


def test_images_travel_as_blocks_and_stay_out_of_the_text(monkeypatch):
    seen = {}

    async def fake_query(prompt, system_prompt, model, schema, max_turns, images=None):
        seen.update(prompt=prompt, images=images)
        return {"text": "", "usage": {}, "structured": {"description": "a test card"}}

    monkeypatch.setattr(llm, "_run_query", fake_query)
    from pydantic import BaseModel

    class Desc(BaseModel):
        description: str

    msg = HumanMessage(content=[{"type": "image_url", "image_url": {"url": "data:image/png;base64,QUJD"}},
                                {"type": "text", "text": "Describe it."}])
    out = ClaudeCodeChatModel().with_structured_output(Desc).invoke([SystemMessage("s"), msg])
    assert out.description == "a test card"
    assert seen["images"] == [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "QUJD"}}]
    assert seen["prompt"] == "Describe it." and "QUJD" not in seen["prompt"]
