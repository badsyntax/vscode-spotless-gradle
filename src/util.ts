import * as vscode from 'vscode';
import * as path from 'path';
import { Difference, generateDifferences } from 'prettier-linter-helpers';

const { INSERT, DELETE, REPLACE } = generateDifferences;

export function sanitizePath(fsPath: string): string {
  if (process.platform === 'win32') {
    // vscode.Uri.fsPath will lower-case the drive letters
    // https://github.com/microsoft/vscode/blob/dc348340fd1a6c583cb63a1e7e6b4fd657e01e01/src/vs/vscode.d.ts#L1338
    return fsPath[0].toUpperCase() + fsPath.substr(1);
  }
  return fsPath;
}

export function getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    throw new Error(
      `Unable to find workspace folder for ${path.basename(uri.fsPath)}`
    );
  }
  return workspaceFolder;
}

export function getPositionFromOffset(
  document: vscode.TextDocument,
  offset: number
): vscode.Position {
  let text = '';
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const lineText = line.text;
    const allText = text + lineText;
    if (allText.length >= offset) {
      const col = lineText.length - (allText.length - offset);
      return new vscode.Position(i, col);
    }
    text += lineText + '\n';
  }
  throw new Error('Position not found');
}

export function getRange(
  document: vscode.TextDocument,
  difference: Difference
): vscode.Range | void {
  switch (difference.operation) {
    case INSERT: {
      const start = getPositionFromOffset(document, difference.offset);
      if (start) {
        return new vscode.Range(
          start.line,
          start.character,
          start.line,
          start.character + 1
        );
      }
      break;
    }
    case DELETE:
      const start = getPositionFromOffset(document, difference.offset);
      const end = getPositionFromOffset(
        document,
        difference.offset + difference.deleteText!.length
      );
      if (start && end) {
        return new vscode.Range(
          start.line,
          start.character,
          end.line,
          end.character
        );
      }
      break;
    case REPLACE: {
      const start = getPositionFromOffset(document, difference.offset);
      const end = getPositionFromOffset(
        document,
        difference.offset + difference.deleteText!.length
      );
      if (start && end) {
        return new vscode.Range(
          start.line,
          start.character,
          end.line,
          end.character
        );
      }
    }
  }
}
