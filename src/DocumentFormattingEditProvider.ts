import * as vscode from 'vscode';

import { logger } from './logger';
import { Spotless } from './Spotless';

const noChanges: vscode.TextEdit[] = [];

export class DocumentFormattingEditProvider
  implements vscode.DocumentFormattingEditProvider {
  constructor(private readonly spotless: Spotless) {}

  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    cancellationToken: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    try {
      const newText = await this.spotless.apply(document, cancellationToken);
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
