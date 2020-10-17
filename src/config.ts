import * as vscode from 'vscode';
import {
  CONFIG_DIAGNOSTICS_ENABLE,
  CONFIG_FORMAT_ENABLE,
  CONFIG_NAMESPACE,
} from './constants';

export function getConfigFormatEnable(
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_NAMESPACE, workspaceFolder.uri)
    .get<boolean>(CONFIG_FORMAT_ENABLE, true);
}

export function getConfigLangOverrideFormatEnable(
  workspaceFolder: vscode.WorkspaceFolder,
  language: string,
  defaultValue: boolean
): boolean | undefined {
  return (
    vscode.workspace.getConfiguration(`[${language}]`, workspaceFolder.uri)[
      `${CONFIG_NAMESPACE}.${CONFIG_FORMAT_ENABLE}`
    ] ?? defaultValue
  );
}

export function getConfigDiagnosticsEnable(
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  return vscode.workspace
    .getConfiguration(CONFIG_NAMESPACE, workspaceFolder.uri)
    .get<boolean>(CONFIG_DIAGNOSTICS_ENABLE, true);
}

export function getConfigLangOverrideDiagnosticsEnable(
  workspaceFolder: vscode.WorkspaceFolder,
  language: string,
  defaultValue: boolean
): boolean | undefined {
  const diagnostics = vscode.workspace.getConfiguration(
    `[${language}]`,
    workspaceFolder.uri
  )[`${CONFIG_NAMESPACE}.${CONFIG_DIAGNOSTICS_ENABLE}`];
  return diagnostics ?? defaultValue;
}
