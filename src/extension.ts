import * as vscode from 'vscode';
import type { ExtensionApi as GradleTasksApi } from 'vscode-gradle';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { logger } from './logger';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';

const SUPPORTED_LANGUAGES = ['java', 'kotlin', 'scala', 'groovy'];
const GRADLE_TASKS_EXTENSION = 'richardwillis.vscode-gradle';

export interface ExtensionApi {
  fixAllProvider: FixAllCodeActionProvider;
  documentFormattingEditProvider: DocumentFormattingEditProvider;
}

export function activate(context: vscode.ExtensionContext): ExtensionApi {
  logger.setLoggingChannel(
    vscode.window.createOutputChannel('Spotless Gradle')
  );

  const gradleTasksExtension = vscode.extensions.getExtension(
    GRADLE_TASKS_EXTENSION
  );
  if (!gradleTasksExtension || !gradleTasksExtension.isActive) {
    throw new Error('Gradle Tasks extension is not active');
  }

  const gradleApi = gradleTasksExtension.exports as GradleTasksApi;

  const fixAllProvider = new FixAllCodeActionProvider(gradleApi);
  const documentFormattingEditProvider = new DocumentFormattingEditProvider(
    gradleApi
  );

  const documentSelectors = SUPPORTED_LANGUAGES.map((language) => ({
    language,
    scheme: 'file',
  }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      documentSelectors,
      fixAllProvider,
      FixAllCodeActionProvider.metadata
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      documentSelectors,
      documentFormattingEditProvider
    ),
    fixAllProvider,
    documentFormattingEditProvider
  );

  return {
    documentFormattingEditProvider,
    fixAllProvider,
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
