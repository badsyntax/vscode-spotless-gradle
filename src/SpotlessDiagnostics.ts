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
import { getConfigDiagnostics } from './config';
import { FixAllCodeActionsCommand } from './FixAllCodeActionCommand';

export interface SpotlessDiff {
  source: string;
  formattedSource: string;
  differences: Difference[];
}

export class SpotlessDiagnostics
  extends AsyncWait<void>
  implements vscode.CodeActionProvider {
  public static readonly quickFixCodeActionKind = vscode.CodeActionKind.QuickFix.append(
    'spotlessGradle'
  );
  public static metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [SpotlessDiagnostics.quickFixCodeActionKind],
  };

  private diagnosticCollection: vscode.DiagnosticCollection;
  private diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
  private diagnosticCode = 0;
  private diagnosticDifferenceMap: Map<number, Difference> = new Map();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly spotless: Spotless,
    private readonly spotlessRunner: SpotlessRunner,
    private documentSelector: Array<vscode.DocumentFilter>
  ) {
    super();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(
      'spotless-gradle'
    );
  }

  public register(): void {
    const onReady = this.spotless.onReady(() => {
      const activeDocument = vscode.window.activeTextEditor?.document;
      if (activeDocument) {
        void this.runDiagnostics(activeDocument);
      }
    });

    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
      (e: vscode.TextDocumentChangeEvent) => {
        if (
          e.contentChanges.length &&
          vscode.window.activeTextEditor?.document === e.document
        ) {
          void this.handleChangeTextDocument(e.document);
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

    const codeActionsProvider = vscode.languages.registerCodeActionsProvider(
      this.documentSelector,
      this,
      SpotlessDiagnostics.metadata
    );

    this.context.subscriptions.push(
      onReady,
      onDidChangeTextDocument,
      onDidChangeActiveTextEditor,
      codeActionsProvider,
      this.diagnosticCollection
    );
  }

  public reset(): void {
    this.diagnosticCollection.clear();
    this.diagnosticDifferenceMap.clear();
  }

  public setDocumentSelector(
    documentSelector: Array<vscode.DocumentFilter>
  ): void {
    this.documentSelector = documentSelector;
  }

  async handleChangeTextDocument(document: vscode.TextDocument): Promise<void> {
    void this.runDiagnostics(document);
  }

  public async runDiagnostics(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<void> {
    if (
      !this.documentSelector.find(
        (selector) => selector.language === document.languageId
      ) ||
      !getConfigDiagnostics(vscode.workspace.getWorkspaceFolder(document.uri)!)
    ) {
      return;
    }
    this.waitAndRun(async () => {
      try {
        const diff = await this.getDiff(document, cancellationToken);
        this.updateDiagnostics(document, diff);
      } catch (e) {
        logger.error(`Unable to provide diagnostics: ${e.message}`);
      }
    });
  }

  public updateDiagnostics(
    document: vscode.TextDocument,
    diff: SpotlessDiff
  ): void {
    this.reset();
    const diagnosticMap = this.getDiagnosticMap(document, diff);
    let totalDiagnostics = 0;
    diagnosticMap.forEach((diags, file) => {
      this.diagnosticCollection.set(vscode.Uri.parse(file), diags);
      totalDiagnostics += diags.length;
    });
    logger.info(
      `Updated diagnostics (language: ${document.languageId}) (total: ${totalDiagnostics})`
    );
  }

  private getDiagnosticMap(
    document: vscode.TextDocument,
    diff: SpotlessDiff
  ): Map<string, vscode.Diagnostic[]> {
    const canonicalFile = document.uri.toString();
    const diagnostics: vscode.Diagnostic[] = diff.differences
      .map((difference) => this.getDiagnostic(document, difference))
      .filter(Boolean);
    this.diagnosticMap.set(canonicalFile, diagnostics);
    return this.diagnosticMap;
  }

  private getDiagnostic(
    document: vscode.TextDocument,
    difference: Difference
  ): vscode.Diagnostic {
    const range = this.getRange(document, difference);
    const message = this.getMessage(difference);
    const diagnostic = new vscode.Diagnostic(range, message);
    diagnostic.source = 'spotless-gradle';
    diagnostic.code = this.diagnosticCode++;
    this.diagnosticDifferenceMap.set(diagnostic.code, difference);
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
          if (
            typeof diagnostic.code !== 'number' ||
            !range.isEqual(diagnostic.range)
          ) {
            return;
          }
          const diagnosticDifference = this.diagnosticDifferenceMap.get(
            diagnostic.code
          );
          if (!diagnosticDifference) {
            return;
          }
          codeActions.push(
            this.getQuickFixCodeAction(
              document.uri,
              diagnostic,
              diagnosticDifference
            )
          );
        });
      }
    );
    if (totalDiagnostics > 1) {
      codeActions.push(this.getQuickFixAllProblemsCodeAction(document));
    }
    return codeActions;
  }

  private getQuickFixCodeAction(
    uri: vscode.Uri,
    diagnostic: vscode.Diagnostic,
    difference: Difference
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Fix this spotless-gradle problem',
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
    document: vscode.TextDocument
  ): vscode.CodeAction {
    const title = 'Fix all spotless-gradle problems';
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
