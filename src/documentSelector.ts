import * as vscode from 'vscode';
import {
  getConfigFormatEnable,
  getConfigLangOverrideFormatEnable,
  getConfigDiagnosticsEnable,
  getConfigLangOverrideDiagnosticsEnable,
} from './config';
import { ALL_SUPPORTED_LANGUAGES } from './constants';

export function getDocumentSelector(
  knownLanguages: string[],
  spotlessLanguages: string[]
): Array<vscode.DocumentFilter> {
  const languages = Array.from(new Set(spotlessLanguages)).filter((language) =>
    knownLanguages.includes(language)
  );
  return languages.map((language) => ({
    language,
    scheme: 'file',
  }));
}

export function getFormatDocumentSelector(
  knownLanguages: string[]
): Array<vscode.DocumentFilter> {
  const spotlessLanguages = (vscode.workspace.workspaceFolders || [])
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
  return getDocumentSelector(knownLanguages, spotlessLanguages);
}

export function getDiagnosticsDocumentSelector(
  knownLanguages: string[]
): Array<vscode.DocumentFilter> {
  const spotlessLanguages = (vscode.workspace.workspaceFolders || [])
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
  return getDocumentSelector(knownLanguages, spotlessLanguages);
}
