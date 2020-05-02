import * as vscode from 'vscode';
import { COMMAND_FORMAT } from './commands';

export class FixAllProvider implements vscode.CodeActionProvider {
  public static readonly fixAllCodeActionKind = vscode.CodeActionKind.SourceFixAll.append(
    'spotlessGradle'
  );

  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [FixAllProvider.fixAllCodeActionKind],
  };

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

    const title = 'Format code using Spotless';
    const action = new vscode.CodeAction(
      title,
      FixAllProvider.fixAllCodeActionKind
    );
    action.command = {
      command: COMMAND_FORMAT,
      title,
      arguments: [document],
    };
    action.isPreferred = true;

    return [action];
  }
}
