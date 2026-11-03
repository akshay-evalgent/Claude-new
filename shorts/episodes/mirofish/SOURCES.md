# Sources and licences: MiroFish episode

Every piece of real media in the video, where it came from and the terms it is used
under. The media files are not committed; `tools/fetch_media.sh` and the capture scripts
recreate them.

## Footage and images

| In the video | Source | Licence | Attribution needed |
|---|---|---|---|
| Dark code on a monitor (0–1.6 s) | Coverr, `coverr-coding-developer-7198` | [Coverr licence](https://coverr.co/license): free commercial use, edits allowed | No |
| Hands typing (1.6–3 s) | Coverr, `coverr-a-female-s-hands-typing-on-laptop-7520` | Coverr licence | No |
| Coins (5–7 s) | Coverr, `coverr-a-heap-of-old-money-illuminated-in-studio-lighting-9527` | Coverr licence | No |
| Crowded street (19–20 s) | Coverr, `coverr-a-crowded-street-3991` | Coverr licence | No |
| Man typing on a phone (20–21 s) | Coverr, `coverr-a-man-typing-on-his-phone-while-sitting-on-the-curb-56` | Coverr licence | No |
| Cheering crowd (41–47 s, dimmed) | Coverr, `coverr-cheering-crowd-1136` | Coverr licence | No |
| School of fish (8–11 s) | Wikimedia Commons, [Fish Zaitunay Bay 10.webm](https://commons.wikimedia.org/wiki/File:Fish_Zaitunay_Bay_10.webm) | Public domain | No |
| Dream of the Red Chamber pages and portraits (29–32 s) | National Library of China scan of the 1791 Cheng-Gao edition, vol. 1, via [Internet Archive](https://archive.org/details/nlc-892-411999026433-70907) | Public Domain Mark 1.0 | No |
| MiroFish live demo (graph build, agent setup, simulation, report) | Recorded from [666ghj.github.io/mirofish-demo](https://666ghj.github.io/mirofish-demo/) with `tools/capture_demo.cjs` / `capture_steps.cjs` | The project's own public demo, shown for commentary | Credit the project (in the description) |
| MiroFish logo, homepage and chat screenshots, Red Chamber demo cover | [github.com/666ghj/MiroFish](https://github.com/666ghj/MiroFish) `static/image/` | Project assets (repo is AGPL-3.0), shown for commentary | Credit the project |
| GitHub repo page (83.7k stars) | Live capture with `tools/capture_github.cjs`, dark theme | Screenshot of a public page, shown for commentary | No |

Coverr's licence forbids trademarks visible in its clips being used as endorsements; none
of the chosen clips shows a brand. It also forbids redistributing the clips themselves,
which is why `media_src/` and `media/` are git-ignored.

Not used, on purpose:
- CC BY-SA clips (for example the Monterey Bay sardines video). Share-alike would force
  the whole Short under CC BY-SA.
- The starling murmuration from the Internet Archive (CC BY 2.0). It was 360p and the
  birds were specks.
- The MiroFish Bilibili demo videos. The repo only links to them.

## Facts

| On screen | Source |
|---|---|
| A college senior built it | 36Kr: "a senior undergraduate in computer science" ([36Kr EN](https://eu.36kr.com/en/p/3725013289712001)); TMTPost: "a senior undergraduate student in China" ([TMTPost](https://en.tmtpost.com/post/7905996)) |
| He hoped for 1,000 stars; his next project got 83,686 | 36Kr quotes him on BettaFish, his first viral project: "I'd be very satisfied if it could get 1,000 stars". MiroFish came about three months later |
| 83,686 stars | GitHub API, 3 Nov 2026 (`gh api search/repositories -f q=repo:666ghj/MiroFish`); the page shows 83.7k |
| ¥30 million from a billionaire | 36Kr and TMTPost: about 30 million yuan from Shanda founder Chen Tianqiao (TMTPost's subtitle says 300 million; its body and 36Kr say 30 million) |
| ≈ US$4.2 million | 30,000,000 / 7.1 |
| Simulates thousands of people to predict the future | README: "thousands of intelligent agents with independent personalities, long-term memory, and behavioral logic"; tagline "Predicting Anything" |
| Feed it news, policy, financial reports, novels | README: "breaking news, policy drafts, or financial signals", "interesting novel stories" |
| Step 2 maps people and connections; 132 entities, 222 relationships | README workflow (GraphRAG construction); the numbers are what the live demo shows |
| Each one becomes an AI agent with personality and memory | README workflow step 2; demo: "Generate Agent Profiles", 55 agents |
| Two simulated social networks at once (≈ Twitter, ≈ Reddit) | README: "Dual-platform parallel simulation"; code: `run_twitter_simulation.py`, `run_reddit_simulation.py`; UI: "Plaza / Feed", "Topic / Community" |
| Play god: drop in a what-if | README: "inject variables dynamically from a God's-eye view"; demo prompt: "What would public opinion look like if Wuhan University issued a reversal of its disciplinary decision…" |
| Prediction report, interview the agents | README workflow steps 4–5; demo report title; repo screenshot 5 (chat) |
| "If justice only happens when it trends, what did four years of law school teach us?" | Translation of the quoted line in repo screenshot 5: 如果正义需要热搜倒逼才能实现，那我们的四年法学教育究竟在教什么？ |
| A 260-year-old novel whose author died before the ending | Cao Xueqin died in 1763 with the novel unfinished; manuscripts circulated from the 1750s, first print 1791 |
| MiroFish predicted the ending from the characters | README: "deep prediction of the lost ending based on hundreds of thousands of words from the first 80 chapters" |
| Homepage: "Low cost: ~$5 per simulation" | Repo screenshot 1: 低成本 · 常规模拟平均5$/次 |
| README: "High consumption, try simulations with fewer than 40 rounds first" | README, environment variables section (quoted verbatim) |
| It rehearses many futures rather than seeing one | README: "rehearse the future in a digital sandbox, and win decisions after countless simulations"; 36Kr: aims to make possible futures "discussable and testable" |
| The swarm's posts and "73% will follow" | A joke, labelled SIMULATED · JOKE on screen; not a MiroFish run |
