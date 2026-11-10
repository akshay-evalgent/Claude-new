# Decisions

Every architectural choice, the alternative, and why. Newest first.

## Milestone 1

- **First tool is yt-dlp YouTube search, not web search.** PLAN.md listed `web_search`. Keyless web
  search (`ddgs`) is blocked from cloud IPs, while yt-dlp search and metadata work from both cloud
  and home machines (see FREE-STACK.md). Web search comes back when the Scout needs blogs and news.
- **Search and stats are two tools, not one.** One tool that always fetched full stats would cost a
  few seconds per result. Two tools make the model choose what deserves the slow call, which is the
  planning behaviour we want to study.
- **Tool calling in the Agent SDK adapter uses a structured-output turn schema.** Alternative:
  register tools with the SDK as in-process MCP servers. That would hand the loop to Claude Code,
  and LangGraph must own the loop from Milestone 2. The schema approach keeps the standard
  `bind_tools` / `AIMessage.tool_calls` interface, so the same agent code runs on any provider.
- **The ReAct loop is hand-written, not `create_agent`.** The prebuilt hides the loop we want to
  learn, and would add the `langchain` package as a dependency. Milestone 2 replaces this loop
  with a LangGraph graph anyway.
- **Sort plus upload-window searches fall back to relevance results sorted in code.** YouTube
  sometimes returns nothing for that filter combination. The tool says when the fallback happened.
- **The Agent SDK adapter allows 3 turns per call, not 1.** Structured output uses an internal tool
  call and schema retries use more turns; a cap of 1 crashed a live run. With `tools=[]` the extra
  turns cannot be spent on anything else.
- **The forced final turn uses `tool_choice="none"` rather than only asking nicely.** Taking the
  tools away is enforced; a prompt is a request. The loop still stops if a provider ignores it.

## Milestone 0

- **Default LLM is the logged-in Claude account through the Claude Agent SDK**, with a `.env`
  switch to an API key, Gemini or Ollama. Reasoning in FREE-STACK.md, section 1.
- **Schemas before prompts.** `TechniqueCard` and its validation rules came first; see Lesson 0.
