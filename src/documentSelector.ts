import * as vscode from 'vscode';
import {
  getConfigFormat,
  getConfigDiagnostics,
  getConfigLangOverrideFormat,
  getConfigLangOverrideDiagnostics,
} from './config';
import { ALL_SUPPORTED_LANGUAGES } from './constants';

async function getDocumentSelector(
  supportedLanguages: string[]
): Promise<Array<vscode.DocumentFilter>> {
  const knownLanguages = await vscode.languages.getLanguages();
  const spotlessLanguages = Array.from(
    new Set(supportedLanguages)
  ).filter((language) => knownLanguages.includes(language));
  return spotlessLanguages.map((language) => ({
    language,
    scheme: 'file',
  }));
}

export async function getFormatDocumentSelector(): Promise<
  Array<vscode.DocumentFilter>
> {
  const supportedLanguages = (vscode.workspace.workspaceFolders || [])
    .map((workspaceFolder) => {
      const globalFormat = getConfigFormat(workspaceFolder);
      return ALL_SUPPORTED_LANGUAGES.filter((language) => {
        return getConfigLangOverrideFormat(
          workspaceFolder,
          language,
          globalFormat
        );
      });
    })
    .flat();
  return getDocumentSelector(supportedLanguages);
}

export async function getDiagnosticsDocumentSelector(): Promise<
  Array<vscode.DocumentFilter>
> {
  const supportedLanguages = (vscode.workspace.workspaceFolders || [])
    .map((workspaceFolder) => {
      const globalDiagnostics = getConfigDiagnostics(workspaceFolder);
      return ALL_SUPPORTED_LANGUAGES.filter((language) => {
        return getConfigLangOverrideDiagnostics(
          workspaceFolder,
          language,
          globalDiagnostics
        );
      });
    })
    .flat();
  return getDocumentSelector(supportedLanguages);
}
