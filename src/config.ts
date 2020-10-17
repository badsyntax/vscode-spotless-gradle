import * as vscode from 'vscode';

export function getConfigIsEnabled(
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  return vscode.workspace
    .getConfiguration('spotlessGradle', workspaceFolder.uri)
    .get<boolean>('enabled', true);
}

export function getConfigLangOverrideIsEnabled(
  workspaceFolder: vscode.WorkspaceFolder,
  language: string,
  defaultValue: boolean
): boolean | undefined {
  return (
    vscode.workspace.getConfiguration(`[${language}]`, workspaceFolder.uri)[
      'spotlessGradle.enabled'
    ] ?? defaultValue
  );
}

export function getConfigDiagnostics(
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  return vscode.workspace
    .getConfiguration('spotlessGradle', workspaceFolder.uri)
    .get<boolean>('diagnostics', true);
}

export function getConfigLangOverrideDiagnostics(
  workspaceFolder: vscode.WorkspaceFolder,
  language: string,
  defaultValue: boolean
): boolean | undefined {
  const diagnostics = vscode.workspace.getConfiguration(
    `[${language}]`,
    workspaceFolder.uri
  )['spotlessGradle.diagnostics'];
  return diagnostics ?? defaultValue;
}
