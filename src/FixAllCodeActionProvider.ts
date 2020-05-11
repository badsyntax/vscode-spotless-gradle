import * as vscode from 'vscode';
import { logger } from './logger';
import { Spotless } from './spotless';

const noChanges: vscode.CodeAction[] = [];

export class FixAllCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly fixAllCodeActionKind = vscode.CodeActionKind.SourceFixAll.append(
    'spotlessGradle'
  );

  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [FixAllCodeActionProvider.fixAllCodeActionKind],
  };

  constructor(private readonly spotless: Spotless) {}

  public async provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    cancellationToken: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    if (!context.only) {
      return noChanges;
    }

    if (
      !context.only.contains(FixAllCodeActionProvider.fixAllCodeActionKind) &&
      !FixAllCodeActionProvider.fixAllCodeActionKind.contains(context.only)
    ) {
      return noChanges;
    }

    try {
      const newText = await this.spotless.apply(document, cancellationToken);
      if (!newText) {
        return noChanges;
      }
      const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      const title = 'Format code using Spotless';
      const action = new vscode.CodeAction(
        title,
        FixAllCodeActionProvider.fixAllCodeActionKind
      );
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(document.uri, range, newText);
      action.isPreferred = true;

      return [action];
    } catch (e) {
      logger.error('Unable to apply code action:', e.message);
      return noChanges;
    }
  }
}
