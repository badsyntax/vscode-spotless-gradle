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

export function getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    throw new Error(
      `Unable to find workspace folder for ${path.basename(uri.fsPath)}`
    );
  }
  return workspaceFolder;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
export function createDecorator(
  mapFn: (fn: Function, key: string) => Function
): Function {
  return (_target: any, key: string, descriptor: any): void => {
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
