import * as vscode from 'vscode';
import type { ExtensionApi as GradleTasksApi } from 'vscode-gradle';
import { FixAllProvider } from './fixAll';
import { logger } from './logger';
import { makeSpotless } from './spotless';

const LANGUAGES = ['java', 'kotlin', 'scala', 'groovy'];

export function activate(context: vscode.ExtensionContext): void {
  logger.setLoggingChannel(
    vscode.window.createOutputChannel('Spotless Gradle')
  );

  const gradleTasksExtension = vscode.extensions.getExtension(
    'richardwillis.vscode-gradle'
  );
  if (!gradleTasksExtension || !gradleTasksExtension.isActive) {
    return logger.error('Gradle Tasks extension is not active');
  }

  const gradleApi = gradleTasksExtension.exports as GradleTasksApi;

  const documentSelectors = LANGUAGES.map((language) => ({
    language,
    scheme: 'file',
  }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      documentSelectors,
      new FixAllProvider(gradleApi),
      FixAllProvider.metadata
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(documentSelectors, {
      async provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): Promise<vscode.TextEdit[]> {
        const newText = await makeSpotless(gradleApi, document);
        if (newText) {
          const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          return [new vscode.TextEdit(range, newText)];
        } else {
          return [];
        }
      },
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
