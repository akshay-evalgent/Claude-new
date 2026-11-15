# "Try this on your laptop": AI for everyday life

**The idea:** short, practical, reproducible AI wins. Each video names a specific tool or repo, gives the exact prompt and shows the real result. **Shorts first** (25–40 seconds), then **long-form** walkthroughs that bundle them.

**Why this series:**
- **People search for it.** Live YouTube autocomplete (Nov 2026): "claude code tutorial", "github repos for claude code", "claude skills", "ai tools for students", "free ai tools", "self hosted ai", "vibe coding for beginners".
- **People save and share it.** A prompt they can screenshot is a natural "Save this". "Send this to your friend who…" works for everyday tasks.
- **It's the safest kind of content for ad revenue.** Real screen recordings, your voice and tested results are original by definition. YouTube's policy only flags tutorials that copy what's already everywhere, so every video shows our own tested result with real numbers.
- **It leads to money naturally.** Long-form walkthroughs, a prompt-pack newsletter, tool affiliates and sponsors (AI apps pay for exactly this kind of content).

*A note on balance: I'm made by Anthropic. Claude is the example tool here, but where it matters each video says what works with ChatGPT, Gemini or a free local model too. That's fairer, and it widens the audience.*

## The Short format (`breakdown.py` + `cards.py`)

The sample is `edits_bd/02_voice_memo_todo.json`. It runs about 28 seconds over 6 beats:

| Beat | What's on screen | Why |
|---|---|---|
| 1. **Result first** (2–4s) | The finished thing: the to-do list, the cleaned photo, the website | The hook. Viewers decide in 1–2 seconds whether it's worth it. |
| 2–3. **Steps** (1–3 of them) | The real screen: a terminal replay of the real run, or your screen recording, with a highlight box on the key spot | Proof that it works, and that it's original footage |
| 4. **The prompt** (3s) | A "copy this" prompt card | **This is what gets saved.** People screenshot it. |
| 5. **Result, revealed** | Items appear one by one | Payoff |
| 6. **Save and alternatives** | "Save this. Works with ChatGPT or Gemini too." | Saves, comments, and wider reach |

**Rules:**
- Show real numbers: "23s of audio in 7s, fully offline".
- Say what it was tested on.
- Never fake a result. Only replay what really ran.
- Never mock up a product's interface. Use real screen recordings or our own neutral cards.

## Long-form (start after about 10 Shorts)

- **Bundle related Shorts:** "10 ways I use AI every day (exact prompts)", "Claude Code for people who can't code", "Private AI on your laptop (no subscription)", "AI for students that isn't cheating".
- **Length and structure:** 8–15 minutes. Chapters, every prompt in the description (long-form links are clickable), troubleshooting, and privacy notes.
- **Connect them:** use YouTube's **related video** link on each Short to send viewers to its long version. Long-form ads pay many times more than Shorts.

## 30 ideas, ready to script

### Everyday life (the biggest audience)

| # | Title idea | Tool | The prompt or command |
|---|---|---|---|
| 1 | Voice Memo to To-Do List, FREE and Offline | faster-whisper + Claude | **Done** (sample) |
| 2 | Photo of Your Fridge, 3 Dinners Tonight | Claude (image upload) | "Here's my fridge. Suggest 3 dinners under 30 minutes using mostly what you see, then list only what I need to buy." |
| 3 | Confusing Letter? Photo It | Claude (image) | "Read this letter. In 3 bullets: what it is, what I must do, and the deadline. Flag anything that looks like a scam." |
| 4 | Where Did My Money Go? | Claude, or **Ollama** for privacy | "Categorise these transactions, total each category, and list my 5 biggest avoidable costs." Remove names and numbers first, or run it locally. |
| 5 | The Trip Planner That Listens | Claude | "Plan 3 days in [city] for 2 adults, budget [X], no early mornings, at most 2 museums. Output a table with walking times." |
| 6 | Text Your Landlord Without the Stress | Claude | "Help me write a kind but firm message about [issue]. Keep it under 120 words and offer two dates." |
| 7 | Any Error Code, Explained | Claude (photo) | "This is my [appliance] showing this code. What does it mean, what can I safely try myself, and when should I call a pro?" |
| 8 | Homework Help That Doesn't Cheat | Claude | "Explain this like I'm 10, then give me one practice question. Don't give the answer until I try." |

### Students

| # | Title idea | Tool | The prompt or command |
|---|---|---|---|
| 9 | A 1-Hour Lecture Becomes Flashcards | faster-whisper + Claude | "From this transcript, make 20 flashcards as CSV: front,back. One fact per card." (Import into Anki.) |
| 10 | Any PDF Becomes a Study Guide | **microsoft/markitdown** + Claude | `markitdown notes.pdf > notes.md`, then: "Make a one-page study guide with the 10 key ideas and 5 exam-style questions." |
| 11 | The "Quiz Me" Prompt | Claude | "Quiz me on [topic] one question at a time. Get harder when I'm right; explain when I'm wrong." |
| 12 | Any Research Paper at 5 Levels | Claude | "Explain this paper at 5 levels: a 10-year-old, a teenager, an undergrad, a grad student, an expert." |

