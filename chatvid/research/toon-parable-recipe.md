# Cartoon parables: recipe

Studied from "AI understood the assignment a little too well 💀" (Explainer Agnihotri, 11 s, wPxCjZueJag) and the same channel's 6.2M-view "The education system today right now ☠️😂" (hrw4ZjORQyA).

## The reference, beat by beat (11 s, no voice)
1. **0-2.5 s:** a painter paints **one** fence picket black, hands the brush to "AI" (a plain figure whose round head says AI), points ("like this") and leaves.
2. **3-6 s:** AI copies exactly what it saw and continues the "pattern": black, gap, black, gap.
3. **6-9 s:** the painter comes back. Bubbles: "AI SLOP!", then "STUPID AI!".
4. **9.5 s, the twist:** the "AI" lifts off its head; it was a human in an AI mask.
5. **10-11 s:** caption box: "Without clear instructions, even a human won't know what you want."

**The look:** a flat cartoon, warm yellow, thick dark outlines, a 16:9 panel inside a vertical frame on dark grey.
**The sound:** music only, plus a few effects.

The 6.2M hit is live action, but it works the same way: no dialogue, role labels (STUDENT / AI / LECTURER), speech bubbles, and a closed loop (questions → answers → "AI detected" → "humanize this" → …). It replays by design.

## Our formula
- 10-15 s; 3 scenes: **setup → comic twist → one-line lesson** in a caption box.
- **No voices:** at most 3 short speech bubbles, one music bed and 3-6 sound effects.
- A white serif caption above the panel ("POV: …", "When you … 😭"), as on the 6.2M hit.
- The lesson turns the joke on the viewer: lazy instructions, shortcuts, hypocrisy.
- Characters (engine `chatvid/toon/`): `student`, `teacher`, `ai`, with poses idle / point / give / hold / thumb / wave / panic / write / sleep and faces neutral / happy / proud / sad / tired / sleep / wide / panic / angry.
- Props: wall, window (night, or AI pressed against the glass), desk, chair, lamp, clock, stack, balls (crumpled paper), door, sign, board, paper, laptop, stamp, zzz, fly (papers flying).

## Made so far
| File | Story | Lesson |
|---|---|---|
| `episodes/toon-shortcut.json` | AI does all the homework (A+), but the exam-hall door slams on AI; the kid stares at a blank paper, AI pressed to the window: "I can't come in" | AI can do your homework. It can't take your exam. |
| `episodes/toon-aislop.json` | The kid writes the essay himself all night; the teacher yells "AI SLOP!" and stamps AI DETECTED; zoom: the teacher's laptop "check 30 essays → write feedback ✓ done", AI pops up 👍 | Before you call it AI slop, check who's really using AI. |

| `episodes/toon-mom.json` (58 s) | AI does everything, including Mom's birthday card ("You are a valued member of this household"); her smile fades; the kid closes the laptop and writes his own in crayon; a hug, and the card on the fridge | AI can write the perfect words. Only you can mean them. |

## More stories in this format
- **The Yes-Machine:** "is this a good idea?" 👍 "and this?" 👍; he walks off a cliff, and AI follows 👍. *An AI that always agrees isn't helping.*
- **1000 Paintings:** AI makes a mountain of pictures; one human paints one; the crowd walks past the mountain. *When everything is easy to make, care is rare.*
- **The Fastest Builder:** AI builds the bridge in 1 second with a gap; the human takes all day. *Fast and wrong is still wrong.*
- **Calculator 1995 / 2026:** "you won't always have a calculator in your pocket". *Tools change. Thinking doesn't.*
