import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { ExtensionApi as GradleApi } from 'vscode-gradle';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { logger, Logger } from './logger';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import { Spotless } from './Spotless';
import { GRADLE_TASKS_EXTENSION_ID, OUTPUT_CHANNEL_ID } from './constants';
import { DependencyChecker } from './DependencyChecker';
import { SpotlessDiagnostics } from './SpotlessDiagnostics';
import { SpotlessRunner } from './SpotlessRunner';
import { FixAllCodeActionsCommand } from './FixAllCodeActionCommand';
import { getDocumentSelector } from './documentSelector';

export interface ExtensionApi {
  logger: Logger;
  spotless: Spotless;
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<ExtensionApi | undefined> {
  logger.setLoggingChannel(
    vscode.window.createOutputChannel(OUTPUT_CHANNEL_ID)
  );

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
  if (!gradleTasksExtension || !gradleTasksExtension.isActive) {
    throw new Error('Gradle Tasks extension is not installed/active');
  }

  const gradleApi = gradleTasksExtension.exports as GradleApi;
  const spotless = new Spotless(gradleApi);
  const spotlessRunner = new SpotlessRunner(spotless);
  const documentSelector = await getDocumentSelector();

  const spotlessDiagnostics = new SpotlessDiagnostics(
    context,
    spotless,
    spotlessRunner,
    documentSelector
  );

  const fixAllCodeActionsCommand = new FixAllCodeActionsCommand(
    context,
    spotlessRunner
  );

  const fixAllCodeActionProvider = new FixAllCodeActionProvider(
    context,
    documentSelector
  );

  const documentFormattingEditProvider = new DocumentFormattingEditProvider(
    context,
    spotlessRunner,
    documentSelector
  );

  fixAllCodeActionsCommand.register();
  spotlessDiagnostics.register();
  fixAllCodeActionProvider.register();
  documentFormattingEditProvider.register();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(
      async (event: vscode.ConfigurationChangeEvent) => {
        if (
          event.affectsConfiguration('spotlessGradle.format') ||
          event.affectsConfiguration('spotlessGradle.diagnostics')
        ) {
          const documentSelector = await getDocumentSelector();
          spotlessDiagnostics.setDocumentSelector(documentSelector);
          fixAllCodeActionProvider.setDocumentSelector(documentSelector);
          documentFormattingEditProvider.setDocumentSelector(documentSelector);
        }
        if (event.affectsConfiguration('spotlessGradle.diagnostics')) {
          spotlessDiagnostics.reset();
        }
      }
    )
  );

  return { logger, spotless };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
