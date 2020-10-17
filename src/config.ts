import * as vscode from 'vscode';

export function getConfigFormat(
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  return vscode.workspace
    .getConfiguration('spotlessGradle', workspaceFolder.uri)
    .get<boolean>('format', true);
}

export function getConfigLangOverrideFormat(
  workspaceFolder: vscode.WorkspaceFolder,
  language: string,
  defaultValue: boolean
): boolean | undefined {
  return (
    vscode.workspace.getConfiguration(`[${language}]`, workspaceFolder.uri)[
      'spotlessGradle.format'
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
