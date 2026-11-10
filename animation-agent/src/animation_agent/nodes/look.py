"""Look: give the top candidates eyes. Sample frames, have a vision model describe them, and add
the description to the source material (Milestone 9).

Lesson, multimodal input and when to spend tokens: frames cost a download, some ffmpeg work and an
image-heavy model call, so only the highest-priority picks get them (FRAMES_PER_RUN, default 3).
The vision model never writes the card. It writes `VisualNotes`, which code formats into the
source material, so the Analyst can quote what is on screen and the Critic's word-for-word quote
check covers visual claims too. Code adds the facts: frame times and the aspect ratio.

If the download fails (YouTube blocks cloud IPs), the card is written exactly as before, without
frames, and the reason is recorded.
"""
from __future__ import annotations

import base64
import tempfile
from pathlib import Path
from typing import Callable

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import Runnable, RunnableLambda

from ..llm import get_model
from ..progress import emit
from ..schemas import VisualNotes
from ..state import CardState
from ..tools.video import Frame, aspect_label, sample_frames
from .analyst import NO_FRAMES_LINE, WITH_FRAMES_LINE

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"


def frame_message(frames: list[Frame], title: str) -> list:
    content: list[dict] = []
    for f in frames:
        data = base64.b64encode(f.path.read_bytes()).decode()
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}})
    times = ", ".join(f"frame {i} at {f.t:.1f}s" for i, f in enumerate(frames, 1))
    content.append({"type": "text", "text": f'Video: "{title}". {len(frames)} frames in order: {times}.'})
    return [SystemMessage((PROMPTS / "vision.md").read_text()), HumanMessage(content=content)]


def build_vision_chain() -> Runnable:
    model = get_model("vision").with_structured_output(VisualNotes)
    return (RunnableLambda(lambda inp: frame_message(inp["frames"], inp["title"])) | model).with_config(run_name="vision")


def format_notes(notes: VisualNotes, frames: list[Frame], size: tuple[int, int]) -> str:
    times = {i: f.t for i, f in enumerate(frames, 1)}
    lines = [f"Visual notes from {len(frames)} still frames sampled by code ({aspect_label(*size)}), "
             "described by a vision model, not by the creator:"]
    lines += [f"- frame {n.index} at {times.get(n.index, 0):.1f}s: {n.description}" for n in notes.frames]
    lines.append(f"- hook (first frame): {notes.hook}")
    if notes.style:
        lines.append("- style: " + "; ".join(notes.style))
    if notes.techniques:
        lines.append("- techniques visible: " + "; ".join(notes.techniques))
    lines.append(f"- cannot be seen in stills: {notes.caveats}")
    return "\n".join(lines)


def look_at(url: str, title: str, chain: Runnable, sampler: Callable = sample_frames) -> tuple[str, int]:
    """Frames -> vision model -> formatted notes. Returns (notes text, number of frames)."""
    with tempfile.TemporaryDirectory(prefix="anim-frames-") as tmp:
        frames, size = sampler(url, Path(tmp))
        if not frames:
            raise ValueError("no frames could be extracted")
        notes: VisualNotes = chain.invoke({"frames": frames, "title": title})
        return format_notes(notes, frames, size), len(frames)


def make_look(chain: Runnable | None = None, sampler: Callable = sample_frames) -> Callable[[CardState], dict]:
    built: list[Runnable] = []

    def look(state: CardState) -> dict:
        if not state.get("visual"):
            return {}
        c = state["candidate"]
        if chain is None and not built:
            built.append(build_vision_chain())
        try:
            text, n = look_at(c.url, c.title, chain or built[0], sampler)
        except Exception as exc:                        # frames are a bonus: carry on without them
            return {"errors": [f"look: no frames for {c.video_id} ({type(exc).__name__}: {str(exc)[:160]})"]}
        emit("look", c.title, f"{n} frames described")
        return {"source": state["source"].replace(NO_FRAMES_LINE, WITH_FRAMES_LINE) + "\n" + text}

    return look
