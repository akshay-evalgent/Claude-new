# Chat-story recipe

Studied from Beluga, "NEVER Share Your Netflix Password..." (3:05, about 170k views), frame by frame and from its audio.

## What the original does

**Picture**
- Black screen with one message group at a time: a dark-grey band with avatar, name, time and text. When the other person replies, the band is replaced; nothing scrolls.
- Lines are added one by one: 178 visual changes in 185 s, a median of **1.0 s per line** (0.8 s to 1.3 s). Long thoughts are split over several short lines ("but / we sit / next to each other / in class").
- The camera is zoomed in so a one-line message fills a third of the screen, and pulls back a little as the group grows. Punchlines zoom in further ("they will", "YESSS").
- The key line is shown again on its own, full-screen ("against the rules", "Did you share your password?").
- An emoji-only reply is shown huge (😐).
- @mentions and @everyone are highlighted.
- The clock in the header moves on a minute every few messages.

**Cutaways (each 1-3 s)**
- A phone notification ("A new device is using your account").
- An inbox flooding with the same alert.
- The member list, zooming into a new member with a coloured role ("Netflix CEO — 1").
- A giant profile picture.
- An incoming-call screen as the cliffhanger.

**Sound**
- No voices.
- A light, bouncy music bed that **cuts hard to about one second of silence** before every turn. A new track starts with each act.
- A soft blip on every new line.

**Story (about 3 minutes)**
1. A mundane ask ("can I use your Netflix?").
2. A refusal, then bargaining ("I let you copy my homework").
3. "It's against the rules", shown as the big line.
4. A famous person is misquoted, joins the chat, and denies it.
5. The friend gives in: "promise you won't share it".
6. The friend shares it with @everyone, and the notifications pile up.
7. An authority figure joins with a pun name and a red role.
8. An interrogation with escalating absurd numbers (147 households, 23 languages, 3,286 movies).
9. A trap question the main character fakes an answer to.
10. "WAIT I CAN EXPLAIN-", then the incoming-call screen.

## Our version

The engine is `chatvid/dm/`; see the README section "Chat stories". The first episode is `episodes/dm-tesla.json`.

### Recurring cast (original characters)

| Character | Avatar | Role in every story |
|---|---|---|
| **Glitch** | 🤖 on teal | The main character. Smug, lazy and paranoid ("he knows. he always knows"). Owns the thing everyone wants and refuses, then caves. Always ends up in trouble with an authority figure, and always types "WAIT I CAN EXPLAIN-". |
| **nugget** | 🐹 on orange | The needy best friend. Always asks for a favour and reminds Glitch of past favours with numbers ("for 4 years"). Breaks every promise with @everyone. **Runs the quote gag:** misquotes a famous person, who joins the chat to deny it. |

### Guest stars (real public figures, as parody)

- Each one gets a coloured name and a role headline in the member list ("CEO OF EVERYTHING — 1").
- They speak in their public persona: Trump "Many people are saying…", Elon "rapid unscheduled disassemblies".
- Next guests that fit the format: Zuckerberg (he knows everything), Bezos (your package), Gordon Ramsay (your cooking), Taylor Swift (your ex), MrBeast (your challenge).

### Rules for real people

- A PARODY label is on screen whenever a real person appears.
- Jokes come only from their public record and persona: no crimes, health, family or politics, and no invented quotes presented as real.
- No voices.
- Photos are public domain or CC (credited in the description).
- The description says it is parody and not affiliated with them.

### Writing checklist

- About 140 lines over about 2.5-3 minutes, mostly 1-5 words per line.
- A cut to silence before every turn, and a new music track per act.
- One callback per act (Minecraft date → song trap → horn).
- The numbers escalate in threes.
- End on "WAIT I CAN EXPLAIN-" and a call, never on a resolution.
