#!/usr/bin/env python3
"""Print the board: every course, every episode, and the gate each one is at.

    python courses/status.py
"""
import json
from pathlib import Path

GATES = ['topic', 'plan', 'hooks', 'moodboard', 'script', 'video', 'package', 'uploaded']
ROOT = Path(__file__).resolve().parent

for course_file in sorted(ROOT.glob('*/course.json')):
    c = json.loads(course_file.read_text())
    print(f"\n{c['title']}  ({course_file.parent.name})  course gates done: {', '.join(c.get('gates_done', [])) or 'none'}")
    for i, ep in enumerate(c.get('episodes', []), 1):
        stage = ep.get('stage', 'plan')
        bar = ''.join('#' if GATES.index(stage) >= GATES.index(g) else '.' for g in GATES[4:])
        print(f"  {i}/{len(c['episodes'])}  [{bar}] {stage:9s} {ep['title']}")
