import * as vscode from 'vscode';
import { Session, sessionWebviewOptions } from './session';

/** The session hosted in an editor tab. At most one exists at a time. */
export class SessionPanel {
  static current: SessionPanel | undefined;

  private session: Session;

  private constructor(private panel: vscode.WebviewPanel, ctx: vscode.ExtensionContext) {
    this.session = new Session(panel.webview, ctx);
    panel.onDidDispose(() => {
      this.session.dispose();
      SessionPanel.current = undefined;
    });
  }

  static show(ctx: vscode.ExtensionContext) {
    if (SessionPanel.current) {
      SessionPanel.current.panel.reveal(vscode.ViewColumn.Active);
      return;
    }
    const cfg = vscode.workspace.getConfiguration('deeppause');
    const panel = vscode.window.createWebviewPanel(
      'deeppause.session',
      cfg.get<string>('agentName') || 'DeepPause',
      vscode.ViewColumn.Active,
      { ...sessionWebviewOptions(ctx.extensionUri), retainContextWhenHidden: true }
    );
    SessionPanel.current = new SessionPanel(panel, ctx);
  }

  static close() {
    SessionPanel.current?.panel.dispose();
  }
}
