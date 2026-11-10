# Lesson 5 — Human in the loop: review the digest before it is published

What shipped: after the Librarian, a Reporter drafts a digest of the run's approved cards, and the
run then **pauses** until a person approves it, edits it, asks for a revision, or rejects it. The
pause is durable: close the terminal and review it tomorrow with `anim review <run id>`. Only an
approved or edited digest is published, to `data/digests/<date>-<run id>.md`. 62 tests pass.

```text
... -> librarian --(no approved cards)--> END
           |
           v
       reporter -> human_review --approve / edit / reject--> publish -> END
          ^              |
          +---revise-----+          human_review pauses the run with interrupt()
```

## The three ideas in this milestone

### 1. `interrupt()`: a pause that survives the process (`nodes/human_review.py`)

```python
def human_review(state):
    raw = interrupt({"digest": state["digest"], "round": ..., "actions": ...})
    answer = ReviewAnswer.model_validate(raw)
    ...
```

`interrupt(payload)` stops the graph, saves the state in the checkpoint, and hands `payload` to
whoever ran it. In the stream it arrives as an `__interrupt__` update; afterwards it is on
`graph.get_state(config).interrupts`. Nothing waits in memory. To continue, run the same thread
with the human's answer:

```python
graph.invoke(Command(resume={"action": "approve"}), config)
```

Then the node runs **again from its first line**, and this time `interrupt()` returns the answer.
That one fact shapes everything else:

- **Keep work out of the node that pauses.** Drafting is an Opus call, so it lives in the Reporter,
  a separate node before the pause. `test_approve_tomorrow_from_a_fresh_process_publishes_once`
  checks that approving does not pay for the draft again.
- **Validate the answer like any input.** `ReviewAnswer` is a Pydantic model: an "edit" must carry
  text, a "revise" must carry feedback. A bad answer does not crash the run: the node routes back
  to itself and pauses again, with a note saying what was wrong.
- **Interrupts need a checkpointer.** A paused run is just a checkpoint that is waiting.
  Milestone 4 is what makes this milestone possible.

The live run used all of this across separate processes. `anim run` paused after the draft and
exited. `anim review <id> --feedback "..."` resumed it, the Reporter redrafted, and it paused again
and exited. `anim review <id> --approve` resumed it once more and published.

### 2. The Command pattern

A node can return a `Command` instead of a plain update:

```python
return Command(goto="publish", update={"digest_status": "approved"})
return Command(goto="reporter", update={"digest_feedback": answer.feedback})
return Command(goto="human_review", update={"review_note": "That answer was not accepted: ..."})
```

`update` changes the state and `goto` picks the next node, in one return value. Compare the
conditional edges from Lesson 3, where a separate router function reads the state afterwards.
Use a conditional edge when the decision can be read from the state. Use `Command` when the
decision is made inside the node from something you would otherwise have to stash in the state
just so a router could read it, like the human's answer here. Because the routes now live in
code rather than in edges, `add_node(..., destinations=(...))` tells LangGraph where the node can
go, so Studio can still draw the arrows.

`Command` has a second job: `Command(resume=...)` is how an answer gets into a paused run.

### 3. Where humans belong in a loop

A human could be placed at many points in this graph. Most of them are wrong:

| Where | Verdict |
|---|---|
| Approve every card | No. Several per run, and the Critic already does this job. A human here becomes a bottleneck and starts rubber-stamping. |
| Approve Triage's picks | Possible later as a cost gate, but a wrong pick only costs cents. |
| Approve the digest before publishing | Yes. Once per run, and it guards the only outward-facing step, the one that cannot be taken back. |

The rule: **put the human in front of the irreversible, outward-facing action, and nowhere
else.** Then give them real choices, not just yes or no: approve, edit it yourself, send it back
with instructions, or reject. Cap the redrafts (three here) so a review cannot loop forever. And
let them answer later: unattended runs, like the scheduled ones in Milestone 10, simply pause and
wait. When the shell is not interactive, `anim run` prints how to review and exits.

LangGraph also has static breakpoints: `compile(interrupt_before=["publish"])` pauses before a
node with no code change. They are handy for debugging, but they cannot show the reviewer a
payload or check the answer, so a real approval step uses `interrupt()`.

## The digest itself (`nodes/reporter.py`)

The same split as the Analyst. The model writes a `DigestDraft`: headline, intro, one takeaway
per card, open questions. `render_digest()` builds the Markdown and takes every title, link, score
and number from the cards. The model's order is kept, a card it forgot is still included, and a
card id it invented is dropped.

Only cards the Critic approved are featured; the rest are listed under "Held back" with the
Critic's main objection. PLAN.md said cards under 0.5 confidence stay out of digests. Approved
cards built from metadata alone honestly sit between 0.3 and 0.5, so the digest uses the Critic's
verdict as the gate, and shows each card's confidence next to it.

## A bug the tests caught

The interactive "edit" option called `typer.edit()`, which does not exist: the editor helper
belongs to Click, the library Typer is built on. Choosing "edit" would have crashed the review. The
test that drives the prompt with fake keystrokes found it before any person did.

## Run it yourself

```bash
cd animation-agent
uv sync --extra dev
uv run pytest -q
uv run anim run --cards 2          # ends at a review prompt: [a]pprove, [e]dit, [r]evise, re[j]ect, [l]ater
uv run anim runs                   # a paused run shows "waiting for review"
uv run anim review <run id>        # interactive again
uv run anim review <run id> --feedback "Two-sentence intro, please."
uv run anim review <run id> --approve
uv run anim digests
uv run anim run --no-digest        # stop at the Librarian: no digest, no pause
```

In Studio (`uv run --with "langgraph-cli[inmem]" langgraph dev`), a paused run should show the
interrupt payload, and you resume it by sending a JSON answer such as
`{"action": "revise", "feedback": "Shorter headline"}` or `{"action": "approve"}`. The dev server
was checked here to load the graph with the review step and its routes; the Studio screens were
not tried in a browser.

## What the live run showed

Triage picked two 2D shorts with very large audiences. Both cards were approved by the Critic,
one after two drafts and one after three. The run cost about $0.80 up to the pause; the requested
revision was one more Opus call. The draft was candid: it said both pieces might be AI-assisted
and that the visuals were never verified, so their lessons are about story and release timing,
not technique. The feedback "make the headline about what motion designers can learn" turned
"Family nostalgia and festival devotion drive two big 2D hits" into "Story structure and festival
timing, not visible craft, drove reach", and the intro shrank to two sentences as asked.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| `interrupt()` and `Command(resume=...)` | `human_review.py`, `cli.py` | approvals, clarifying questions, tool-call confirmation |
| Nodes rerun from the top on resume | Reporter before human_review | keeping side effects out of paused nodes |
| Validating human input | `ReviewAnswer` | any answer that re-enters a graph |
| `Command(goto=..., update=...)` and `destinations` | `human_review.py`, `graph.py` | routing decided inside a node |
| Placing humans at irreversible steps | this lesson | every agent that acts in the world |
| Durable, asynchronous review | `anim review` | unattended and scheduled agents |

Next: **Milestone 6** turns the cards into a knowledge base you can question: embeddings in Chroma,
retrieval that combines vectors with structured filters, and `anim ask` with citations.
