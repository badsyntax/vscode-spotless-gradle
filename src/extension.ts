/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { ExtensionApi as GradleApi } from 'vscode-gradle';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { logger, Logger } from './logger';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import { Spotless, SpotlessDiff } from './Spotless';
import {
  GRADLE_TASKS_EXTENSION_ID,
  SUPPORTED_LANGUAGES,
  OUTPUT_CHANNEL_ID,
} from './constants';
import { DependencyChecker } from './DependencyChecker';
import { getRange } from './util';

export interface ExtensionApi {
  logger: Logger;
  spotless: Spotless;
}

function getDiagnosticMap(
  diff: SpotlessDiff,
  document: vscode.TextDocument
): Map<string, vscode.Diagnostic[]> {
  const diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
  diff.differences.forEach((difference) => {
    const canonicalFile = document.uri.toString();
    logger.info('difference', JSON.stringify(difference, null, 2));
    const range = getRange(document, difference);
    if (range) {
      let diagnostics = diagnosticMap.get(canonicalFile);
      if (!diagnostics) {
        diagnostics = [];
      }
      diagnostics.push(new vscode.Diagnostic(range, difference.operation));
      diagnosticMap.set(canonicalFile, diagnostics);
    }
  });
  return diagnosticMap;
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<ExtensionApi | undefined> {
  logger.setLoggingChannel(
    vscode.window.createOutputChannel(OUTPUT_CHANNEL_ID)
  );

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(context.extensionPath, 'package.json'), 'utf8')
  );

  const dependencyChecker = new DependencyChecker(packageJson);
  if (!dependencyChecker.check()) {
    return;
  }

  const gradleTasksExtension = vscode.extensions.getExtension(
    GRADLE_TASKS_EXTENSION_ID
  );
  // vscode should be checking this for us (via `extensionDependencies`), but
  // we're also doing this as a type-check.
  if (!gradleTasksExtension || !gradleTasksExtension.isActive) {
    throw new Error('Gradle Tasks extension is not active');
  }

  const gradleApi = gradleTasksExtension.exports as GradleApi;
  const spotless = new Spotless(gradleApi);
  const fixAllCodeActionProvider = new FixAllCodeActionProvider(spotless);
  const documentFormattingEditProvider = new DocumentFormattingEditProvider(
    spotless
  );

  const knownLanguages = await vscode.languages.getLanguages();
  const spotlessLanguages = SUPPORTED_LANGUAGES.filter((language) =>
    knownLanguages.includes(language)
  );
  const documentSelectors = spotlessLanguages.map((language) => ({
    language,
    scheme: 'file',
  }));

  const diagnosticCollection = vscode.languages.createDiagnosticCollection(
    'java'
  );

  vscode.workspace.onDidChangeTextDocument(
    async (e: vscode.TextDocumentChangeEvent) => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        const diff = await spotless.getDiff(e.document);
        diagnosticCollection.clear();
        const diagnosticMap = getDiagnosticMap(diff, e.document);
        diagnosticMap.forEach((diags, file) => {
          diagnosticCollection.set(vscode.Uri.parse(file), diags);
        });
      }
    }
  );

  vscode.window.onDidChangeActiveTextEditor((editor?: vscode.TextEditor) => {
    console.log('', editor);
  });

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      documentSelectors,
      fixAllCodeActionProvider,
      FixAllCodeActionProvider.metadata
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      documentSelectors,
      documentFormattingEditProvider
    ),
    diagnosticCollection
  );

  return { logger, spotless };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
