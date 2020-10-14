import * as vscode from 'vscode';
import { Difference, generateDifferences } from 'prettier-linter-helpers';
import { Spotless } from './Spotless';
import { logger } from './logger';
import { debounce, getDiagnosticMap } from './util';

export const DIAGNOSTICS_UPDATES_DEBOUNCE_MS = 360;

export interface SpotlessDiff {
  source: string;
  formattedSource: string;
  differences: Difference[];
}

export class SpotlessDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private getDiffPromise: Promise<SpotlessDiff> | undefined = undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly spotless: Spotless
  ) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(
      'java'
    );
  }

  public register(): void {
    const onReady = this.spotless.onReady(() => {
      const activeDocument = vscode.window.activeTextEditor?.document;
      if (activeDocument) {
        void this.updateDiagnostics(activeDocument);
      }
    });
    this.context.subscriptions.push(
      onReady,
      vscode.workspace.onDidChangeTextDocument(
        (e: vscode.TextDocumentChangeEvent) => {
          void this.handleChangeTextDocument(e);
        }
      ),
      this.diagnosticCollection
    );
  }

  @debounce(DIAGNOSTICS_UPDATES_DEBOUNCE_MS)
  async handleChangeTextDocument(
    e: vscode.TextDocumentChangeEvent
  ): Promise<void> {
    if (vscode.window.activeTextEditor?.document === e.document) {
      void this.updateDiagnostics(e.document);
    }
  }

  private async updateDiagnostics(
    document: vscode.TextDocument
  ): Promise<void> {
    try {
      this.getDiffPromise = this.getDiffPromise || this.getDiff(document);
      const diff = await this.getDiffPromise;
      logger.info('Updating diagnostics');
      this.diagnosticCollection.clear();
      const diagnosticMap = getDiagnosticMap(diff, document);
      diagnosticMap.forEach((diags, file) =>
        this.diagnosticCollection.set(vscode.Uri.parse(file), diags)
      );
    } catch (e) {
      logger.error(`Unable to update diagnostics: ${e.message}`);
    } finally {
      this.getDiffPromise = undefined;
    }
  }

  private async getDiff(document: vscode.TextDocument): Promise<SpotlessDiff> {
    const source = document.getText();
    const formattedSource = (await this.spotless.apply(document)) || source;
    const differences = generateDifferences(source, formattedSource);
    return {
      source,
      formattedSource,
      differences,
    };
  }
}
