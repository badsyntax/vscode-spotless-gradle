import * as vscode from 'vscode';
import { logger } from './logger';
import { SpotlessDiagnostics } from './SpotlessDiagnostics';
import { SpotlessRunner } from './SpotlessRunner';

const noChanges: vscode.CodeAction[] = [];

export class FixAllCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly fixAllCodeActionKind = vscode.CodeActionKind.SourceFixAll.append(
    'spotlessGradle'
  );

  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [FixAllCodeActionProvider.fixAllCodeActionKind],
  };

  constructor(
    private readonly spotlessRunner: SpotlessRunner,
    private readonly spotlessDiagnostics: SpotlessDiagnostics
  ) {}

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
      const spotlessChanges = await this.getSpotlessChanges(
        document,
        cancellationToken
      );
      if (!spotlessChanges) {
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
      action.edit.replace(document.uri, range, spotlessChanges);
      action.isPreferred = true;

      logger.info('Created fixAll code action');

      return [action];
    } catch (e) {
      logger.error(`Unable to apply code action: ${e.message}`);
      return noChanges;
    }
  }

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
