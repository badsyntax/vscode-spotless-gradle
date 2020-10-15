import * as vscode from 'vscode';
import {
  Difference,
  generateDifferences,
  showInvisibles,
} from 'prettier-linter-helpers';
import { Spotless } from './Spotless';
import { logger } from './logger';
import { debounce } from './util';
import { SpotlessRunner } from './SpotlessRunner';

const DIAGNOSTICS_UPDATES_DEBOUNCE_MS = 0;

export interface SpotlessDiff {
  source: string;
  formattedSource: string;
  differences: Difference[];
}

export class SpotlessDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private getDiffPromise: Promise<SpotlessDiff> | undefined;
  private currentDiff: SpotlessDiff | undefined;
  private diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
  private isStale = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly spotless: Spotless,
    private readonly spotlessRunner: SpotlessRunner
  ) {
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
          vscode.window.activeTextEditor?.document === e.document &&
          e.document.languageId.toLowerCase() === this.diagnosticCollection.name
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

  @debounce(DIAGNOSTICS_UPDATES_DEBOUNCE_MS)
  async handleChangeTextDocument(document: vscode.TextDocument): Promise<void> {
    // TODO: prevent diagnostics if run after applying formatting
    void this.runDiagnostics(document);
  }

  public async runDiagnostics(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<SpotlessDiff | undefined> {
    // There's already a diagnostic session running, mark the current one as stale
    if (this.getDiffPromise) {
      this.isStale = true;
    } else {
      try {
        this.getDiffPromise = this.getDiff(document, cancellationToken);
        const diff = await this.getDiffPromise;
        this.getDiffPromise = undefined;
        // if this diagnostic session is stale (a new one started before this one completed)
        // then run the diagnostics again
        if (this.isStale) {
          this.isStale = false;
          return this.runDiagnostics(document, cancellationToken);
        }
        this.updateDiagnostics(document, diff);
        return diff;
      } catch (e) {
        logger.error(
          `Unable to update diagnostics for ${this.diagnosticCollection.name}: ${e.message}`
        );
        this.getDiffPromise = undefined;
      }
    }
  }

  public updateDiagnostics(
    document: vscode.TextDocument,
    diff: SpotlessDiff
  ): void {
    this.currentDiff = diff;
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

  public getCurrentDiff(): SpotlessDiff | undefined {
    return this.currentDiff;
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
