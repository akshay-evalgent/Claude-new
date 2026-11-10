"""Frames and vision: frame choice, real ffmpeg on a generated clip, the look node. No network."""
import shutil
import subprocess

import pytest
from langchain_core.runnables import RunnableLambda

from animation_agent.nodes.analyst import NO_FRAMES_LINE, WITH_FRAMES_LINE
from animation_agent.nodes.look import format_notes, make_look
from animation_agent.nodes.triage import route_after_triage
from animation_agent.schemas import FrameNote, VisualNotes
from animation_agent.tools.video import Frame, aspect_label, choose_times, extract_frames, probe, scene_changes

from fakes import cand

NOTES = VisualNotes(frames=[FrameNote(index=1, description="a clay cat on a blue table"),
                            FrameNote(index=2, description="close-up of the cat's face, paper grain visible")],
                    hook="the cat stares at the camera", style=["clay, soft key light"], techniques=["paper grain (frame 2)"],
                    caveats="no motion or sound in stills")


def test_frame_choice_starts_with_the_hook_and_spreads_out():
    times = choose_times(60.0, scenes=[0.2, 5.0, 5.5, 20.0, 40.0, 59.9], max_frames=6)
    assert times[0] == 0.5 and len(times) == 6 and times == sorted(times)
    assert all(b - a >= 1.0 for a, b in zip(times, times[1:]))
    assert choose_times(0.0, []) == [0.0] and len(choose_times(3.0, [], max_frames=6)) <= 6


def test_aspect_and_notes_formatting():
    assert aspect_label(1080, 1920) == "vertical, 1080x1920" and aspect_label(0, 0) == "unknown aspect ratio"
    text = format_notes(NOTES, [Frame(path=None, t=0.5), Frame(path=None, t=12.3)], (1080, 1920))
    assert "vertical, 1080x1920" in text and "- frame 2 at 12.3s: close-up" in text and "paper grain (frame 2)" in text


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg not installed")
def test_real_ffmpeg_finds_the_scene_change_and_extracts_frames(tmp_path):
    clip = tmp_path / "clip.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=320x180:d=2:r=10",
                    "-f", "lavfi", "-i", "color=c=blue:s=320x180:d=2:r=10", "-filter_complex", "[0][1]concat=n=2:v=1",
                    str(clip)], check=True)
    duration, w, h = probe(clip)
    assert round(duration) == 4 and (w, h) == (320, 180)
    assert any(1.8 <= t <= 2.2 for t in scene_changes(clip))
    frames = extract_frames(clip, choose_times(duration, scene_changes(clip), max_frames=3), tmp_path)
    assert len(frames) == 3 and all(f.path.exists() and f.path.stat().st_size > 0 for f in frames)


def test_look_adds_visual_notes_to_the_source():
    seen = {}

    def sampler(url, work_dir):
        seen["url"] = url
        return [Frame(path=None, t=0.5), Frame(path=None, t=8.0)], (720, 1280)

    look = make_look(chain=RunnableLambda(lambda inp: NOTES), sampler=sampler)
    source = f'Video: "x"\n{NO_FRAMES_LINE}'
    out = look({"candidate": cand("a", 1, 1), "visual": True, "source": source})
    assert seen["url"] == "https://www.youtube.com/watch?v=a"
    assert WITH_FRAMES_LINE in out["source"] and NO_FRAMES_LINE not in out["source"]
    assert "- frame 1 at 0.5s: a clay cat on a blue table" in out["source"] and "vertical, 720x1280" in out["source"]


def test_look_skips_unflagged_candidates_and_survives_failed_downloads():
    def blocked(url, work_dir):
        raise RuntimeError("Sign in to confirm you're not a bot")

    look = make_look(chain=RunnableLambda(lambda inp: NOTES), sampler=blocked)
    assert look({"candidate": cand("a", 1, 1), "visual": False, "source": "s"}) == {}
    out = look({"candidate": cand("a", 1, 1), "visual": True, "source": "s"})
    assert "source" not in out and "not a bot" in out["errors"][0]


def test_only_the_top_picks_get_frames():
    picks = [cand(v, 1, 1) for v in "abcd"]
    sends = route_after_triage({"selected": picks, "frames_per_run": 2})
    assert [s.arg["visual"] for s in sends] == [True, True, False, False]
    assert all(not s.arg["visual"] for s in route_after_triage({"selected": picks, "frames_per_run": 0}))
