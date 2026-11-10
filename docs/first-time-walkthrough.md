# First-time walkthrough: let Claude use your Comet browser

Follow this top to bottom. Each step says exactly what to click or type. Skip nothing.
Total time: about 20 minutes. You need a Windows PC with Comet already installed and logged in.

---

## Part 1: Install the tools (one time only)

### Step 1. Install Node.js

1. Open Comet and go to **https://nodejs.org**
2. Click the big green button that says **LTS** (not "Current").
3. When the download finishes, double-click the file. It is called something like `node-v22...-x64.msi`.
4. Click **Next** on every screen. Leave every box as it is. On the screen called "Custom Setup" make sure **Add to PATH** is not crossed out (it is on by default).
5. Click **Install**, then **Finish**.

### Step 2. Install Git

1. Go to **https://git-scm.com/download/win**
2. Click **Click here to download**.
3. Double-click the downloaded file. Click **Next** on every screen without changing anything. Click **Install**, then **Finish**.

### Step 3. Open PowerShell

1. Press the **Windows key** on your keyboard.
2. Type `powershell`
3. Click **Windows PowerShell** (the blue icon). A blue or black window opens. This is where you will type commands.

Check that Steps 1 and 2 worked. Type this and press **Enter**:

```powershell
node --version
```

You should see something like `v22.11.0`. Then type this and press **Enter**:

```powershell
git --version
```

You should see something like `git version 2.47.0`. If either one says "not recognized", close PowerShell, open it again (Step 3), and try again. If it still fails, restart the PC.

### Step 4. Install Claude Code

In the same PowerShell window, type this and press **Enter**:

```powershell
npm install -g @anthropic-ai/claude-code
```

Wait until it finishes (30 seconds to 2 minutes). Then type:

```powershell
claude --version
```

You should see a version number.

### Step 5. Log in to Claude Code

Type this and press **Enter**:

```powershell
claude
```

A text screen appears asking you to log in. Use the arrow keys to pick **Claude account with subscription**, press **Enter**. Your browser opens a login page. Log in with the same account you use on claude.ai, click **Authorize**. Go back to PowerShell. It should say you are logged in.

Press **Ctrl + C** twice to exit Claude Code for now.

---

## Part 2: Get the project onto your PC

### Step 6. Download this repository

In PowerShell, type these one at a time, pressing **Enter** after each:

```powershell
cd $HOME\Documents
```

```powershell
git clone https://github.com/akshay-evalgent/Claude-new.git
```

```powershell
cd Claude-new
```

```powershell
git checkout claude/nifty-pasteur-8cw792
```

You now have a folder called `Claude-new` inside your Documents folder with all the setup files in it.

### Step 7. Allow PowerShell to run the helper scripts

Type this and press **Enter**:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

If it asks a question, type `Y` and press **Enter**. You only do this once ever.

### Step 8. Create your settings file

Type this and press **Enter**:

```powershell
Copy-Item .env.example .env
```

Now open that file in Notepad:

```powershell
notepad .env
```

Notepad opens. You will see lines like `BRAVE_API_KEY=`. **Leave everything as it is for now.** Close Notepad. (You will come back to this file in Part 4 if you want the search feature.)

---

## Part 3: Connect Comet

### Step 9. Install the Playwright Extension in Comet

This small extension is the bridge that lets Claude see and click inside your Comet window.

1. In Comet, go to this address:
   **https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm**
2. Click the blue **Add to Chrome** button (it says Chrome even in Comet, that is normal).
3. A popup asks for confirmation. Click **Add extension**.
4. Leave Comet open. It must stay open whenever Claude is using it.

### Step 10. Check everything

Back in PowerShell (make sure you are still inside the `Claude-new` folder), type:

```powershell
.\scripts\check-browser-setup.ps1
```

You will see a list of lines starting with `[ok]`, `[warn]`, or `[FAIL]`.

- `[ok]` lines are good.
- A `[warn]` about `BRAVE_API_KEY` is fine for now. That is the optional search feature.
- Any `[FAIL]` line tells you what to fix. The most common one is "Comet not found". If you see that, do this:
  1. Right-click the **Comet** icon on your desktop or Start Menu.
  2. Click **Properties**.
  3. Copy everything in the **Target** box (it ends in `comet.exe`).
  4. Open `.env` again with `notepad .env`, find the line `COMET_PATH=` and paste the path after the `=`. Change every backslash `\` to a forward slash `/`. Remove any quote marks. Save and close.
  5. Run the check again.

### Step 11. Start Claude with the browser connected

Type:

```powershell
.\scripts\start-claude.ps1
```

Claude Code starts. The first time, it shows a box asking whether to use the MCP servers from this project. Use the arrow keys to choose **Yes** (or "Use this and all future MCP servers in this project") and press **Enter**.

Comet may show a small popup from the Playwright Extension asking to allow the connection. Click **Allow**.

### Step 12. Try it

In Claude Code, type this and press **Enter**:

```
Open https://www.linkedin.com/feed/ in my browser and tell me the headline of the first post you see.
```

A new tab should open in your Comet window, and Claude should describe what it sees. Because it is your real Comet, you are already logged in. That is the whole point.

To check which connections are live at any time, type `/mcp` inside Claude Code and press **Enter**. You want `comet-browser` to say connected.

To leave Claude Code, press **Ctrl + C** twice.

---

## Part 4 (optional): Add fast web search

Claude can already search using the Comet browser. This step adds a faster search tool that does not need to open tabs. It needs a free API key from Brave. Brave here is just a search service, it has nothing to do with the Brave browser and you do not need to install anything.

1. In Comet, go to **https://brave.com/search/api/**
2. Click **Get started** and create an account. It asks for a card to prevent abuse, but there is a monthly free amount.
3. Once inside the dashboard, click **API Keys** in the left menu, then **Add API key**. Give it any name, click **Add**.
4. Click the **copy** icon next to the new key.
5. In PowerShell, type `notepad .env`. Find the line `BRAVE_API_KEY=` and paste the key right after the `=` with no spaces. Save and close.
6. Start Claude again with `.\scripts\start-claude.ps1`. Type `/mcp` and check that `brave-search` is now connected.

---

## Every day after this

Each time you want to use Claude with your browser:

1. Make sure Comet is open.
2. Open PowerShell.
3. Type `cd $HOME\Documents\Claude-new` and press **Enter**.
4. Type `.\scripts\start-claude.ps1` and press **Enter**.

That is it.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| "not recognized as a command" for `node`, `git`, or `claude` | Close PowerShell and open it again. If still broken, restart the PC. |
| "running scripts is disabled on this system" | Do Step 7 again. |
| `comet-browser` not connected in `/mcp` | Comet is closed, or the Playwright Extension is missing or off. Open Comet, check `chrome://extensions` in Comet shows it enabled, then exit Claude and start again. |
| "Comet not found" from the check script | Follow the fix under Step 10. |
| Claude opens pages but cannot log in | Log in once yourself in Comet. Claude uses whatever Comet is logged in to. |
| You just want to start over | Type `claude mcp reset-project-choices` in PowerShell inside the folder, then start again. |
