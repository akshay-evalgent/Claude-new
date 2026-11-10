"""Graph nodes. Each module exposes a `make_<node>()` or `build_<subgraph>()` factory.

Lesson: a node is just `state -> partial update`. Factories let tests inject fakes (search,
model, database) without monkeypatching, and let the graph builder swap one node for another.
"""
from .card_pipeline import build_card_graph
from .librarian import make_librarian
from .scout import make_scout
from .triage import make_triage, route_after_triage

__all__ = ["build_card_graph", "make_librarian", "make_scout", "make_triage", "route_after_triage"]
