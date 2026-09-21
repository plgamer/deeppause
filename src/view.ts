import * as vscode from 'vscode';
import { Session, sessionWebviewOptions } from './session';

/**
 * The session hosted in the activity-bar sidebar. Clicking the DeepPause icon
 * lands straight in a live session — no command palette detour.
 */
export class SessionViewProvider implements vscode.WebviewViewProvider {
  static readonly viewId = 'deeppause.sessionView';
  static current: SessionViewProvider | undefined;

  private view: vscode.WebviewView | undefined;

  constructor(private ctx: vscode.ExtensionContext) {
    SessionViewProvider.current = this;
  }

  /** True while the sidebar is open on our view — `panic` uses this to decide
   *  whether hiding the sidebar is part of hiding everything. */
  get visible() { return this.view?.visible === true; }

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    view.webview.options = sessionWebviewOptions(this.ctx.extensionUri);

    const session = new Session(view.webview, this.ctx);
    view.onDidDispose(() => {
      session.dispose();
      if (this.view === view) this.view = undefined;
    });
  }
}
