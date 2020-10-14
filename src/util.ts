import * as vscode from 'vscode';
import * as path from 'path';
import { Difference, generateDifferences } from 'prettier-linter-helpers';
import { SpotlessDiff } from './Spotless';

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

export function getDiagnosticMap(
  diff: SpotlessDiff,
  document: vscode.TextDocument
): Map<string, vscode.Diagnostic[]> {
  const diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
  diff.differences.forEach((difference) => {
    const canonicalFile = document.uri.toString();
    const range = getRange(document, difference);
    if (range) {
      let diagnostics = diagnosticMap.get(canonicalFile);
      if (!diagnostics) {
        diagnostics = [];
      }
      diagnostics.push(new vscode.Diagnostic(range, difference.operation));
      diagnosticMap.set(canonicalFile, diagnostics);
    }
  });
  return diagnosticMap;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
export function createDecorator(
  mapFn: (fn: Function, key: string) => Function
): Function {
  return (target: any, key: string, descriptor: any): void => {
    let fnKey: string | null = null;
    let fn: Function | null = null;
    if (typeof descriptor.value === 'function') {
      fnKey = 'value';
      fn = descriptor.value;
    } else if (typeof descriptor.get === 'function') {
      fnKey = 'get';
      fn = descriptor.get;
    }
    if (!fn) {
      throw new Error('not supported');
    }
    descriptor[fnKey!] = mapFn(fn, key);
  };
}

export interface DebounceReducer<T> {
  (previousValue: T, ...args: any[]): T;
}

export function debounce(delay: number): Function {
  return createDecorator((fn, key) => {
    const timerKey = `$debounce$${key}`;
    return function (this: any, ...args: any[]): void {
      clearTimeout(this[timerKey]);
      this[timerKey] = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  });
}
