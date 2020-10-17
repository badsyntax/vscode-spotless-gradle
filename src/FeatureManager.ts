import * as vscode from 'vscode';
import { ExtensionApi as GradleApi } from 'vscode-gradle';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import {
  getFormatDocumentSelector,
  getDiagnosticsDocumentSelector,
} from './documentSelector';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { SpotlessDiagnostics } from './SpotlessDiagnostics';

export class FeatureManager {
  private featuresEnabled = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly gradleApi: GradleApi,
    private readonly fixAllCodeActionProvider: FixAllCodeActionProvider,
    private readonly documentFormattingEditProvider: DocumentFormattingEditProvider,
    private readonly spotlessDiagnostics: SpotlessDiagnostics
  ) {}

  register(): void {
    this.fixAllCodeActionProvider.register();
    this.documentFormattingEditProvider.register();
    this.spotlessDiagnostics.register();

    const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration(
      this.onDidChangeConfigurationHandler
    );

    const onDidLoadTasks = this.gradleApi
      .getTaskProvider()
      .onDidLoadTasks(this.onDidLoadTasksHandler);

    this.context.subscriptions.push(onDidChangeConfiguration, onDidLoadTasks);
  }

  onDidLoadTasksHandler = (tasks: vscode.Task[]): void => {
    this.featuresEnabled = !!tasks.find(
      (task) => task.name === 'spotlessApply'
    );
    if (this.featuresEnabled) {
      this.setEnabledLanguages();
    } else {
      this.disableAllLanguages();
    }
  };

  private onDidChangeConfigurationHandler = async (
    event: vscode.ConfigurationChangeEvent
  ): Promise<void> => {
    if (this.featuresEnabled) {
      if (
        event.affectsConfiguration('spotlessGradle.format') ||
        event.affectsConfiguration('spotlessGradle.diagnostics')
      ) {
        this.setEnabledLanguages();
      }
      if (event.affectsConfiguration('spotlessGradle.diagnostics')) {
        this.spotlessDiagnostics.reset();
      }
    }
  };

  async setEnabledLanguages(): Promise<void> {
    const formatDocumentSelector = await getFormatDocumentSelector();
    const diagnosticsDocumentSelector = await getDiagnosticsDocumentSelector();
    this.spotlessDiagnostics.setDocumentSelector(diagnosticsDocumentSelector);
    this.fixAllCodeActionProvider.setDocumentSelector(formatDocumentSelector);
    this.documentFormattingEditProvider.setDocumentSelector(
      formatDocumentSelector
    );

    const activeDocument = vscode.window.activeTextEditor?.document;
    if (activeDocument) {
      this.spotlessDiagnostics.runDiagnostics(activeDocument);
    }
  }

  disableAllLanguages(): void {
    this.spotlessDiagnostics.setDocumentSelector([]);
    this.fixAllCodeActionProvider.setDocumentSelector([]);
    this.documentFormattingEditProvider.setDocumentSelector([]);
  }
}
