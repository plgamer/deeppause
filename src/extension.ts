import * as vscode from 'vscode';
import { SessionPanel } from './panel';
import { Session } from './session';
import { SessionViewProvider } from './view';

export function activate(ctx: vscode.ExtensionContext) {
  const view = new SessionViewProvider(ctx);

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SessionViewProvider.viewId, view, {
      webviewOptions: { retainContextWhenHidden: true }
    }),

    vscode.commands.registerCommand('deeppause.open', () => SessionPanel.show(ctx)),
    vscode.commands.registerCommand('deeppause.focusView', () =>
      vscode.commands.executeCommand(`${SessionViewProvider.viewId}.focus`)
    ),
    vscode.commands.registerCommand('deeppause.panic', () => {
      Session.each(s => s.interrupt());
      SessionPanel.close();
      if (view.visible) void vscode.commands.executeCommand('workbench.action.closeSidebar');
    }),
    vscode.commands.registerCommand('deeppause.interrupt', () => Session.each(s => s.interrupt()))
  );
}

export function deactivate() {}
