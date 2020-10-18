import * as vscode from 'vscode';
import {
  Difference,
  generateDifferences,
  showInvisibles,
} from 'prettier-linter-helpers';
import { Spotless } from './Spotless';
import { logger } from './logger';
import { SpotlessRunner } from './SpotlessRunner';
import { AsyncWait } from './AsyncWait';
import { FixAllCodeActionsCommand } from './FixAllCodeActionCommand';
import { DIAGNOSTICS_ID, DIAGNOSTICS_SOURCE_ID } from './constants';
import { Disposables } from './Disposables';

export interface SpotlessDiff {
  source: string;
  formattedSource: string;
  differences: Difference[];
}

export class SpotlessDiagnostics
  extends AsyncWait<void>
  implements vscode.CodeActionProvider, vscode.Disposable {
  public static readonly quickFixCodeActionKind = vscode.CodeActionKind.QuickFix.append(
    'spotlessGradle'
  );
  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [SpotlessDiagnostics.quickFixCodeActionKind],
  };

  private disposables = new Disposables();
  private diagnosticCollection: vscode.DiagnosticCollection;
  private diagnosticDifferenceMap: Map<
    vscode.Diagnostic,
    Difference
  > = new Map();
  private codeActionsProvider: vscode.Disposable | undefined;

  constructor(
    private readonly spotless: Spotless,
    private readonly spotlessRunner: SpotlessRunner,
    private documentSelector: Array<vscode.DocumentFilter>
  ) {
    super();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(
      DIAGNOSTICS_ID
    );
  }

  public register(): void {
    this.registerCodeActionsProvider();
    this.registerEditorEvents();
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
    this.codeActionsProvider?.dispose();
    this.disposables.dispose();
  }

  public reset(): void {
    this.diagnosticCollection.clear();
    this.diagnosticDifferenceMap.clear();
  }

  public setDocumentSelector(
    documentSelector: Array<vscode.DocumentFilter>
  ): void {
    this.documentSelector = documentSelector;
    this.reset();
    this.codeActionsProvider?.dispose();
    this.registerCodeActionsProvider();
  }

  private handleChangeTextDocument(document: vscode.TextDocument): void {
    void this.runDiagnostics(document);
  }

  public async runDiagnostics(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<void> {
    const shouldRunDiagnostics =
      this.spotless.isReady &&
      this.documentSelector.find(
        (selector) => selector.language === document.languageId
      ) &&
      vscode.workspace.getWorkspaceFolder(document.uri);
    if (shouldRunDiagnostics) {
      this.waitAndRun(async () => {
        try {
          const diff = await this.getDiff(document, cancellationToken);
          this.updateDiagnostics(document, diff);
        } catch (e) {
          logger.error(`Unable to provide diagnostics: ${e.message}`);
        }
      });
    }
  }

  public updateDiagnostics(
    document: vscode.TextDocument,
    diff: SpotlessDiff
  ): void {
    const diagnostics = this.getDiagnostics(document, diff);
    this.diagnosticCollection.set(document.uri, diagnostics);
    logger.info(
      `Updated diagnostics (language: ${document.languageId}) (total: ${diagnostics.length})`
    );
  }

  private registerEditorEvents(): void {
    this.spotless.onReady((isReady: boolean) => {
      if (isReady) {
        const activeDocument = vscode.window.activeTextEditor?.document;
        if (activeDocument) {
          void this.runDiagnostics(activeDocument);
        }
      }
    });

    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
      (e: vscode.TextDocumentChangeEvent) => {
        if (
          e.contentChanges.length &&
          vscode.window.activeTextEditor?.document === e.document
        ) {
          this.handleChangeTextDocument(e.document);
        }
      }
    );

    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(
      (editor?: vscode.TextEditor) => {
        if (editor) {
          void this.runDiagnostics(editor.document);
        }
      }
    );

    this.disposables.add(
      onDidChangeTextDocument,
      onDidChangeActiveTextEditor,
      this.diagnosticCollection
    );
  }

  private registerCodeActionsProvider(): void {
    this.codeActionsProvider = vscode.languages.registerCodeActionsProvider(
      this.documentSelector,
      this,
      SpotlessDiagnostics.metadata
    );
  }

  private getDiagnostics(
    document: vscode.TextDocument,
    diff: SpotlessDiff
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    for (const difference of diff.differences) {
      const diagnostic = this.getDiagnostic(document, difference);
      this.diagnosticDifferenceMap.set(diagnostic, difference);
      diagnostics.push(diagnostic);
    }
    return diagnostics;
  }

  private getDiagnostic(
    document: vscode.TextDocument,
    difference: Difference
  ): vscode.Diagnostic {
    const range = this.getRange(document, difference);
    const message = this.getMessage(difference);
    const diagnostic = new vscode.Diagnostic(range, message);
    diagnostic.source = DIAGNOSTICS_ID;
    diagnostic.code = DIAGNOSTICS_SOURCE_ID;
    return diagnostic;
  }

  private getMessage(difference: Difference): string {
    switch (difference.operation) {
      case generateDifferences.INSERT:
        return `Insert ${showInvisibles(difference.insertText!)}`;
      case generateDifferences.REPLACE:
        return `Replace ${showInvisibles(
          difference.deleteText!
        )} with ${showInvisibles(difference.insertText!)}`;
      case generateDifferences.DELETE:
        return `Delete ${showInvisibles(difference.deleteText!)}`;
      default:
        return '';
    }
  }

  private getRange(
    document: vscode.TextDocument,
    difference: Difference
  ): vscode.Range {
    if (difference.operation === generateDifferences.INSERT) {
      const start = document.positionAt(difference.offset);
      return new vscode.Range(
        start.line,
        start.character,
        start.line,
        start.character
      );
    }
    const start = document.positionAt(difference.offset);
    const end = document.positionAt(
      difference.offset + difference.deleteText!.length
    );
    return new vscode.Range(
      start.line,
      start.character,
      end.line,
      end.character
    );
  }

  private async getDiff(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<SpotlessDiff> {
    const source = document.getText();
    const formattedSource =
      (await this.spotlessRunner.run(document, cancellationToken)) || source;
    const differences = generateDifferences(source, formattedSource);
    return {
      source,
      formattedSource,
      differences,
    };
  }

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): vscode.CodeAction[] {
    let totalDiagnostics = 0;
    const codeActions: vscode.CodeAction[] = [];
    this.diagnosticCollection.forEach(
      (uri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]) => {
        if (document.uri.fsPath !== uri.fsPath) {
          return;
        }
        diagnostics.forEach((diagnostic: vscode.Diagnostic) => {
          totalDiagnostics += 1;
          if (!range.isEqual(diagnostic.range)) {
            return;
          }
          const difference = this.diagnosticDifferenceMap.get(diagnostic);
          codeActions.push(
            this.getQuickFixCodeAction(document.uri, diagnostic, difference!)
          );
        });
      }
    );
    if (totalDiagnostics > 1) {
      codeActions.push(
        this.getQuickFixAllProblemsCodeAction(document, totalDiagnostics)
      );
    }
    return codeActions;
  }

  private getQuickFixCodeAction(
    uri: vscode.Uri,
    diagnostic: vscode.Diagnostic,
    difference: Difference
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Fix this ${DIAGNOSTICS_ID} problem`,
      SpotlessDiagnostics.quickFixCodeActionKind
    );
    action.edit = new vscode.WorkspaceEdit();
    if (difference.operation === generateDifferences.INSERT) {
      action.edit.insert(uri, diagnostic.range.start, difference.insertText!);
    } else if (difference.operation === generateDifferences.REPLACE) {
      action.edit.replace(uri, diagnostic.range, difference.insertText!);
    } else if (difference.operation === generateDifferences.DELETE) {
      action.edit.delete(uri, diagnostic.range);
    }
    return action;
  }

  private getQuickFixAllProblemsCodeAction(
    document: vscode.TextDocument,
    totalDiagnostics: number
  ): vscode.CodeAction {
    const title = `Fix all ${DIAGNOSTICS_ID} problems (${totalDiagnostics})`;
    const action = new vscode.CodeAction(
      title,
      SpotlessDiagnostics.quickFixCodeActionKind
    );
    action.command = {
      title,
      command: FixAllCodeActionsCommand.Id,
      arguments: [document],
    };
    return action;
  }
}
