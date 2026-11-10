"""Tools the agent can call. Each is a thin `@tool` wrapper over a plain Python function.

Lesson: write the plain function first, test it without any model, then wrap it. The
wrapper's docstring and type hints become the JSON schema the model reads, so they are
part of the prompt.
"""
from .youtube import youtube_search, youtube_video_stats

ALL_TOOLS = [youtube_search, youtube_video_stats]

__all__ = ["ALL_TOOLS", "youtube_search", "youtube_video_stats"]
