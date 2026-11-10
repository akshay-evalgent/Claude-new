"""Progress events for `stream_mode="custom"`. Safe to call anywhere.

Inside a graph run, `emit()` sends an event the CLI prints. Outside one, as when a test calls a node
function directly, there is no stream to write to and it does nothing. Progress output must never
be able to break a node.
"""
from __future__ import annotations


def emit(node: str, video: str, text: str) -> None:
    from langgraph.config import get_stream_writer

    try:
        writer = get_stream_writer()
    except RuntimeError:
        return
    writer({"node": node, "video": video, "text": text})
