import * as vscode from 'vscode';
import {
  CONFIG_FORMAT_ENABLE,
  CONFIG_DIAGNOSTICS_ENABLE,
  CONFIG_NAMESPACE,
} from './constants';
import { Disposables } from './Disposables';
import { DocumentFormattingEditProvider } from './DocumentFormattingEditProvider';
import {
  getFormatDocumentSelector,
  getDiagnosticsDocumentSelector,
} from './documentSelector';
import { FixAllCodeActionProvider } from './FixAllCodeActionProvider';
import { Spotless } from './Spotless';
import { SpotlessDiagnostics } from './SpotlessDiagnostics';

export class FeatureManager implements vscode.Disposable {
  private disposables = new Disposables();
  private knownLanguages: string[] = [];

  constructor(
    private readonly spotless: Spotless,
    private readonly fixAllCodeActionProvider: FixAllCodeActionProvider,
    private readonly documentFormattingEditProvider: DocumentFormattingEditProvider,
    private readonly spotlessDiagnostics: SpotlessDiagnostics
  ) {}

  public async register(): Promise<void> {
    this.knownLanguages = await vscode.languages.getLanguages();
    this.spotless.onReady(this.onSpotlessReady);
    this.disposables.add(
      vscode.workspace.onDidChangeConfiguration(
        this.onDidChangeConfigurationHandler
      )
    );
  }

  public dispose(): void {
    this.disposables.dispose();
  }

  private onSpotlessReady = (isReady: boolean): void => {
    if (isReady) {
      this.setEnabledLanguages();
    } else {
      this.disableAllLanguages();
    }
  };

  private onDidChangeConfigurationHandler = async (
    event: vscode.ConfigurationChangeEvent
  ): Promise<void> => {
    if (this.spotless.isReady) {
      if (
        event.affectsConfiguration(
          `${CONFIG_NAMESPACE}.${CONFIG_FORMAT_ENABLE}`
        ) ||
        event.affectsConfiguration(
          `${CONFIG_NAMESPACE}.${CONFIG_DIAGNOSTICS_ENABLE}`
        )
      ) {
        this.setEnabledLanguages();
      }
      if (
        event.affectsConfiguration(
          `${CONFIG_NAMESPACE}.${CONFIG_DIAGNOSTICS_ENABLE}`
        )
      ) {
        this.spotlessDiagnostics.reset();
      }
    }
  };

  private async setEnabledLanguages(): Promise<void> {
    const formatDocumentSelector = getFormatDocumentSelector(
      this.knownLanguages
    );
    this.fixAllCodeActionProvider.setDocumentSelector(formatDocumentSelector);
    this.documentFormattingEditProvider.setDocumentSelector(
      formatDocumentSelector
    );

    const diagnosticsDocumentSelector = getDiagnosticsDocumentSelector(
      this.knownLanguages
    );
    this.spotlessDiagnostics.setDocumentSelector(diagnosticsDocumentSelector);
  }

  private disableAllLanguages(): void {
    this.spotlessDiagnostics.setDocumentSelector([]);
    this.fixAllCodeActionProvider.setDocumentSelector([]);
    this.documentFormattingEditProvider.setDocumentSelector([]);
  }
}
