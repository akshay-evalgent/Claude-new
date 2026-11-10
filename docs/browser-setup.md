# Giving Claude Code full web access through Comet (Windows)

Short answer to "do we need an MCP connection?": **yes, for driving Comet with your logged-in identity you need an MCP server.** Plain Claude Code already has `WebFetch` and `WebSearch`, but those run as an anonymous client. They never see your logins, cookies, or paywalled content, and they cannot click, scroll, or download through a real browser. The browser bridge is what adds that.

Comet is Perplexity's browser. It is built on Chromium and installs Chrome Web Store extensions, so the standard Playwright MCP server works with it the same way it works with Chrome.

This repo ships a ready-made setup with three MCP servers in `.mcp.json`:

| Server | What it does | When to use |
|---|---|---|
| `comet-browser` | Attaches to **your running Comet** through the Playwright Extension. Uses your real profile: logins, cookies, extensions. | Anything that needs *you* (LinkedIn, Gmail, dashboards, paywalled sites). |
| `comet-direct` | Launches Comet itself with a **separate persistent profile** in `.comet-mcp-profile\`. Log in once there and it sticks. | Bulk scraping or long runs where you don't want Claude touching your daily browser. |
| `brave-search` | Brave Search API (web, news, images, video, local). A search API only, unrelated to which browser you use. | Fast search without opening a tab. Needs an API key. |

All three are optional. If you only fill in `BRAVE_API_KEY`, only search works. If you only install the extension, only `comet-browser` works.

The config is written for **native Windows**: each server runs through `cmd /c npx`. If you ever run it on macOS or Linux, change `"command"` to `npx` and drop the `"/c"` argument.

## Important: where Claude Code runs

A **cloud session** (claude.ai/code, the session this setup was written from) runs in a container on Anthropic's servers. It cannot see your Comet, your extensions, or your profile. The browser servers only work when Claude Code runs **on your PC**: the CLI in PowerShell or Windows Terminal, the VS Code extension, or Claude Desktop with "Local" selected. You can still steer that local session from your phone with Remote Control.

**Use native Windows, not WSL.** The Playwright extension bridge from WSL to a Windows browser is unreliable. Run Claude Code from PowerShell.

## One-time setup

1. **Node.js 18+** from https://nodejs.org. Tick "Add to PATH". Reopen the terminal afterwards.
2. **Claude Code** installed and logged in:
   ```powershell
   npm install -g @anthropic-ai/claude-code
   ```
3. **Clone and enter the repo**, then create your env file:
   ```powershell
   Copy-Item .env.example .env
   ```
   Open `.env` and fill in `BRAVE_API_KEY`. Leave `COMET_PATH` empty unless detection fails. `.env` is gitignored.
4. **Playwright Extension in Comet** (for `comet-browser`): open the Chrome Web Store link that the checker script prints, in Comet, and install it. Keep Comet open. The extension shows an approval popup the first time Claude connects. Set `PLAYWRIGHT_MCP_EXTENSION_TOKEN` in `.env` to skip it.
5. **Brave Search API key** (for `brave-search`): sign up at https://brave.com/search/api/. There is a monthly free credit; a card is requested to prevent abuse.
6. **Sanity check**:
   ```powershell
   .\scripts\check-browser-setup.ps1
   ```
   If PowerShell refuses to run scripts, run this once and retry:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

## Starting a session

```powershell
.\scripts\start-claude.ps1
```

The script loads `.env`, finds `comet.exe` (per-user install under AppData, Program Files, or the Start Menu shortcut), exports it as `COMET_PATH`, and runs `claude`. Any extra arguments are passed through.

Claude Code reads `.mcp.json` from the project root and expands `${VAR}` from the environment. The first time, it asks you to approve the project's MCP servers. `.claude\settings.json` pre-approves all three and allows their tools without per-call prompts, but if Claude Code still asks once, say yes.

Inside the session, `/mcp` shows whether each server connected.

## What Claude can then do

- **Search**: `brave_web_search`, `brave_news_search`, etc. from `brave-search`.
- **Browse as you**: `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot` from `comet-browser`. Pages open as new tabs in your real Comet window.
- **Scrape**: ask Claude to read the page snapshot and write the data to a CSV or JSON file in the repo.
- **Download**: `browser_pdf_save` and `browser_take_screenshot` write to `COMET_MCP_OUTPUT_DIR` (default `.\downloads\`). For direct file URLs Claude can also use `curl`, which ships with Windows 10 and later and is allowed in `.claude\settings.json`. A site's own download button inside the browser follows Comet's download settings, so those files land in your usual Downloads folder.

## About Claude in Chrome

Claude Code also has a built-in bridge using the official "Claude in Chrome" extension (`claude --chrome`). The docs list Chrome, Edge, Brave, Arc, Vivaldi and Opera. **Comet is not on that list**, and it is not verified to work there. You can try it: install the Claude in Chrome extension in Comet, run `claude --chrome`, and check `/chrome`. If it says the extension is not detected, stay with the Playwright setup above, which is the supported path for Comet.

## Troubleshooting

- `comet-browser` fails to connect: Comet is not running, the Playwright Extension is not installed or enabled, or you dismissed its approval popup. Restart `claude` after fixing.
- `comet-direct` fails to start: `COMET_PATH` was not detected. Right-click the Comet shortcut, Properties, copy the Target, and set it in `.env` with forward slashes.
- `comet-direct` says the profile is locked: a Comet instance is already using `.comet-mcp-profile\`. Close it. Never point this at your real profile folder; Chromium browsers allow one process per profile.
- `brave-search` is missing from `/mcp`: `BRAVE_API_KEY` is empty. Edit `.env` and start again through `start-claude.ps1`, not plain `claude`.
- `npx` not found inside the MCP server: Node is not on PATH for the terminal that launched Claude Code. Reopen the terminal after installing Node.
- Project servers never load: run `claude mcp reset-project-choices` and approve them again.
