import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { ExtensionApi as GradleApi } from 'vscode-gradle';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { logger, Logger } from './logger';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import { Spotless } from './Spotless';
import { GRADLE_FOR_JAVA_EXTENSION_ID, OUTPUT_CHANNEL_ID } from './constants';
import { DependencyChecker } from './DependencyChecker';
import { SpotlessDiagnostics } from './SpotlessDiagnostics';
import { SpotlessRunner } from './SpotlessRunner';
import { FixAllCodeActionsCommand } from './FixAllCodeActionCommand';
import { FeatureManager } from './FeatureManager';

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

  const gradleForJavaExtension = vscode.extensions.getExtension(
    GRADLE_FOR_JAVA_EXTENSION_ID
  );
  if (!gradleForJavaExtension || !gradleForJavaExtension.isActive) {
    throw new Error('Gradle for Java extension is not installed/active');
  }

  const gradleApi = gradleForJavaExtension.exports as GradleApi;
  const spotless = new Spotless(gradleApi);
  const spotlessRunner = new SpotlessRunner(spotless);
  const formatDocumentSelector: vscode.DocumentFilter[] = [];
  const diagnosticsDocumentSelector: vscode.DocumentFilter[] = [];

  const spotlessDiagnostics = new SpotlessDiagnostics(
    spotless,
    spotlessRunner,
    diagnosticsDocumentSelector
  );

  const fixAllCodeActionsCommand = new FixAllCodeActionsCommand(
    context,
    spotlessRunner
  );

  const fixAllCodeActionProvider = new FixAllCodeActionProvider(
    formatDocumentSelector
  );

  const documentFormattingEditProvider = new DocumentFormattingEditProvider(
    spotlessRunner,
    formatDocumentSelector
  );

  const featureManager = new FeatureManager(
    spotless,
    fixAllCodeActionProvider,
    documentFormattingEditProvider,
    spotlessDiagnostics
  );

  context.subscriptions.push(
    spotless,
    spotlessDiagnostics,
    fixAllCodeActionProvider,
    documentFormattingEditProvider,
    featureManager
  );

  await featureManager.register();
  spotless.register();
  fixAllCodeActionsCommand.register();
  fixAllCodeActionProvider.register();
  documentFormattingEditProvider.register();
  spotlessDiagnostics.register();

  return { logger, spotless };
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
