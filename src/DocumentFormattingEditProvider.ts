import * as vscode from 'vscode';

import { makeSpotless } from './spotless';
import { FormattingProvider } from './FormattingProvider';
import { logger } from './logger';

export class DocumentFormattingEditProvider extends FormattingProvider
  implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    token.onCancellationRequested(() => {
      logger.warning('Spotless formatting cancelled');
      this._onCancelled.fire(null);
    });
    try {
      const newText = await makeSpotless(this.gradleApi, document);
      if (newText && !token.isCancellationRequested) {
        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        return [new vscode.TextEdit(range, newText)];
      }
      return [];
    } catch (e) {
      logger.error('Unable to apply formatting:', e.message);
      return [];
    }
  }
}
