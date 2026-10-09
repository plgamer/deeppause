# DeepPause

*中文说明见本扩展中的 `README.zh-CN.md`。*

A VS Code panel that plays back a **simulated** coding-agent session: streaming
reasoning, tool calls, todo lists, diffs, a test run that fails and then passes.

A task runs open-ended — the beats keep coming until you interrupt it.

It is a toy. **It does not call any AI service, send any data anywhere, or modify
any of your files.** Everything you see is generated locally from a phrase bank
plus whatever is already in your open workspace.

> **Not affiliated with, endorsed by, or connected to any AI company or product.**
> DeepPause is an independent, original project. It contains no third-party code,
> assets, logos or trademarks.

## Install

From a packaged `.vsix`:

```
code --install-extension deeppause-0.2.1.vsix
```

Or in VS Code: **Extensions** → `…` menu → **Install from VSIX…**, then reload
the window.

## Open a session

Click the **DeepPause** icon in the activity bar (the left-hand strip). The
sidebar opens straight into a live session — no command needed.

Other ways in:

| | |
| --- | --- |
| `Ctrl/Cmd+Alt+K` | Focus the sidebar session |
| **DeepPause: Open Session** | Same thing, from the command palette |
| **DeepPause: Open Session in Editor** | A second session in a full-width editor tab — also the ⧉ button in the view's title bar |

The sidebar and the editor tab are independent sessions; you can run both at
once.

## Use

- Type a task into the input box and press **Enter**. It runs until you stop it.
- **Esc** interrupts the current turn. (The ■ button in the view title bar does
  the same, and stops every running session.)
- **Ctrl/Cmd+Shift+Backspace** panics: interrupts everything, closes the editor
  tab, and collapses the sidebar.
- `/help` lists the commands, `/clear` resets the transcript.

The **run** picker in the status line, next to the model, caps a turn at 1 min
through 1 hour instead of leaving it open-ended. When the budget runs out the
turn wraps up with a summary rather than stopping mid-sentence. Time spent
frozen does not count against it.

The session freezes automatically when the VS Code window loses focus.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `deeppause.agentName` | `DeepPause` | Name in the banner and tab title |
| `deeppause.models` | `["orion-4.5", …]` | Entries in the model picker (cosmetic) |
| `deeppause.speed` | `1` | Playback speed multiplier |
| `deeppause.useWorkspaceFiles` | `true` | Reference real paths and symbols from the open workspace |
| `deeppause.accent` | `#7dd3a0` | Accent colour |

## How it works

| File | Role |
| --- | --- |
| `src/scan.ts` | Reads the workspace for real file paths, symbol names and code snippets |
| `src/corpus.ts` | Phrase banks with `{file}` / `{sym}` slots |
| `src/engine.ts` | Beat scheduler — emits events with jittered, occasionally stalling timing |
| `src/session.ts` | One transcript bound to a webview, plus the shared HTML |
| `src/view.ts` | Activity-bar host |
| `src/panel.ts` | Editor-tab host |
| `media/main.js` | Renders events into the transcript |

An open-ended run loops over a weighted pool of beats — think, read, grep, edit,
test, speak — advances a rolling todo list, and fakes a context compaction once
the token counter climbs high enough, so the status line never pins at its floor.
The transcript keeps its last 400 blocks.

The timing model matters more than the wording. Output streams word by word at
22–77 ms with a ~3.5% chance of a 0.5–1.8 s stall, because evenly paced text
reads as a typewriter effect rather than a model.

## Developing

```
npm install
npm run compile
```

Press `F5` to launch the Extension Development Host — this is for working on
DeepPause itself, not for using it. `npm run watch` recompiles on save.

To package: `npx @vscode/vsce package`.

## License

MIT. See the `LICENSE` file in this extension.
