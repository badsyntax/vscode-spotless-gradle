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

export interface SpotlessDiff {
  source: string;
  formattedSource: string;
  differences: Difference[];
}

export class SpotlessDiagnostics extends AsyncWait<void> {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly spotless: Spotless,
    private readonly spotlessRunner: SpotlessRunner
  ) {
    super();
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(
      'java'
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

    this.context.subscriptions.push(
      onReady,
      onDidChangeTextDocument,
      onDidChangeActiveTextEditor,
      this.diagnosticCollection
    );
  }

  async handleChangeTextDocument(document: vscode.TextDocument): Promise<void> {
    void this.runDiagnostics(document);
  }

  public runDiagnostics(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): void {
    // TODO: support other language types
    if (document.languageId.toLowerCase() !== this.diagnosticCollection.name) {
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
    this.diagnosticCollection.clear();
    const diagnosticMap = this.getDiagnosticMap(document, diff);
    let total = 0;
    diagnosticMap.forEach((diags, file) => {
      this.diagnosticCollection.set(vscode.Uri.parse(file), diags);
      total += diags.length;
    });
    logger.info(
      `Updated diagnostics (name: ${this.diagnosticCollection.name}) (total: ${total})`
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
    return new vscode.Diagnostic(range, message);
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
}
