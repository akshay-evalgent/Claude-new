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
    llm_model: str = "claude-opus-5-5"          # Analyst and Critic: judgement-heavy steps
    llm_model_triage: str = "claude-haiku-5-5"  # Triage: a quick yes/no per video; about 1/40 of Opus's price
    anthropic_api_key: str = ""
    google_api_key: str = ""
    ollama_model: str = "llama3.1"

    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_project: str = "animation-agent"
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_agent_id: str = "animation-agent"
    langsmith_agent_environment: str = "development"

    youtube_api_key: str = ""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    tavily_api_key: str = ""
    github_token: str = ""
    ytdlp_js_runtime: str = "node"
    ytdlp_cookies_from_browser: str = ""   # e.g. "chrome": use your browser's YouTube session for downloads
    frames_per_run: int = 3                 # how many top candidates per run get frames (0 turns it off)

    # Delivery (Milestone 10). DELIVER_TO is a comma-separated list: file, email, notion.
    deliver_to: str = "file"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_starttls: bool = True
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = ""
    email_to: str = ""
    notion_token: str = ""
    notion_parent_page_id: str = ""

    data_dir: Path = ROOT / "data"


settings = Settings()
settings.data_dir.mkdir(exist_ok=True)
