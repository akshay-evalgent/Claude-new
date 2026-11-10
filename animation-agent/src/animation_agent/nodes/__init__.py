"""Graph nodes. Each module exposes a `make_<node>()` factory that returns the node function.

Lesson: a node is just `state -> partial update`. Factories let tests inject fakes (search,
model, database) without monkeypatching, and let the graph builder swap one node for another.
"""
from .analyst import make_analyst
from .librarian import make_librarian
from .scout import make_scout

__all__ = ["make_analyst", "make_librarian", "make_scout"]
