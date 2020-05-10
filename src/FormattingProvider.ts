import * as vscode from 'vscode';
import type { ExtensionApi as GradleApi } from 'vscode-gradle';

export class FormattingProvider implements vscode.Disposable {
  protected readonly _onCancelled: vscode.EventEmitter<
    null
  > = new vscode.EventEmitter<null>();
  public readonly onCancelled: vscode.Event<null> = this._onCancelled.event;

  constructor(protected readonly gradleApi: GradleApi) {}

  public dispose(): void {
    this._onCancelled.dispose();
  }
}
