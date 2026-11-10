"""Graph nodes. Each module exposes a `make_<node>()` or `build_<subgraph>()` factory.

Lesson: a node is just `state -> partial update`. Factories let tests inject fakes (search,
model, database) without monkeypatching, and let the graph builder swap one node for another.
"""
from .card_pipeline import build_card_graph
from .human_review import human_review
from .librarian import make_librarian
from .publish import make_publish
from .reporter import make_reporter, route_after_synthesis
from .scout import make_scout
from .synthesizer import make_synthesizer
from .triage import make_triage, route_after_triage

__all__ = ["build_card_graph", "human_review", "make_librarian", "make_publish", "make_reporter",
           "make_scout", "make_synthesizer", "make_triage", "route_after_synthesis", "route_after_triage"]
