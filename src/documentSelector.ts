import * as vscode from 'vscode';
import {
  getConfigFormatEnable,
  getConfigLangOverrideFormatEnable,
  getConfigDiagnosticsEnable,
  getConfigLangOverrideDiagnosticsEnable,
} from './config';
import { ALL_SUPPORTED_LANGUAGES } from './constants';

export async function getDocumentSelector(
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
      const globalFormatEnable = getConfigFormatEnable(workspaceFolder);
      return ALL_SUPPORTED_LANGUAGES.filter((language) => {
        return getConfigLangOverrideFormatEnable(
          workspaceFolder,
          language,
          globalFormatEnable
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
      const globalDiagnosticsEnable = getConfigDiagnosticsEnable(
        workspaceFolder
      );
      return ALL_SUPPORTED_LANGUAGES.filter((language) => {
        return getConfigLangOverrideDiagnosticsEnable(
          workspaceFolder,
          language,
          globalDiagnosticsEnable
        );
      });
    })
    .flat();
  return getDocumentSelector(supportedLanguages);
}
