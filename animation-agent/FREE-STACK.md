# Free Stack Research — what we can use without paid keys

Date: 2026-11-09. Every row marked **verified** was actually run from this cloud session.
Rows marked **home machine** could not be fully verified here because the cloud container's
IP is blocked by that site (YouTube and Reddit both block datacenter IPs) and is expected to
work from a normal laptop or home connection.

## 1. LLM access

| Option | Cost | Status | Notes |
|---|---|---|---|
| **This Claude account via the Claude Agent SDK** (`claude-agent-sdk` on PyPI) | Uses the account this session runs on, no key in `.env` | **verified** here: returned a reply and reported usage cost | The SDK drives the installed `claude` CLI, which already holds the login. Supports `system_prompt`, `model`, `max_turns`, `disallowed_tools`, and JSON-schema structured output via `output_format`, returned in `ResultMessage.structured_output`. Each call also loads Claude Code's own context (tens of thousands of cached tokens), so we will pass a short custom `system_prompt` and no tools to keep calls lean. Anthropic's policy: fine for our own use, but not something we can ship to other people as "login with your Claude account". |
| `anthropic` / `langchain-anthropic` with an `ANTHROPIC_API_KEY` | Paid, per token | **verified** that the zero-config SDK does *not* work here (no key, no OAuth profile) | We keep the slot in `.env` so anyone with a key can flip a switch and use the normal LangChain path. |
| Google Gemini API free tier (`langchain-google-genai`) | Free key from Google AI Studio, no card | Not tested; Google no longer publishes free limits, they show inside AI Studio after sign-in. Third-party reports say the free tier was cut sharply in April 2026 | Optional fallback or cheap "Triage" model. Also the only free way to send a *whole video* to a model. |
| Groq free tier, OpenRouter `:free` models | Free key, no card | Not tested; reported ~30 requests/min and ~1k/day on Groq, 50/day on OpenRouter free | Fallbacks for cheap bulk steps only. |
| Ollama (local open models) | Free, needs your laptop's RAM/GPU | Not tested | Good for embeddings and small classification if you have 8 GB+ RAM. |

**Design consequence:** one `llm.py` module with a provider switch (`claude-code` default, then
`anthropic`, `gemini`, `ollama`), chosen by `.env`. Every node asks `get_model(role)` so swapping
providers never touches node code. This is also a good lesson in keeping agents provider-agnostic.

## 2. Discovery (finding candidate videos and articles)

| Need | Free tool | Key? | Status |
|---|---|---|---|
| YouTube search + per-video stats (views, likes, comments, upload date, channel size, tags, caption availability) | **yt-dlp** (`ytsearchN:` queries, `-j --skip-download`) | None | **verified**: search returned results; full metadata worked once the installed Node runtime was passed with `--js-runtimes node` (yt-dlp now requires a JS runtime for YouTube). |
| YouTube official stats and comments | YouTube Data API v3 | Free Google key, 10,000 units/day, 100 searches/day, no card | Docs verified. Use for reliable comment threads and bulk stats; yt-dlp covers the rest. |
| Vimeo Staff Picks (the motion-design gold standard) | yt-dlp `--flat-playlist` on the channel URL | None | **verified** from here. |
| Reddit (r/MotionDesign, r/animation, r/AfterEffects, r/blender, r/Simulated, r/oddlysatisfying) | PRAW with a free Reddit "script" app | Free key, no card | Public `.json` endpoints returned 403 from this cloud IP, so use the official free API. |
| Web search | `ddgs` (DuckDuckGo/Startpage, keyless) first; Tavily free tier (1,000 credits/month) as the keyed option | ddgs none; Tavily free key | ddgs failed here because the search backends closed the connection from this cloud IP. Expected to work on a home machine. Tavily needs signup but no card. |
| Blogs and news (Motionographer, School of Motion, tool changelogs for After Effects, Blender, Rive, Cavalry, Jitter, Runway, Kling, Veo) | `httpx` + `trafilatura`/`readability` for clean text, RSS where available | None | Motionographer reachable from here. |
| TikTok trending/tag/user feeds | yt-dlp `tiktok:user` works; `tiktok:tag` currently marked broken. `TikTokApi` (unofficial, MIT) needs Playwright plus an `ms_token` cookie from your own browser and often proxies | None, but fragile | Not tested. See "unsolved" below. |
| Instagram Reels | yt-dlp single-post extractor works; `instagram:user` marked broken. `instaloader` risks account blocks | None, fragile | Not tested. See "unsolved" below. |
| X/Twitter, Pinterest, LinkedIn, Reddit video | yt-dlp extractors exist for all four | None | Not tested. |
| Behance / Dribbble | Not in yt-dlp. Plain page fetch of project pages works for metadata | None | Not tested. |

## 3. "Watching" a video (giving the agent eyes and ears)

The pattern used by every open-source "let the agent watch a video" project is the same:
**yt-dlp downloads, ffmpeg samples frames, captions or Whisper give a transcript, a multimodal
model reads the frames.** We will build this ourselves as a `video.py` tool because the ready-made
repos are packaged as Claude Code skills, not importable libraries, and we want to understand it.

