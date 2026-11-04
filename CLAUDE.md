# Repo notes for Claude

- **YouTube Shorts / vertical video work:** use the `shorts-playbook` skill (`.claude/skills/shorts-playbook/`). That covers planning, scripting, editing, re-cutting, reviewing and logging results. It holds what we learned (the virality model and real editing lessons) plus `audit.py` and `recut.py`.
- Source videos go in `film/input/` (gitignored). Renders go in `film/<project>/out/` (gitignored; send them with SendUserFile). Commit the spec (`recut.json`), the `NOTES.md` and the before/after images.
- After a Short is posted, add its Studio numbers to `shorts-virality/results.csv`, so the model gets calibrated on this channel's real data.
- The maths, simulator and charts are in `shorts-virality/` (README, FORMATS, LEVERS, model.py). Its constants are illustrative, so don't quote them as YouTube facts.
