"""Safety net for the whole suite: no test may call the real model.

Every node takes its model chain as an argument so tests can inject fakes. If a test forgets one,
this makes the mistake fail fast with a clear message instead of hanging on, and paying for, a
real Claude call.
"""
import pytest


@pytest.fixture(autouse=True)
def no_real_model_calls(monkeypatch):
    async def refuse(*args, **kwargs):
        raise RuntimeError("A test tried to call the real model. Inject a fake chain instead.")

    monkeypatch.setattr("animation_agent.llm._run_query", refuse)
