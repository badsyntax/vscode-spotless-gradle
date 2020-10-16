import * as vscode from 'vscode';

export function getConfigLanguages(
  workspaceFolder: vscode.WorkspaceFolder
): string[] | null {
  return vscode.workspace
    .getConfiguration('spotlessGradle', workspaceFolder.uri)
    .get<string[] | null>('languages', null);
}
