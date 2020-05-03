import * as vscode from 'vscode';
import { ExtensionApi as GradleTasksApi } from 'vscode-gradle';
import { logger } from './logger';
import { makeSpotless } from './spotless';

export class FixAllProvider implements vscode.CodeActionProvider {
  public static readonly fixAllCodeActionKind = vscode.CodeActionKind.SourceFixAll.append(
    'spotlessGradle'
  );

  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [FixAllProvider.fixAllCodeActionKind],
  };

  constructor(private readonly gradleApi: GradleTasksApi) {}

  public async provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): Promise<vscode.CodeAction[]> {
    if (!context.only) {
      return [];
    }

    if (
      !context.only.contains(FixAllProvider.fixAllCodeActionKind) &&
      !FixAllProvider.fixAllCodeActionKind.contains(context.only)
    ) {
      return [];
    }

    try {
      const newText = await makeSpotless(this.gradleApi, document);

      if (newText) {
        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length - 1)
        );
        const title = 'Format code using Spotless';
        const action = new vscode.CodeAction(
          title,
          FixAllProvider.fixAllCodeActionKind
        );
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, range, newText);
        action.isPreferred = true;

        return [action];
      } else {
        return [];
      }
    } catch (e) {
      logger.error('Unable to apply code action:', e.message);
      return [];
    }
  }
}
