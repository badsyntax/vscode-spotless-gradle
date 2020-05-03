import * as vscode from 'vscode';
import { ExtensionApi as GradleTasksApi } from 'vscode-gradle';
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

  const documentSelectors: vscode.DocumentSelector = LANGUAGES.map(
    (language) => ({
      language,
      scheme: 'file',
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      documentSelectors,
      new FixAllProvider(gradleTasksExtension.exports as GradleTasksApi),
      FixAllProvider.metadata
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(documentSelectors, {
      async provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): Promise<vscode.TextEdit[]> {
        const newText = await makeSpotless(
          gradleTasksExtension.exports,
          document
        );
        if (newText) {
          const range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length - 1)
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
