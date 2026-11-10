"""Run the agent on a schedule with cron, on your own machine (Milestone 10).

Hosted LangGraph deployment is not on the free LangSmith plan, and YouTube blocks datacenter IPs,
so the free, reliable place to run the pipeline is a computer you own. Cron starts
`anim run --unattended`, which never prompts: if a digest needs review it writes a PENDING file,
emails a notice if email is configured, and waits for `anim review`.

The cron line carries your current PATH, because cron's own PATH usually cannot find uv, node,
ffmpeg or the claude CLI.
"""
from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Callable

from .config import ROOT

MARKER = "# animation-agent"
DAYS = {"sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6}


def cron_line(every: str = "week", day: str = "mon", at: str = "08:00", extra_args: str = "",
              project_dir: Path = ROOT, uv: str | None = None, path_env: str | None = None) -> str:
    if every not in ("day", "week"):
        raise ValueError("every must be 'day' or 'week'")
    if every == "week" and day not in DAYS:
        raise ValueError(f"day must be one of {', '.join(DAYS)}")
    hour, minute = (int(x) for x in at.split(":"))
    if not (0 <= hour < 24 and 0 <= minute < 60):
        raise ValueError("time must be HH:MM, 24-hour")
    uv = uv or shutil.which("uv") or "uv"
    path_env = path_env if path_env is not None else os.environ.get("PATH", "")
    if "%" in path_env + extra_args:
        raise ValueError("cron treats % as a newline; remove it from PATH or the arguments")
    log = project_dir / "data" / "logs" / "scheduled.log"
    command = (f'cd "{project_dir}" && mkdir -p data/logs && PATH="{path_env}" "{uv}" run anim run --unattended'
               f'{" " + extra_args if extra_args else ""} >> "{log}" 2>&1')
    dow = "*" if every == "day" else DAYS[day]
    return f"{minute} {hour} * * {dow} {command} {MARKER}"


def read_crontab(run: Callable = subprocess.run) -> str:
    try:
        proc = run(["crontab", "-l"], capture_output=True, text=True)
    except FileNotFoundError:                                   # no cron on this machine
        return ""
    return proc.stdout if proc.returncode == 0 else ""          # no crontab yet is not an error


def install(line: str, run: Callable = subprocess.run) -> None:
    """Replace any earlier animation-agent line, keep everything else."""
    kept = [l for l in read_crontab(run).splitlines() if MARKER not in l and l.strip()]
    run(["crontab", "-"], input="\n".join(kept + [line]) + "\n", text=True, check=True)


def remove(run: Callable = subprocess.run) -> bool:
    current = read_crontab(run).splitlines()
    kept = [l for l in current if MARKER not in l]
    if len(kept) == len(current):
        return False
    run(["crontab", "-"], input="\n".join(kept) + ("\n" if kept else ""), text=True, check=True)
    return True


def installed(run: Callable = subprocess.run) -> str | None:
    return next((l for l in read_crontab(run).splitlines() if MARKER in l), None)
