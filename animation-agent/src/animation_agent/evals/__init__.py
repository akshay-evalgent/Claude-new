"""Evals: measure each step on frozen inputs, so a prompt change is a measurement, not a guess.

- `datasets.py` builds versioned JSONL files under `evals/datasets/` from the knowledge base:
  the exact inputs each step saw, plus labels.
- `runners.py` replays those inputs through today's prompts and scores the outputs: Triage against
  labels, the Analyst with code checks plus an LLM judge, retrieval with recall and MRR.
- `compare.py` checks a run against `evals/baseline.json` and lists regressions.
"""
