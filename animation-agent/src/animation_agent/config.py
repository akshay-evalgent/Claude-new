"""Settings, loaded once from .env and the environment.

Lesson: keep every knob in one typed object. Nodes never read os.environ directly,
so swapping a provider or a key is a config change, not a code change.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]

# Load .env into the real process environment first. pydantic-settings reads .env for
# *our* Settings object, but libraries like LangSmith read os.environ directly, so
# LANGSMITH_TRACING and LANGSMITH_API_KEY must be exported, not just parsed.
load_dotenv(ROOT / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    llm_provider: Literal["claude-code", "anthropic", "gemini", "ollama"] = "claude-code"
    llm_model: str = "claude-opus-5-5"
    anthropic_api_key: str = ""
    google_api_key: str = ""
    ollama_model: str = "llama3.1"

    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_project: str = "animation-agent"

    youtube_api_key: str = ""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    tavily_api_key: str = ""
    github_token: str = ""
    ytdlp_js_runtime: str = "node"

    data_dir: Path = ROOT / "data"


settings = Settings()
settings.data_dir.mkdir(exist_ok=True)
