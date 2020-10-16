import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { ExtensionApi as GradleApi } from 'vscode-gradle';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { logger, Logger } from './logger';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import { Spotless } from './Spotless';
import {
  GRADLE_TASKS_EXTENSION_ID,
  SUPPORTED_LANGUAGES,
  OUTPUT_CHANNEL_ID,
} from './constants';
import { DependencyChecker } from './DependencyChecker';
import { SpotlessDiagnostics } from './SpotlessDiagnostics';
import { SpotlessRunner } from './SpotlessRunner';
import { FixAllCodeActionsCommand } from './FixAllCodeActionCommand';

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
  if (!gradleTasksExtension || !gradleTasksExtension.isActive) {
    throw new Error('Gradle Tasks extension is not installed/active');
  }

  const knownLanguages = await vscode.languages.getLanguages();

  // TODO:
  const spotlessLanguages = SUPPORTED_LANGUAGES.filter((language) =>
    knownLanguages.includes(language)
  );
  const documentSelector = spotlessLanguages.map((language) => ({
    language,
    scheme: 'file',
  }));

  const gradleApi = gradleTasksExtension.exports as GradleApi;
  const spotless = new Spotless(gradleApi);
  const spotlessRunner = new SpotlessRunner(spotless);

  const spotlessDiagnostics = new SpotlessDiagnostics(
    context,
    spotless,
    spotlessRunner,
    spotlessLanguages
  );

  const fixAllCodeActionsCommand = new FixAllCodeActionsCommand(spotlessRunner);

  const fixAllCodeActionProvider = new FixAllCodeActionProvider(
    context,
    fixAllCodeActionsCommand,
    documentSelector
  );
  const documentFormattingEditProvider = new DocumentFormattingEditProvider(
    context,
    spotlessRunner,
    documentSelector
  );

  spotlessDiagnostics.register();
  fixAllCodeActionProvider.register();
  documentFormattingEditProvider.register();

  return { logger, spotless };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
