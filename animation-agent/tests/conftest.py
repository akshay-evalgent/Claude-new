"""Safety net for the whole suite: no test may call the real model or the real network.

Every node takes its model chain, search, comments and frame sampler as arguments so tests can
inject fakes. If a test forgets one, these make the mistake fail fast with a clear message instead
of hanging on, and paying for, a real Claude call or a YouTube download.
"""
import pytest


@pytest.fixture(autouse=True)
def no_real_model_or_network(monkeypatch):
    async def refuse_model(*args, **kwargs):
        raise RuntimeError("A test tried to call the real model. Inject a fake chain instead.")

    def refuse_network(*args, **kwargs):
        raise RuntimeError("A test tried to reach YouTube or download a video. Inject a fake instead.")

    monkeypatch.setattr("animation_agent.llm._run_query", refuse_model)
    monkeypatch.setattr("animation_agent.tools.youtube._extract", refuse_network)
    monkeypatch.setattr("animation_agent.tools.video.download_clip", refuse_network)
