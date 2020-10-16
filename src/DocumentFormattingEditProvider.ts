import * as vscode from 'vscode';

import { logger } from './logger';
import { SpotlessRunner } from './SpotlessRunner';

const noChanges: vscode.TextEdit[] = [];

export class DocumentFormattingEditProvider
  implements vscode.DocumentFormattingEditProvider, vscode.Disposable {
  private disposable: vscode.Disposable | undefined;

  constructor(
    private readonly spotlessRunner: SpotlessRunner,
    private documentSelector: vscode.DocumentSelector
  ) {}

  public register(): void {
    this.disposable = vscode.languages.registerDocumentFormattingEditProvider(
      this.documentSelector,
      this
    );
  }

  public dispose(): void {
    this.disposable?.dispose();
  }

  public setDocumentSelector(documentSelector: vscode.DocumentSelector): void {
    this.documentSelector = documentSelector;
    this.dispose();
    this.register();
  }

  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    cancellationToken: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    try {
      const newText = await this.spotlessRunner.run(
        document,
        cancellationToken
      );
      if (!newText) {
        return noChanges;
      }
      const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      return [new vscode.TextEdit(range, newText)];
    } catch (e) {
      logger.error(`Unable to apply formatting: ${e.message}`);
      return noChanges;
    }
  }
}
