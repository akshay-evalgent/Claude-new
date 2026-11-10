"""Deliver digests: to a file (always), by email, and to Notion (Milestone 10).

Channels are chosen in `.env` with DELIVER_TO, a comma-separated list such as `file,email,notion`.
Each channel reports success or failure separately; a failed email never loses the digest, which
is always written to a file first. The same channels send a short notice when a scheduled run is
waiting for your review.

- email : any SMTP server. Gmail works with an app password (smtp.gmail.com, port 587).
- notion: an internal integration token and the id of a page shared with that integration. Each
          digest becomes a child page.
"""
from __future__ import annotations

import re
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Any

import httpx

from .config import settings

NOTION_VERSION = "2022-06-28"
NOTION_API = "https://api.notion.com/v1"
NOTION_TEXT_LIMIT = 2000
NOTION_BATCH = 100


@dataclass
class Delivery:
    channel: str
    ok: bool
    detail: str


def channels() -> list[str]:
    return [c.strip() for c in settings.deliver_to.split(",") if c.strip()]


def missing_config(channel: str) -> list[str]:
    """Which .env settings a channel still needs. Empty means ready."""
    need = {"email": ["smtp_host", "smtp_user", "smtp_password", "email_to"],
            "notion": ["notion_token", "notion_parent_page_id"], "file": []}.get(channel)
    if need is None:
        return [f"unknown channel {channel!r}"]
    return [name.upper() for name in need if not getattr(settings, name)]


# ---- email ----------------------------------------------------------------------------------

def send_email(subject: str, body: str, smtp_factory: Any = smtplib.SMTP) -> str:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.email_from or settings.smtp_user
    msg["To"] = settings.email_to
    msg.set_content(body)
    with smtp_factory(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        if settings.smtp_starttls:
            smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)
    return f"sent to {settings.email_to}"


# ---- notion ---------------------------------------------------------------------------------

_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")


def rich_text(text: str) -> list[dict]:
    """Markdown links become Notion links; everything else is plain text, chunked to Notion's limit."""
    parts, pos = [], 0
    for m in _LINK.finditer(text):
        if m.start() > pos:
            parts.append((text[pos:m.start()], None))
        parts.append((m.group(1), m.group(2)))
        pos = m.end()
    if pos < len(text):
        parts.append((text[pos:], None))
    out = []
    for content, url in parts:
        content = content.replace("**", "")
        for i in range(0, len(content), NOTION_TEXT_LIMIT):
            item: dict = {"type": "text", "text": {"content": content[i:i + NOTION_TEXT_LIMIT]}}
            if url:
                item["text"]["link"] = {"url": url}
            out.append(item)
    return out


def markdown_to_blocks(markdown: str) -> list[dict]:
    """Enough Markdown for our digests: headings, bullets, paragraphs, links. The first H1 is the title."""
    blocks = []
    for line in markdown.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("# "):
            continue
        if stripped.startswith("### "):
            kind, text = "heading_3", stripped[4:]
        elif stripped.startswith("## "):
            kind, text = "heading_2", stripped[3:]
        elif stripped.startswith("- "):
            kind, text = "bulleted_list_item", stripped[2:]
        else:
            kind, text = "paragraph", stripped.strip("_") if stripped.startswith("_") and stripped.endswith("_") else stripped
        blocks.append({"object": "block", "type": kind, kind: {"rich_text": rich_text(text)}})
    return blocks


def digest_title(markdown: str) -> str:
    for line in markdown.splitlines():
        if line.startswith("# "):
            return line[2:].strip()[:200]
    return "Animation digest"


def send_notion(title: str, markdown: str, client: httpx.Client | None = None) -> str:
    headers = {"Authorization": f"Bearer {settings.notion_token}", "Notion-Version": NOTION_VERSION}
    blocks = markdown_to_blocks(markdown)
    with (client or httpx.Client(base_url=NOTION_API, headers=headers, timeout=30)) as http:
        page = http.post("/pages", json={
            "parent": {"page_id": settings.notion_parent_page_id},
            "properties": {"title": {"title": [{"type": "text", "text": {"content": title}}]}},
            "children": blocks[:NOTION_BATCH],
        })
        page.raise_for_status()
        page_id = page.json()["id"]
        for start in range(NOTION_BATCH, len(blocks), NOTION_BATCH):        # Notion takes 100 blocks per call
            http.patch(f"/blocks/{page_id}/children", json={"children": blocks[start:start + NOTION_BATCH]}).raise_for_status()
        return page.json().get("url", page_id)


# ---- the two things the agent sends ---------------------------------------------------------

def deliver_digest(markdown: str, path: str | None, *, email=send_email, notion=send_notion) -> list[Delivery]:
    results = []
    for ch in channels():
        if ch == "file":
            results.append(Delivery("file", bool(path), path or "no file written"))
            continue
        missing = missing_config(ch)
        if missing:
            results.append(Delivery(ch, False, f"not configured: set {', '.join(missing)} in .env"))
            continue
        try:
            title = digest_title(markdown)
            detail = email(f"Animation digest: {title}", markdown) if ch == "email" else notion(title, markdown)
            results.append(Delivery(ch, True, detail))
        except Exception as exc:
            results.append(Delivery(ch, False, f"{type(exc).__name__}: {str(exc)[:200]}"))
    return results


def notify_review(run_id: str, markdown: str, *, email=send_email) -> list[Delivery]:
    """Tell the reviewer a digest is waiting. Email only: a draft does not belong in Notion yet."""
    if "email" not in channels() or missing_config("email"):
        return []
    body = (f"A digest is waiting for your review (run {run_id}).\n\n"
            f"Approve:  uv run anim review {run_id} --approve\n"
            f"Revise:   uv run anim review {run_id} --feedback \"...\"\n"
            f"Reject:   uv run anim review {run_id} --reject\n"
            f"Or open it interactively: uv run anim review {run_id}\n\n---\n\n{markdown}")
    try:
        return [Delivery("email", True, email(f"Review needed: {digest_title(markdown)}", body))]
    except Exception as exc:
        return [Delivery("email", False, f"{type(exc).__name__}: {str(exc)[:200]}")]
