import * as vscode from 'vscode';

export function getConfigLanguages(
  workspaceFolder: vscode.WorkspaceFolder
): string[] {
  return vscode.workspace
    .getConfiguration('spotlessGradle', workspaceFolder.uri)
    .get<string[]>('languages', []);
}

export function getConfigDiagnostics(
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  return vscode.workspace
    .getConfiguration('spotlessGradle', workspaceFolder.uri)
    .get<boolean>('diagnostics', true);
}
