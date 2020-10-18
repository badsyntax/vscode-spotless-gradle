import * as vscode from 'vscode';

export class Disposables {
  private disposables: vscode.Disposable[] = [];

  public add(...disposables: vscode.Disposable[]): void {
    this.disposables.push(...disposables);
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
