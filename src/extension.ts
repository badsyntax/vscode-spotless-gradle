import * as vscode from 'vscode';
import type { ExtensionApi as GradleApi } from 'vscode-gradle';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { logger } from './logger';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import { Spotless } from './Spotless';
import {
  GRADLE_TASKS_EXTENSION_ID,
  SUPPORTED_LANGUAGES,
  OUTPUT_CHANNEL_ID,
} from './constants';

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  logger.setLoggingChannel(
    vscode.window.createOutputChannel(OUTPUT_CHANNEL_ID)
  );

  const gradleTasksExtension = vscode.extensions.getExtension(
    GRADLE_TASKS_EXTENSION_ID
  );
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
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
