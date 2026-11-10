"""Milestone 10: delivery, review notices, cron, doctor. Fake SMTP, mocked HTTP, fake crontab."""
import json
import subprocess
from types import SimpleNamespace

import httpx
import pytest

from animation_agent import delivery, schedule
from animation_agent.config import settings
from animation_agent.delivery import (Delivery, deliver_digest, markdown_to_blocks, notify_review, rich_text,
                                      send_email, send_notion)
from animation_agent.doctor import run_checks
from animation_agent.nodes.publish import make_publish
from animation_agent.storage import CardStore

DIGEST = "# Clay is back\n\n_Run r1_\n\nIntro text.\n\n## 1. Clay cat\n\n- Numbers: 3,000 views\n- [watch](https://y/a)\n"


@pytest.fixture
def configured(monkeypatch):
    for k, v in {"deliver_to": "file,email,notion", "smtp_host": "smtp.test", "smtp_user": "me@test",
                 "smtp_password": "pw", "email_to": "you@test", "notion_token": "secret",
                 "notion_parent_page_id": "parent-1"}.items():
        monkeypatch.setattr(settings, k, v)


class FakeSMTP:
    sent = []

    def __init__(self, host, port, timeout):
        self.host, self.port = host, port

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self):
        self.tls = True

    def login(self, user, password):
        self.user = user

    def send_message(self, msg):
        FakeSMTP.sent.append(msg)


def test_email_is_sent_over_starttls(configured):
    FakeSMTP.sent = []
    assert send_email("Subject", "Body", smtp_factory=FakeSMTP) == "sent to you@test"
    msg = FakeSMTP.sent[0]
    assert msg["To"] == "you@test" and msg["From"] == "me@test" and msg.get_content().strip() == "Body"


def test_markdown_becomes_notion_blocks_with_links():
    blocks = markdown_to_blocks(DIGEST)
    kinds = [b["type"] for b in blocks]
    assert kinds == ["paragraph", "paragraph", "heading_2", "bulleted_list_item", "bulleted_list_item"]
    assert blocks[0]["paragraph"]["rich_text"][0]["text"]["content"] == "Run r1"          # italics markers dropped
    link = blocks[-1]["bulleted_list_item"]["rich_text"][0]["text"]
    assert link == {"content": "watch", "link": {"url": "https://y/a"}}
    assert len(rich_text("x" * 4500)) == 3                                                   # 2,000-character chunks


def test_notion_page_is_created_and_long_digests_are_appended_in_batches(configured):
    calls = []

    def handler(request):
        calls.append((request.method, request.url.path, json.loads(request.content)))
        if request.url.path.endswith("/pages"):
            return httpx.Response(200, json={"id": "page-9", "url": "https://notion.so/page-9"})
        return httpx.Response(200, json={})

    client = httpx.Client(base_url="https://api.notion.com/v1", transport=httpx.MockTransport(handler))
    long_digest = "# T\n" + "\n".join(f"- item {i}" for i in range(150))
    assert send_notion("T", long_digest, client=client) == "https://notion.so/page-9"
    assert calls[0][2]["parent"] == {"page_id": "parent-1"} and len(calls[0][2]["children"]) == 100
    assert calls[1][:2] == ("PATCH", "/v1/blocks/page-9/children") and len(calls[1][2]["children"]) == 50


def test_each_channel_succeeds_or_fails_on_its_own(configured, monkeypatch):
    def broken_notion(title, md):
        raise httpx.ConnectError("no route")

    out = deliver_digest(DIGEST, "/tmp/d.md", email=lambda s, b: "sent", notion=broken_notion)
    assert [(d.channel, d.ok) for d in out] == [("file", True), ("email", True), ("notion", False)]
    monkeypatch.setattr(settings, "smtp_host", "")
    out = deliver_digest(DIGEST, "/tmp/d.md", email=lambda s, b: "sent", notion=lambda t, m: "url")
    assert "not configured: set SMTP_HOST" in out[1].detail


