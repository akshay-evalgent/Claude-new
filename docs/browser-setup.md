# Giving Claude Code full web access through Brave

Short answer to "do we need an MCP connection?": **yes, for driving Brave with your logged-in identity you need either an MCP server or the built-in Claude in Chrome integration.** Plain Claude Code already has `WebFetch` and `WebSearch`, but those run as an anonymous client. They never see your logins, cookies, or paywalled content, and they cannot click, scroll, or download through a real browser. The browser bridge is what adds that.

This repo now ships a ready-made setup with three MCP servers in `.mcp.json`:

| Server | What it does | When to use |
|---|---|---|
| `brave-browser` | Attaches to **your running Brave** through the Playwright Extension. Uses your real profile: logins, cookies, extensions. | Anything that needs *you* (LinkedIn, Gmail, dashboards, paywalled sites). |
| `brave-direct` | Launches Brave itself with a **separate persistent profile** in `.brave-mcp-profile/`. Log in once there and it sticks. | Bulk scraping or long runs where you don't want Claude touching your daily browser. |
| `brave-search` | Brave Search API (web, news, images, video, local). | Fast search without opening a tab. Needs a free API key. |

All three are optional. If you only fill in `BRAVE_API_KEY`, only search works. If you only install the extension, only `brave-browser` works.

## Important: where Claude Code runs

A **cloud session** (claude.ai/code, the session this setup was written from) runs in a container on Anthropic's servers. It cannot see your Brave, your extensions, or your profile. The browser servers below only work when Claude Code runs **on your own machine**: the terminal CLI, the VS Code extension, or Claude Desktop with "Local" selected. You can still steer that local session from your phone with Remote Control.

So the flow is: clone this repo locally, do the one-time setup, and run `claude` there.

## One-time setup

1. **Node.js 18+** installed (`node --version`).
2. **Env file**
   ```bash
   cp .env.example .env
   ```
   Fill in `BRAVE_API_KEY` and `BRAVE_PATH` for your OS. Keep `.env` out of git (it is already ignored).
3. **Playwright Extension in Brave** (for `brave-browser`): install from the Chrome Web Store link in `scripts/check-browser-setup.sh`, then keep Brave open. The extension shows an approval popup the first time Claude connects. Set `PLAYWRIGHT_MCP_EXTENSION_TOKEN` in `.env` to skip that popup.
4. **Brave Search API key** (for `brave-search`): sign up at https://brave.com/search/api/. There is a monthly free credit; a card is requested to prevent abuse.
5. **Sanity check**
   ```bash
   bash scripts/check-browser-setup.sh
   ```

## Starting a session

```bash
set -a; source .env; set +a
claude
```

Claude Code reads `.mcp.json` from the project root and expands `${VAR}` from your shell. The first time, it asks you to approve the project's MCP servers. `.claude/settings.json` pre-approves all three and allows their tools without per-call prompts, but if Claude Code still asks once, say yes.

Inside the session, `/mcp` shows whether each server connected.

## What Claude can then do

- **Search**: `brave_web_search`, `brave_news_search`, etc. from `brave-search`.
- **Browse as you**: `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot` from `brave-browser`. Pages open as new tabs in your real Brave window.
- **Scrape**: ask Claude to read the page snapshot and write the data to a CSV or JSON file in the repo.
- **Download**: `browser_pdf_save` and `browser_take_screenshot` write to `BRAVE_MCP_OUTPUT_DIR` (default `./downloads/`). For direct file downloads Claude can also use `curl`, which `.claude/settings.json` allows. Note that a site's download button inside the browser is driven by Brave's own download settings, so files from clicks land in your usual Downloads folder.

## Alternative that needs no MCP config: Claude in Chrome

Claude Code also has a built-in browser bridge that uses the official "Claude in Chrome" extension instead of Playwright. Start with:

```bash
claude --chrome
```

and use `/chrome` inside the session to check status or pick a browser. Officially it supports Chrome and Edge, but the docs say Claude Code also detects the extension in other Chromium browsers including Brave. It requires a direct Anthropic plan login (Pro, Max, Team, Enterprise), not an API key, and the extension and Claude Code must be signed in to the same claude.ai org.

Use this if you'd rather not manage `.mcp.json`. Use the Playwright setup above if you want headless runs, a separate scraping profile, or scripted downloads. Both can coexist.

## Troubleshooting

- `brave-browser` fails to connect: Brave is not running, the Playwright Extension is not installed or enabled, or you dismissed its approval popup. Restart `claude` after fixing.
- `brave-direct` says the profile is locked: a Brave instance is already using `.brave-mcp-profile/`. Close it. Never point this at your real profile folder, Brave only allows one process per profile.
- `brave-search` is missing from `/mcp`: `BRAVE_API_KEY` is empty in your shell. `source .env` again in the same terminal.
- Project servers never load: run `claude mcp reset-project-choices` and approve them again.