### Work and office

| # | Title idea | Tool | The prompt or command |
|---|---|---|---|
| 13 | Meeting to Action Items in 10 Seconds | Claude | "From this transcript, make a table: action, owner, due date. Mark anything unclear as '?'." |
| 14 | Excel Formulas in Plain English | Claude | "Write an Excel formula that [goal]. Columns: A=…, B=…. Explain it in one line." |
| 15 | The Inbox Triage Prompt | Claude | "Sort these emails into Reply today / This week / FYI / Delete, with a one-line reason each." |
| 16 | Notes Become a Real PowerPoint | Claude with file creation (**anthropics/skills**) | "Turn these notes into a 6-slide deck: title, 4 content slides, summary. Use a clean style." |
| 17 | Compare 3 Quotes in One Table | Claude | "Compare these 3 quotes in a table: price, what's included, hidden costs. Then list 5 questions I should ask." |

### Creators

| # | Title idea | Tool | The prompt or command |
|---|---|---|---|
| 18 | Remove Any Background, Offline and Free | **danielgatis/rembg** | `rembg i photo.jpg cutout.png` |
| 19 | Fix Old Family Photos Free | **Upscayl** (open-source app) | Drag in, pick a model, export. Film before and after. |
| 20 | Auto-Subtitles for Any Video | faster-whisper | Export `.srt`, then drop it into your editor or YouTube. |
| 21 | Split a Song into Vocals and Music | **demucs** | `demucs song.mp3` |
| 22 | One Long Video Becomes 10 Short Ideas | Claude | "From this transcript, give me 10 Short ideas: the hook line, the 20-second payoff, and a title under 40 characters." |

### Claude Code and power users

| # | Title idea | Tool | The prompt or command |
|---|---|---|---|
| 23 | Understand Any GitHub Repo in 2 Minutes | Claude Code | In a cloned repo: "Explain this repo to a new developer: what it does, the 5 most important files, how a request flows." |
| 24 | A Personal Website From Your CV in 15 Minutes | Claude Code | "Build a one-page site from cv.pdf. Simple, fast, dark mode. Then tell me how to host it free." |
| 25 | Clean Your Downloads Folder Safely | Claude Code | "Write a script that sorts ~/Downloads by type into folders. Show a dry run first and don't delete anything." |
| 26 | Rename 500 Photos by Date | Claude Code + exiftool | "Rename every photo in this folder to YYYY-MM-DD_HHMM using the date taken. Dry run first." |
| 27 | Your Own Private ChatGPT, Offline | **ollama/ollama** + **open-webui** | `ollama run <model>`, then Open WebUI in the browser. |
| 28 | Let AI Use Your Browser (Carefully) | **browser-use** / Playwright MCP | "Find the 3 cheapest flights from X to Y on these dates and show me a table. Don't book anything." |
| 29 | Any Website Becomes a Daily Email | **n8n-io/n8n** + Claude | Schedule, then fetch, then summarise, then send to email. |
| 30 | Repo of the Week (trending agent skills) | GitHub trending | Pick from `TECH_RESEARCH.md`. |

**Spin-off series, "Prompt patterns"** (each one gets its own Short):
- "Ask me 5 questions first"
- "Critique this like an expert"
- "3 options with pros and cons in a table"
- "Rewrite it for a 10-year-old"
- "Extract it to CSV/JSON"
- "Role + context + format"

## How we make them each week

1. **Me:** pick 5–7 ideas, test every prompt and command, and write a 25–40 second script for each with the beats marked. Whatever I can run in my environment (transcription, background removal, PDF to Markdown, scripts), I run for real and turn into terminal and result cards.
2. **You:** record the parts that need *your* laptop or apps (claude.ai, Claude Code, desktop apps), plus the narration.
   - **Screen:** macOS **⌘⇧5** or Windows **Win+Alt+R**, at 1080p. Zoom the browser to 125–150%, use dark mode, and close tabs and notifications.
   - **Narration:** your phone in a quiet room, 15 cm from your mouth. Read the script, with one take per beat.
   - **Hand-off:** upload to a Drive folder called `AI shorts raw`.
3. **Me:** cut the Short with `breakdown.py` (captions, highlight boxes, push-ins, cards). Every 10 Shorts, I also cut the long-form compilation and write upload kits with the prompts in the description.

## Trust and safety rules (for credibility and YouTube)

- **Privacy:** never paste IDs, bank details or other people's data into a cloud AI. Show the local option (Ollama, faster-whisper) instead.
- **Accuracy:** always say "check the output", especially for money, health and legal topics. **Never** use an AI persona to give advice on those topics, because that's one of YouTube's banned categories.
- **Students:** frame it as learning (quizzes, explanations), not writing the essay.
- **No hype claims** ("AI made me $10K").
