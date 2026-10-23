# DeepPause

**[中文](#中文) · [English](#english)**

---

## 中文

**让你的屏幕看起来正在跑 AI 写代码 —— 带老板键的摸鱼插件。**

打开 DeepPause，VS Code 侧边栏里就会开始一段"AI 编码 agent 正在干活"的会话：
流式输出的思考过程、读文件、grep、改代码出 diff、更新待办清单、跑测试先挂再修好……
而且会一直跑下去，不需要你动手。路过的人看到的，是你的 AI 正在认真重构项目。

老板走过来？按 **`Ctrl/Cmd+Shift+Backspace`**，一键全部收起。

> 它**不调用任何 AI 服务，不联网发送任何数据，也不会修改你的任何文件**。
> 屏幕上的一切都是本地生成的：一个短语库，加上你当前工作区里真实存在的文件名、
> 函数名和代码片段。
>
> 与任何 AI 公司或产品均无关联、未获其背书。DeepPause 是独立的原创项目，
> 不包含任何第三方代码、素材、logo 或商标。

### 为什么看起来像真的

- **引用你自己的代码**：路径、符号名、代码片段都取自当前打开的工作区，不是假的 `foo.ts`。
- **节奏像模型而不是打字机**：每个词 22–77 ms 随机流出，约 3.5% 的概率卡顿 0.5–1.8 秒。
- **永不停歇**：任务是开放式的，节拍循环产生；token 计数涨高了还会"压缩上下文"，状态栏不会露馅。
- **切走也照样跑**：窗口失去焦点时会话继续运行，回来时屏幕还在忙。

### 老板键

| 快捷键 | 作用 |
| --- | --- |
| `Ctrl/Cmd+Shift+Backspace` | **老板键**：打断所有会话、关掉编辑器标签页、收起侧边栏 |
| `Ctrl/Cmd+Alt+K` | 重新打开侧边栏会话（老板走了） |
| `Esc` | 打断当前这一轮 |

老板键在会话面板内外都能用。

### 安装

```
code --install-extension deeppause-0.2.2.vsix
```

或者在 VS Code 里：**扩展** → `…` 菜单 → **从 VSIX 安装…**，然后重新加载窗口。

### 使用

1. 点击活动栏（最左侧那一条）里的 **DeepPause** 图标，侧边栏直接进入一个正在运行的会话。
2. 想换个更像样的任务？在输入框里写一句（比如"把鉴权模块迁移到新的 token 方案"），按 **Enter**。
3. 想全屏摸鱼：点视图标题栏上的 ⧉ 按钮（或命令 **DeepPause: Open Session in Editor**），
   在编辑器标签页里再开一个全宽会话。侧边栏和标签页互相独立，可以同时跑。

其他：

- 状态栏模型旁边的 **run** 选择器可以把一轮限制在 1 分钟到 1 小时；时间到了会用一段总结收尾，
  而不是说到一半突然停住。默认不限时。
- 视图标题栏上的 ■ 按钮会停掉所有正在运行的会话。
- `/help` 列出命令，`/clear` 清空记录。

### 配置项

| 配置项 | 默认值 | 作用 |
| --- | --- | --- |
| `deeppause.agentName` | `DeepPause` | 横幅和标签页标题里显示的名字 |
| `deeppause.models` | `["orion-4.5", …]` | 模型选择器里的条目（纯装饰） |
| `deeppause.speed` | `1` | 回放速度倍数（0.25–5） |
| `deeppause.useWorkspaceFiles` | `true` | 从打开的工作区中取真实的路径和符号名 |
| `deeppause.accent` | `#7dd3a0` | 强调色 |

### 实现原理

| 文件 | 职责 |
| --- | --- |
| `src/scan.ts` | 扫描工作区，取出真实的文件路径、符号名和代码片段 |
| `src/corpus.ts` | 带 `{file}` / `{sym}` 占位符的短语库 |
| `src/engine.ts` | 节拍调度器 —— 以带抖动、偶尔卡顿的时序发出事件 |
| `src/session.ts` | 绑定到一个 webview 的会话，以及共用的 HTML |
| `src/view.ts` | 活动栏宿主 |
| `src/panel.ts` | 编辑器标签页宿主 |
| `media/main.js` | 把事件渲染成对话记录 |

一次开放式运行会在一个带权重的节拍池里循环 —— 思考、读取、grep、编辑、测试、说话 ——
推进一份滚动的待办清单，并在 token 计数够高时伪造一次上下文压缩。记录只保留最近 400 个块。

### 开发

```
npm install
npm run compile
```

按 `F5` 启动扩展开发宿主（这是开发 DeepPause 本身用的，不是日常使用方式）。
`npm run watch` 保存时自动重新编译。打包：`npx @vscode/vsce package`。

### 许可证

MIT，见 `LICENSE` 文件。

---

## English

**Make your screen look like an AI agent is busy writing code — a look-busy extension with a boss key.**

Open DeepPause and the VS Code sidebar starts playing an "AI coding agent at work"
session: streaming reasoning, file reads, greps, edits with diffs, a rolling todo
list, a test run that fails and then passes. It keeps going on its own until you
stop it. Anyone walking past sees your AI hard at work refactoring the project.

Boss coming over? Hit **`Ctrl/Cmd+Shift+Backspace`** and everything disappears.

> It **does not call any AI service, send any data anywhere, or modify any of your
> files**. Everything on screen is generated locally from a phrase bank plus the real
> file names, symbols and snippets already in your open workspace.
>
> Not affiliated with, endorsed by, or connected to any AI company or product.
> DeepPause is an independent, original project with no third-party code, assets,
> logos or trademarks.

### Why it looks real

- **It cites your own code**: paths, symbol names and snippets come from the open workspace, not a fake `foo.ts`.
- **Model-like pacing, not a typewriter**: words stream at 22–77 ms with a ~3.5% chance of a 0.5–1.8 s stall.
- **Never runs dry**: tasks are open-ended; when the token counter climbs it fakes a context compaction so the status line never gives it away.
- **Keeps going when you switch away**: the session doesn't pause when the window loses focus.

### Boss key

| Shortcut | What it does |
| --- | --- |
| `Ctrl/Cmd+Shift+Backspace` | **Boss key**: interrupt every session, close the editor tab, collapse the sidebar |
| `Ctrl/Cmd+Alt+K` | Bring the sidebar session back |
| `Esc` | Interrupt the current turn |

The boss key works whether or not the session panel has focus.

### Install

```
code --install-extension deeppause-0.2.2.vsix
```

Or in VS Code: **Extensions** → `…` menu → **Install from VSIX…**, then reload the window.

### Use

1. Click the **DeepPause** icon in the activity bar. The sidebar opens straight into a live session.
2. Want a more convincing task? Type one into the input box and press **Enter**.
3. For a full-screen look: the ⧉ button in the view's title bar (or **DeepPause: Open Session in Editor**)
   opens a second, full-width session in an editor tab. The two are independent and can run at once.

Also:

- The **run** picker next to the model in the status line caps a turn at 1 min–1 hour; when time is up
  the turn wraps up with a summary instead of stopping mid-sentence. Unlimited by default.
- The ■ button in the view title bar stops every running session.
- `/help` lists the commands, `/clear` resets the transcript.

### Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `deeppause.agentName` | `DeepPause` | Name in the banner and tab title |
| `deeppause.models` | `["orion-4.5", …]` | Entries in the model picker (cosmetic) |
| `deeppause.speed` | `1` | Playback speed multiplier (0.25–5) |
| `deeppause.useWorkspaceFiles` | `true` | Reference real paths and symbols from the open workspace |
| `deeppause.accent` | `#7dd3a0` | Accent colour |

### How it works

| File | Role |
| --- | --- |
| `src/scan.ts` | Reads the workspace for real file paths, symbol names and code snippets |
| `src/corpus.ts` | Phrase banks with `{file}` / `{sym}` slots |
| `src/engine.ts` | Beat scheduler — emits events with jittered, occasionally stalling timing |
| `src/session.ts` | One transcript bound to a webview, plus the shared HTML |
| `src/view.ts` | Activity-bar host |
| `src/panel.ts` | Editor-tab host |
| `media/main.js` | Renders events into the transcript |

An open-ended run loops over a weighted pool of beats — think, read, grep, edit, test,
speak — advances a rolling todo list, and fakes a context compaction once the token
counter climbs high enough. The transcript keeps its last 400 blocks.

### Developing

```
npm install
npm run compile
```

Press `F5` to launch the Extension Development Host (for working on DeepPause itself,
not for using it). `npm run watch` recompiles on save. To package: `npx @vscode/vsce package`.

### License

MIT. See the `LICENSE` file.