def test_review_notice_goes_by_email_only_when_configured(configured, monkeypatch):
    sent = []
    out = notify_review("r1", DIGEST, email=lambda subject, body: sent.append((subject, body)) or "sent")
    assert out[0].ok and "anim review r1 --approve" in sent[0][1] and sent[0][0] == "Review needed: Clay is back"
    monkeypatch.setattr(settings, "deliver_to", "file")
    assert notify_review("r1", DIGEST, email=lambda s, b: "sent") == []


def test_publish_records_deliveries_and_clears_the_pending_file(tmp_path):
    (tmp_path / "PENDING-r1.md").write_text("draft")
    publish = make_publish(out_dir=tmp_path, db_path=tmp_path / "anim.db",
                           deliver=lambda md, path: [Delivery("file", True, path), Delivery("email", False, "smtp down")])
    out = publish({"run_id": "r1", "digest": DIGEST, "digest_status": "approved", "digest_round": 1})
    assert [d["ok"] for d in out["deliveries"]] == [True, False] and not (tmp_path / "PENDING-r1.md").exists()
    import sqlite3
    rows = sqlite3.connect(tmp_path / "anim.db").execute("select channel, ok, detail from deliveries").fetchall()
    assert sorted(rows) == [("email", 0, "smtp down"), ("file", 1, out["digest_path"])]
    rejected = make_publish(out_dir=tmp_path, db_path=tmp_path / "anim.db", deliver=lambda md, p: 1 / 0)(
        {"run_id": "r2", "digest": DIGEST, "digest_status": "rejected"})
    assert rejected == {"digest_path": "", "deliveries": []}                 # nothing delivered on reject


def test_cron_line_is_weekly_or_daily_and_rejects_bad_input(tmp_path):
    line = schedule.cron_line("week", "mon", "07:45", "--cards 5", project_dir=tmp_path, uv="/bin/uv", path_env="/usr/bin")
    assert line.startswith("45 7 * * 1 cd ") and "anim run --unattended --cards 5" in line and line.endswith(schedule.MARKER)
    assert 'PATH="/usr/bin"' in line and "scheduled.log" in line
    assert schedule.cron_line("day", at="23:05", project_dir=tmp_path, uv="uv", path_env="").startswith("5 23 * * * ")
    for bad in [dict(every="month"), dict(day="someday"), dict(at="25:00"), dict(path_env="/a%b")]:
        with pytest.raises(ValueError):
            schedule.cron_line(**{"project_dir": tmp_path, "uv": "uv", "path_env": "", **bad})


def test_install_replaces_only_our_line():
    crontab = {"text": "0 1 * * * backup.sh\n5 5 * * 1 old line # animation-agent\n"}

    def run(cmd, input=None, **kw):
        if cmd == ["crontab", "-l"]:
            return SimpleNamespace(returncode=0, stdout=crontab["text"])
        crontab["text"] = input
        return SimpleNamespace(returncode=0, stdout="")

    schedule.install("1 2 * * 3 new line # animation-agent", run=run)
    assert crontab["text"] == "0 1 * * * backup.sh\n1 2 * * 3 new line # animation-agent\n"
    assert schedule.installed(run=run).startswith("1 2 * * 3")
    assert schedule.remove(run=run) and crontab["text"] == "0 1 * * * backup.sh\n"
    assert schedule.remove(run=run) is False
    assert schedule.read_crontab(run=lambda *a, **k: (_ for _ in ()).throw(FileNotFoundError())) == ""


def test_doctor_flags_what_is_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    monkeypatch.setattr(settings, "llm_provider", "claude-code")
    monkeypatch.setattr(settings, "deliver_to", "file,email")
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr("animation_agent.kb.default_kb", lambda: SimpleNamespace(count=lambda: 0))
    found = {"node"}
    checks = {c.name: c for c in run_checks(which=lambda name: f"/bin/{name}" if name in found else None)}
    assert checks["model access"].status == "fail" and "claude" in checks["model access"].fix
    assert checks["javascript runtime"].status == "ok" and checks["ffmpeg"].status == "warn"
    assert checks["delivery: email"].status == "fail" and "SMTP_HOST" in checks["delivery: email"].detail
    assert checks["knowledge base"].status == "ok"
