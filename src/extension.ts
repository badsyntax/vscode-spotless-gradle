import * as vscode from 'vscode';
import { FixAllProvider } from './fixAll';
import { logger } from './logger';
import { COMMAND_FORMAT_ON_SAVE } from './commands';
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

  const documentSelectors = LANGUAGES.map((language) => ({
    language,
    scheme: 'file',
  }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      documentSelectors,
      new FixAllProvider(),
      FixAllProvider.metadata
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_FORMAT_ON_SAVE, (document) => {
      const disposable = vscode.workspace.onDidSaveTextDocument(
        (documentSaved) => {
          if (documentSaved === document) {
            disposable.dispose();
            makeSpotless(gradleTasksExtension.exports, document);
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(documentSelectors, {
      async provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): Promise<null> {
        return makeSpotless(gradleTasksExtension.exports, document);
      },
    })
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
