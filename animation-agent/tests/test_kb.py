"""Knowledge base and Q&A: filtered retrieval, relaxation, citation checks. No network, no model."""
import hashlib
import math

from chromadb.api.types import EmbeddingFunction
from langchain_core.runnables import RunnableLambda

from animation_agent.kb import KnowledgeBase, card_document, card_metadata
from animation_agent.qa_graph import build_qa_graph, build_where, check_citations, index_all, retrieve_cards
from animation_agent.schemas import CitedAnswer, QueryPlan
from animation_agent.storage import CardStore

from fakes import card


class WordHashEmbedding(EmbeddingFunction):
    """Deterministic bag-of-words vectors: texts that share words come out similar."""

    def __init__(self) -> None:
        pass

    def __call__(self, input):
        vectors = []
        for text in input:
            v = [0.0] * 64
            for word in text.lower().replace(",", " ").replace(".", " ").split():
                v[int(hashlib.md5(word.encode()).hexdigest(), 16) % 64] += 1.0
            norm = math.sqrt(sum(x * x for x in v)) or 1.0
            vectors.append([x / norm for x in v])
        return vectors

    @staticmethod
    def name() -> str:
        return "word-hash-test"

    def get_config(self) -> dict:
        return {}

    @staticmethod
    def build_from_config(config: dict) -> "WordHashEmbedding":
        return WordHashEmbedding()


CARDS = [
    ("youtube:clay", "Clay cat loop", "stop_motion", 2, ["Dragonframe"], "clay stop motion loop with a cat", True),
    ("youtube:puppet", "Puppet armature build", "stop_motion", 5, [], "stop motion puppet armature and fabrication", True),
    ("youtube:type", "Kinetic type lyric video", "motion_graphics", 2, ["After Effects"], "kinetic typography lyric video", True),
    ("youtube:weak", "Clay village story", "stop_motion", 2, [], "clay stop motion village story", False),
]


def setup(tmp_path):
    kb = KnowledgeBase(tmp_path / "chroma", embedding_function=WordHashEmbedding())
    db = CardStore(tmp_path / "anim.db")
    for cid, title, style, diff, tools, summary, approved in CARDS:
        c = card().model_copy(update={"id": cid, "title": title, "style_family": style, "difficulty": diff,
                                      "tools": tools, "summary": summary, "source_urls": [f"https://y/{cid}"]})
        db.upsert_card(c, "r1")
        kb.upsert(c, approved)
    return kb, db


def ids(hits):
    return [h.card_id for h in hits]


def test_document_and_metadata_are_built_from_the_card():
    c = card().model_copy(update={"id": "youtube:a", "tools": ["Blender"], "summary": "toon shaded short"})
    meta = card_metadata(c, approved=None)
    assert meta["reviewed"] is False and meta["approved"] is False and meta["tools"] == "blender"
    assert "toon shaded short" in card_document(c) and "Blender" in card_document(c)


def test_where_clause_combines_filters():
    plan = QueryPlan(search_text="x", style_families=["3d"], max_difficulty=3)
    assert build_where(plan) == {"$and": [{"approved": True}, {"style_family": {"$in": ["3d"]}}, {"difficulty": {"$lte": 3}}]}
    assert build_where(QueryPlan(search_text="x", include_unapproved=True)) is None


def test_filters_are_exact_and_unapproved_cards_are_excluded(tmp_path):
    kb, _ = setup(tmp_path)
    hits, relaxed = retrieve_cards(kb, QueryPlan(search_text="clay stop motion", style_families=["stop_motion"]), k=5)
    assert set(ids(hits)) == {"youtube:clay", "youtube:puppet"} and relaxed == []      # weak card is not approved
    easy, _ = retrieve_cards(kb, QueryPlan(search_text="stop motion", max_difficulty=2, include_unapproved=True), k=5)
    assert "youtube:puppet" not in ids(easy)


def test_tools_are_matched_in_code(tmp_path):
    kb, _ = setup(tmp_path)
    hits, relaxed = retrieve_cards(kb, QueryPlan(search_text="animation", tools=["after effects", "Dragonframe"]), k=5)
    assert set(ids(hits)) == {"youtube:type", "youtube:clay"} and relaxed == []


def test_filters_relax_in_order_when_too_few_cards_match(tmp_path):
    kb, _ = setup(tmp_path)
    hits, relaxed = retrieve_cards(kb, QueryPlan(search_text="clay", style_families=["3d"]), k=3)
    assert relaxed == ["style"] and len(hits) >= 2


def test_citation_check_removes_invented_numbers():
    text, used, invalid = check_citations("Try a loop [1]. Use a cat [3][9].", n_cards=3)
    assert used == [1, 3] and invalid == [9] and "[9]" not in text and "[3]" in text


def test_qa_graph_answers_with_checked_citations(tmp_path):
    kb, db = setup(tmp_path)
    planner = RunnableLambda(lambda inp: QueryPlan(search_text="clay stop motion loop"))
    seen = {}

    def answer(inp):
        seen.update(inp)
        return CitedAnswer(answer="Loop on a splash frame [1]. Also see [7].", insufficient=False)

    out = build_qa_graph(kb, db, planner=planner, answerer=RunnableLambda(answer)).invoke({"question": "clay loops?"})
    assert out["citations"][0]["card_id"] == ids(out["hits"])[0]
    assert "[7]" not in out["answer"] and any("[7]" in w for w in out["warnings"])
    assert "[1] " in seen["cards"] and "All requested filters were applied" in seen["note"]


def test_uncited_answer_is_flagged_and_empty_kb_skips_the_model(tmp_path):
    kb, db = setup(tmp_path)
    planner = RunnableLambda(lambda inp: QueryPlan(search_text="clay"))
    out = build_qa_graph(kb, db, planner=planner,
                         answerer=RunnableLambda(lambda inp: CitedAnswer(answer="Clay is fun.", insufficient=False))
                         ).invoke({"question": "q"})
    assert "cites no cards" in out["warnings"][0]

    empty = KnowledgeBase(tmp_path / "empty", embedding_function=WordHashEmbedding())
    never = RunnableLambda(lambda inp: (_ for _ in ()).throw(AssertionError("no model call without cards")))
    out = build_qa_graph(empty, db, planner=planner, answerer=never).invoke({"question": "q"})
    assert out["hits"] == [] and "answer" not in out


def test_index_all_copies_anim_db_into_the_index(tmp_path):
    _, db = setup(tmp_path)
    fresh = KnowledgeBase(tmp_path / "fresh", embedding_function=WordHashEmbedding())
    assert index_all(fresh, db) == 4 and fresh.count() == 4
    assert index_all(fresh, db, rebuild=True) == 4 and fresh.count() == 4


def test_librarian_indexes_new_cards(tmp_path):
    from animation_agent.nodes import make_librarian
    from animation_agent.schemas import Review

    kb = KnowledgeBase(tmp_path / "chroma", embedding_function=WordHashEmbedding())
    c = card().model_copy(update={"id": "youtube:new"})
    out = make_librarian(db_path=tmp_path / "anim.db", kb=lambda: kb)(
        {"run_id": "r1", "cards": [c], "reviews": [Review(card_id="youtube:new", rounds=1, approved=True)]})
    assert out["errors"] == [] and kb.count() == 1
    assert kb.search("loop", {"approved": True})[0].card_id == "youtube:new"
