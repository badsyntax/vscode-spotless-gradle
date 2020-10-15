import * as vscode from 'vscode';
import { FixAllCodeActionsCommand } from './FixAllCodeActionCommand';

const noChanges: vscode.CodeAction[] = [];

export class FixAllCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly fixAllCodeActionKind = vscode.CodeActionKind.SourceFixAll.append(
    'spotlessGradle'
  );

  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [FixAllCodeActionProvider.fixAllCodeActionKind],
  };

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly fixAllCodeActionsCommand: FixAllCodeActionsCommand
  ) {
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        this.fixAllCodeActionsCommand.id,
        this.fixAllCodeActionsCommand.execute
      )
    );
  }

  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    cancellationToken: vscode.CancellationToken
  ): vscode.CodeAction[] {
    if (!context.only) {
      return noChanges;
    }
    if (
      !context.only.contains(FixAllCodeActionProvider.fixAllCodeActionKind) &&
      !FixAllCodeActionProvider.fixAllCodeActionKind.contains(context.only)
    ) {
      return noChanges;
    }
    const title = 'Format code using Spotless';
    const action = new vscode.CodeAction(
      title,
      FixAllCodeActionProvider.fixAllCodeActionKind
    );
    action.command = {
      title,
      command: FixAllCodeActionsCommand.Id,
      arguments: [document, cancellationToken],
    };
    return [action];
  }
}
