import * as vscode from 'vscode';
import {
  getConfigFormat,
  getConfigDiagnostics,
  getConfigLangOverrideFormat,
  getConfigLangOverrideDiagnostics,
} from './config';
import { ALL_SUPPORTED_LANGUAGES } from './constants';

export async function getDocumentSelector(): Promise<
  Array<vscode.DocumentFilter>
> {
  const knownLanguages = await vscode.languages.getLanguages();
  const spotlessLanguages = Array.from(
    new Set(
      (vscode.workspace.workspaceFolders || [])
        .map((workspaceFolder) => {
          const globalFormat = getConfigFormat(workspaceFolder);
          const globalDiagnostics = getConfigDiagnostics(workspaceFolder);
          return ALL_SUPPORTED_LANGUAGES.filter((language) => {
            return (
              getConfigLangOverrideFormat(
                workspaceFolder,
                language,
                globalFormat
              ) ||
              getConfigLangOverrideDiagnostics(
                workspaceFolder,
                language,
                globalDiagnostics
              )
            );
          });
        })
        .flat()
    )
  ).filter((language) => knownLanguages.includes(language));
  return spotlessLanguages.map((language) => ({
    language,
    scheme: 'file',
  }));
}
