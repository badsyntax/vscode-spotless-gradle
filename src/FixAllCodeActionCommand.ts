import * as vscode from 'vscode';
import { Command } from './Command';
import { logger } from './logger';
import { SpotlessDiagnostics } from './SpotlessDiagnostics';
import { SpotlessRunner } from './SpotlessRunner';

export class FixAllCodeActionsCommand implements Command {
  public static readonly Id = 'spotless-vscode-gradle.fixAllCodeActions';
  public readonly id = FixAllCodeActionsCommand.Id;

  constructor(
    private readonly spotlessRunner: SpotlessRunner,
    private readonly spotlessDiagnostics: SpotlessDiagnostics
  ) {}

  public execute = async (
    document: vscode.TextDocument,
    cancellationToken: vscode.CancellationToken
  ): Promise<void> => {
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
      vscode.workspace.applyEdit(workspaceEdit);
    } catch (e) {
      logger.error(`Unable to apply workspace edits: ${e.message}`);
    }
  };

  private getSpotlessChanges(
    document: vscode.TextDocument,
    cancellationToken: vscode.CancellationToken
  ): Promise<string | null> {
    const source = document.getText();
    const currentDiff = this.spotlessDiagnostics.getCurrentDiff();
    // Source can be different if other code actions modify the document first (eg remove whitespace on save)
    // TODO: Use a different approach to ensuring the currentDiff is not stale
    if (currentDiff && currentDiff.source === source) {
      return Promise.resolve(currentDiff.formattedSource);
    } else {
      return this.spotlessRunner.run(document, cancellationToken);
    }
  }
}
