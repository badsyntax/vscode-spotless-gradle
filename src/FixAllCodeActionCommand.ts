import * as vscode from 'vscode';
import { Command } from './Command';
import { hasSpotlessTaskForLanguage } from './Features';
import { logger } from './logger';
import { SpotlessRunner } from './SpotlessRunner';

export class FixAllCodeActionsCommand implements Command {
  public static readonly Id = 'vscode-spotless-gradle.fixAllCodeActions';
  public readonly id = FixAllCodeActionsCommand.Id;

  constructor(private readonly spotlessRunner: SpotlessRunner) {}

  public execute = async (
    document: vscode.TextDocument,
    cancellationToken: vscode.CancellationToken
  ): Promise<void> => {
    if (!(await hasSpotlessTaskForLanguage(document.languageId))) {
      // TODO: move this logic to the documentSelectors
      // logger.warning(`Skipping code actions, no spotless task found for: ${document.languageId}`);
      return;
    }
    try {
      const spotlessChanges = await this.getSpotlessChanges(
        document,
        cancellationToken
      );
      if (!spotlessChanges || cancellationToken.isCancellationRequested) {
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
    cancellationToken: vscode.CancellationToken
  ): Promise<string | null> {
    return this.spotlessRunner.run(document, cancellationToken);
  }
}
