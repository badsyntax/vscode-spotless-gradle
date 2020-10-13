/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { ExtensionApi as GradleApi } from 'vscode-gradle';
// import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { logger, Logger } from './logger';
// import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import { getSpotless, Spotless } from './Spotless';
import {
  GRADLE_TASKS_EXTENSION_ID,
  // GRADLE_TASKS_EXTENSION_ID,
  // SUPPORTED_LANGUAGES,
  OUTPUT_CHANNEL_ID,
  SUPPORTED_LANGUAGES,
} from './constants';
import { DependencyChecker } from './DependencyChecker';

export interface ExtensionApi {
  logger: Logger;
  spotless: Spotless;
}

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient';
// import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
// import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';

let client: LanguageClient;

export async function activate(
  context: vscode.ExtensionContext
): Promise<ExtensionApi | void> {
  logger.setLoggingChannel(
    vscode.window.createOutputChannel(OUTPUT_CHANNEL_ID)
  );

  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
    },
  };

  client = new LanguageClient(
    'spotlessGradle',
    'Language Server Example',
    serverOptions,
    clientOptions
  );
  client.start();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // const packageJson = JSON.parse(
  //   fs.readFileSync(path.join(context.extensionPath, 'package.json'), 'utf8')
  // );

  // const dependencyChecker = new DependencyChecker(packageJson);
  // if (!dependencyChecker.check()) {
  //   return;
  // }

  // const spotless = await getSpotless();
  // const fixAllCodeActionProvider = new FixAllCodeActionProvider(spotless);
  // const documentFormattingEditProvider = new DocumentFormattingEditProvider(
  //   spotless
  // );

  // const knownLanguages = await vscode.languages.getLanguages();
  // const spotlessLanguages = SUPPORTED_LANGUAGES.filter((language) =>
  //   knownLanguages.includes(language)
  // );
  // const documentSelectors = spotlessLanguages.map((language) => ({
  //   language,
  //   scheme: 'file',
  // }));

  // context.subscriptions.push(
  //   vscode.languages.registerCodeActionsProvider(
  //     documentSelectors,
  //     fixAllCodeActionProvider,
  //     FixAllCodeActionProvider.metadata
  //   ),
  //   vscode.languages.registerDocumentFormattingEditProvider(
  //     documentSelectors,
  //     documentFormattingEditProvider
  //   )
  // );

  // return { logger, spotless };
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
