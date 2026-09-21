import * as vscode from 'vscode';
import { Engine, Ev } from './engine';
import { Facts, scanWorkspace } from './scan';

/**
 * One running transcript, bound to a webview. The webview may live in an editor
 * tab (`SessionPanel`) or in the activity-bar sidebar (`SessionViewProvider`) —
 * this class does not care which.
 */
export class Session {
  private static readonly live = new Set<Session>();

  private engine: Engine | undefined;
  private facts: Facts | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(private webview: vscode.Webview, private ctx: vscode.ExtensionContext) {
    webview.html = sessionHtml(webview, ctx.extensionUri);

    webview.onDidReceiveMessage(
      (m: any) => {
        if (m?.type === 'submit') {
          const n = Number(m.limitMs);
          void this.start(String(m.text ?? ''), Number.isFinite(n) && n > 0 ? n : undefined);
        }
        else if (m?.type === 'interrupt') this.interrupt();
        else if (m?.type === 'panic') void vscode.commands.executeCommand('deeppause.panic');
        else if (m?.type === 'ready') void this.boot();
      },
      null,
      this.disposables
    );

    Session.live.add(this);
  }

  static get count() { return Session.live.size; }
  static each(fn: (s: Session) => void) { for (const s of [...Session.live]) fn(s); }

  private cfg<T>(key: string, fallback: T): T {
    return vscode.workspace.getConfiguration('deeppause').get<T>(key) ?? fallback;
  }

  private post(e: Ev | { k: string; [x: string]: unknown }) {
    void this.webview.postMessage(e);
  }

  /** Runs once the webview signals it has mounted. */
  private async boot() {
    this.facts = await scanWorkspace(this.cfg('useWorkspaceFiles', true));
    this.post({
      k: 'init',
      agentName: this.cfg('agentName', 'DeepPause'),
      models: this.cfg<string[]>('models', ['orion-4.5']),
      accent: this.cfg('accent', '#7dd3a0'),
      cwd: this.facts.cwd
    });
  }

  private async start(prompt: string, limitMs?: number) {
    if (!prompt.trim()) return;
    if (!this.facts) this.facts = await scanWorkspace(this.cfg('useWorkspaceFiles', true));

    this.engine?.cancel();
    this.engine = new Engine(this.facts, () => this.cfg('speed', 1), e => this.post(e));
    void this.engine.run(prompt.trim(), limitMs);
  }

  interrupt() {
    this.engine?.cancel();
    this.post({ k: 'interrupted' });
  }

  pause() { this.engine?.pause(); }
  resume() { this.engine?.resume(); }

  dispose() {
    this.engine?.cancel();
    Session.live.delete(this);
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}

/** Webview options shared by both hosts. */
export function sessionWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
  };
}

export function sessionHtml(w: vscode.Webview, extensionUri: vscode.Uri): string {
  const uri = (f: string) => w.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', f));
  const nonce = Array.from({ length: 24 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[
      Math.floor(Math.random() * 62)
    ]
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${w.cspSource}; script-src 'nonce-${nonce}';" />
<link rel="stylesheet" href="${uri('main.css')}" />
<title>Session</title>
</head>
<body>
  <div id="app">
    <div id="scroll">
      <div id="banner"></div>
      <div id="transcript"></div>
      <div id="spinner" hidden></div>
    </div>
    <div id="composer">
      <div id="inputwrap">
        <span id="caret">&gt;</span>
        <textarea id="input" rows="1" spellcheck="false"
                  placeholder="Describe a task…  (enter to send, esc to interrupt)"></textarea>
      </div>
      <div id="statusline">
        <span class="sl-left">
          <select id="model" title="Model"></select>
          <span class="dot">·</span>
          <select id="limit" title="How long the run lasts">
            <option value="" selected>run: unlimited</option>
            <option value="60000">run: 1 min</option>
            <option value="300000">run: 5 min</option>
            <option value="900000">run: 15 min</option>
            <option value="1800000">run: 30 min</option>
            <option value="3600000">run: 1 hour</option>
          </select>
        </span>
        <span class="sl-right">
          <span id="ctx">context left: 98%</span>
          <span class="dot">·</span>
          <span id="mode">auto-accept edits on</span>
        </span>
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${uri('main.js')}"></script>
</body>
</html>`;
}
