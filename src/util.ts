import * as vscode from 'vscode';
import * as path from 'path';

export function sanitizePath(fsPath: string): string {
  if (process.platform === 'win32') {
    // vscode.Uri.fsPath will lower-case the drive letters
    // https://github.com/microsoft/vscode/blob/dc348340fd1a6c583cb63a1e7e6b4fd657e01e01/src/vs/vscode.d.ts#L1338
    return fsPath[0].toUpperCase() + fsPath.substr(1);
  }
  return fsPath;
}

export function getWorkspaceFolder(filePath: string): vscode.WorkspaceFolder {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(
    vscode.Uri.file(filePath)
  );
  if (!workspaceFolder) {
    throw new Error(
      `Unable to find workspace folder for ${path.basename(filePath)}`
    );
  }
  return workspaceFolder;
}
