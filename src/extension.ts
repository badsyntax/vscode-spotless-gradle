import * as vscode from 'vscode';
import { FixAllProvider } from './fixAll';
import { logger } from './logger';
import { COMMAND_FORMAT } from './commands';
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

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      LANGUAGES.map((language) => ({
        language,
        scheme: 'file',
      })),
      new FixAllProvider(),
      FixAllProvider.metadata
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_FORMAT, (document) => {
      makeSpotless(gradleTasksExtension.exports, document);
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(LANGUAGES, {
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
