"""Safety net for the whole suite: no test may call the real model or the network, or send traces.

Every node takes its model chain, search, comments and frame sampler as arguments so tests can
inject fakes. If a test forgets one, these make the mistake fail fast with a clear message instead
of hanging on, and paying for, a real Claude call or a YouTube download.
"""
import os

import pytest

# Tests must not send traces either. A machine with LANGSMITH_TRACING=true in its environment would
# otherwise upload about a hundred fake-graph traces per test run and eat the monthly trace quota.
os.environ["LANGSMITH_TRACING"] = "false"
os.environ["LANGCHAIN_TRACING_V2"] = "false"


@pytest.fixture(autouse=True)
def no_real_model_or_network(monkeypatch):
    async def refuse_model(*args, **kwargs):
        raise RuntimeError("A test tried to call the real model. Inject a fake chain instead.")

    def refuse_network(*args, **kwargs):
        raise RuntimeError("A test tried to reach YouTube or download a video. Inject a fake instead.")

    monkeypatch.setattr("animation_agent.llm._run_query", refuse_model)
    monkeypatch.setattr("animation_agent.tools.youtube._extract", refuse_network)
    monkeypatch.setattr("animation_agent.tools.video.download_clip", refuse_network)
