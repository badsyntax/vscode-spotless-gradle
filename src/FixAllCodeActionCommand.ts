import * as vscode from 'vscode';
import { Command } from './Command';
import { logger } from './logger';
import { SpotlessRunner } from './SpotlessRunner';

export class FixAllCodeActionsCommand implements Command {
  public static readonly Id = 'vscode-spotless-gradle.fixAllCodeActions';
  public readonly id = FixAllCodeActionsCommand.Id;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly spotlessRunner: SpotlessRunner
  ) {}

  public register(): void {
    this.context.subscriptions.push(
      vscode.commands.registerCommand(this.id, this.execute)
    );
  }

  public execute = async (
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<void> => {
    try {
      const spotlessChanges = await this.getSpotlessChanges(
        document,
        cancellationToken
      );
      if (cancellationToken?.isCancellationRequested) {
        logger.warning('Spotless formatting cancelled');
        return;
      }
      if (!spotlessChanges) {
        return;
      }
      const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      const workspaceEdit = new vscode.WorkspaceEdit();
      workspaceEdit.replace(document.uri, range, spotlessChanges);
      await vscode.workspace.applyEdit(workspaceEdit);
    } catch (e) {
      logger.error(`Unable to apply workspace edits: ${e.message}`);
    }
  };

  private getSpotlessChanges(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string | null> {
    return this.spotlessRunner.run(document, cancellationToken);
  }
}
