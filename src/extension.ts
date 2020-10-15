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
  // vscode should be checking this for us (via `extensionDependencies`), but
  // we're also doing this as a type-check.
  if (!gradleTasksExtension || !gradleTasksExtension.isActive) {
    throw new Error('Gradle Tasks extension is not active');
  }

  const gradleApi = gradleTasksExtension.exports as GradleApi;
  const spotless = new Spotless(gradleApi);
  const spotlessRunner = new SpotlessRunner(spotless);
  const spotlessDiagnostics = new SpotlessDiagnostics(
    context,
    spotless,
    spotlessRunner
  );

  const fixAllCodeActionProvider = new FixAllCodeActionProvider(
    spotlessRunner,
    spotlessDiagnostics
  );
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

  spotlessDiagnostics.register();

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      documentSelectors,
      fixAllCodeActionProvider,
      FixAllCodeActionProvider.metadata
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      documentSelectors,
      documentFormattingEditProvider
    )
  );

  return { logger, spotless };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