| Piece | Free tool | Status |
|---|---|---|
| Download | yt-dlp (Unlicense) | Metadata **verified**. Actual media download from this cloud IP got HTTP 403 from YouTube, which is the known cloud-IP block. Expected to work from a home machine; yt-dlp's wiki also documents an optional challenge-solver component. |
| Frame extraction | ffmpeg (installed), scene-change detection with `select='gt(scene,0.3)'` plus a uniform fallback | Standard, not yet run. |
| Transcript, tier 1 | yt-dlp `--write-auto-subs` / `youtube-transcript-api` (MIT) | Both blocked for cloud IPs by YouTube, documented in the library README. Works from home for light use. |
| Transcript, tier 2 | **faster-whisper** (MIT) `tiny`/`small` models on CPU, int8 | Installs fine; could not run end to end here because no media downloaded. Reported CPU speed: small model does 13 min of audio in about 1 to 2 min. |
| Visual analysis | Frames sent to Claude via the Agent SDK (multimodal). Gemini free tier can take the whole video file as an alternative | Not yet run. |
| Reference projects to read, not depend on | `bradautomates/claude-video` (MIT, 7k stars), `sonpiaz/watch-cli` (MIT, paid transcription backend by default), `HUANGCHIHHUNGLeo/claude-real-video` (pip CLI, frames + Whisper + manifest) | Read for design ideas. |

## 4. Storage, memory, retrieval

| Need | Free tool | Notes |
|---|---|---|
| Structured store (cards, trends, run log) | SQLite via `sqlite3`/SQLModel | Zero setup. |
| Vector store | **Chroma** (Apache-2.0), local persistent mode | **installed** here. Its default embedding function runs a small ONNX MiniLM model locally, so no embedding API key at all. |
| LangGraph checkpointer | `langgraph-checkpoint-sqlite` | Free, local. |
| Long-term store | LangGraph `InMemoryStore` to start, then the SQLite/Postgres store | Free. |

## 5. Observability and evals

| Option | Cost | Notes |
|---|---|---|
| **LangSmith Developer plan** | Free: 1 seat, 5,000 base traces/month, 14-day retention, then pay-as-you-go | Verified on the pricing page. Native LangGraph tracing and datasets/evals, which is what we want to learn. 5k traces is plenty for a weekly agent. Hosted LangGraph deployment is *not* on the free plan, so we run locally or on cron. |
| Arize Phoenix (self-hosted) | Free, Elastic License 2.0, `uvx arize-phoenix serve` | Verified. No trace caps. LangChain/LangGraph via `openinference-instrumentation-langchain`. Backup if we blow the LangSmith quota. |
| Langfuse (self-hosted) | Free, MIT | Heavier to run (Clickhouse, Redis, S3). Not needed. |

## 6. Where it should run

- **Your laptop or a home machine** is the right place for the Scout and Analyst nodes. YouTube,
  Reddit and the search engines block cloud-provider IPs, which is exactly what we hit here.
- **This cloud session** is fine for building, testing prompts, the knowledge base, and the Q&A
  graph, and for anything that reads Vimeo, blogs, GitHub and PyPI.
- Scheduling: `cron` on your machine, or a GitHub Actions workflow on a schedule for the parts
  that do not touch YouTube (GitHub runners are also datacenter IPs).

## 7. Things I could not find a free, reliable way to do

You said to tell you when research comes up empty. These are the gaps:

1. **TikTok and Instagram at scale.** There is no free official API for trending feeds or
   per-video metrics. yt-dlp handles single posts and TikTok user pages, but tag/hashtag and
   Instagram user feeds are marked broken, and the unofficial libraries need a cookie from your
   own logged-in browser and break whenever the sites change. Options: accept single-URL
   analysis for these platforms, rely on cross-posts to YouTube Shorts, or you find a data
   source. Paid APIs exist (Apify, EnsembleData, Bright Data) but are out of scope for now.
2. **YouTube downloads and transcripts from cloud IPs.** Blocked by YouTube. Free fix is to run
   those nodes on a home machine. Paid fix is a residential proxy. If you want the whole agent
   in the cloud, this is the one piece that needs either a proxy or your own machine as a worker.
3. **Hosted LangGraph deployment.** Not in the free LangSmith tier. We run the graph locally with
   `langgraph dev` and schedule with cron, which is good enough.
4. **Real engagement signals like saves, shares, completion rate.** Not exposed by any platform
   publicly, free or paid. Our viral score uses views per day, like and comment rate, creator
   baseline, and spread across sources instead.
5. **Claude access for other people.** Your account works for you through the Agent SDK. Anyone
   else must bring their own key, which is why the `.env` slot stays.

## 8. Decisions this research changes

- `llm.py` provider switch with `claude-code` as the default. Teaches provider abstraction.
- Replace the YouTube Data API as the primary source with **yt-dlp**; keep the Data API as the
  free keyed option for comments.
- Drop `langchain-community` tools (the package is sunset and archived). We write our own
  `@tool` functions, which is better for learning anyway.
- Run Scout/Analyst on your machine; keep the repo cloud-friendly for everything else.
- Add a `sources.yaml` so adding or removing a platform is config, not code.

## 9. .env.example (all optional except the first line's default)

```text
LLM_PROVIDER=claude-code          # claude-code | anthropic | gemini | ollama
ANTHROPIC_API_KEY=                # only if LLM_PROVIDER=anthropic
GOOGLE_API_KEY=                   # free, only if LLM_PROVIDER=gemini or for whole-video analysis
LANGSMITH_API_KEY=                # free Developer plan
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=animation-agent
YOUTUBE_API_KEY=                  # free Google Cloud key, optional
REDDIT_CLIENT_ID=                 # free Reddit script app, optional
REDDIT_CLIENT_SECRET=
TAVILY_API_KEY=                   # free tier, optional; ddgs used when empty
YTDLP_JS_RUNTIME=node             # yt-dlp needs node or deno for YouTube
```
