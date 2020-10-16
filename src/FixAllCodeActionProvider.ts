import * as vscode from 'vscode';
import { FixAllCodeActionsCommand } from './FixAllCodeActionCommand';

const noChanges: vscode.CodeAction[] = [];

export class FixAllCodeActionProvider
  implements vscode.CodeActionProvider, vscode.Disposable {
  public static readonly fixAllCodeActionKind = vscode.CodeActionKind.SourceFixAll.append(
    'spotlessGradle'
  );

  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [FixAllCodeActionProvider.fixAllCodeActionKind],
  };

  private disposable: vscode.Disposable | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private documentSelector: vscode.DocumentSelector
  ) {
    this.context.subscriptions.push(this);
  }

  public register(): void {
    this.disposable = vscode.languages.registerCodeActionsProvider(
      this.documentSelector,
      this,
      FixAllCodeActionProvider.metadata
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
