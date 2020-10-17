import * as fs from 'fs';
import * as vscode from 'vscode';
import { DIAGNOSTICS_ID } from '../constants';

export async function formatFileOnSave(
  appFilePath: string
): Promise<vscode.TextDocument> {
  const appFileContents = fs.readFileSync(appFilePath, 'utf8');
  const document = await vscode.workspace.openTextDocument(appFilePath);
  return new Promise(async (resolve) => {
    const disposable = vscode.workspace.onDidSaveTextDocument(
      (savedDocument: vscode.TextDocument) => {
        if (
          savedDocument === document &&
          document.getText() !== appFileContents
        ) {
          disposable.dispose();
          resolve(document);
        }
      }
    );
    await vscode.window.showTextDocument(document);
    vscode.commands.executeCommand('workbench.action.files.save');
  });
}

export async function formatFileWithCommand(
  appFilePath: string
): Promise<vscode.TextDocument> {
  const appFileContents = fs.readFileSync(appFilePath, 'utf8');
  const document = await vscode.workspace.openTextDocument(appFilePath);
  return new Promise(async (resolve) => {
    const disposable = vscode.workspace.onDidChangeTextDocument(
      (e: vscode.TextDocumentChangeEvent) => {
        // This handler is called for various reasons. Bail out if there
        // are no content changes.
        if (e.document !== document || !e.contentChanges.length) {
          return;
        }
        // This timeout is required to allow the document state to be updated.
        // EG: document.isDirty
        setTimeout(() => {
          if (document.getText() !== appFileContents) {
            disposable.dispose();
            resolve(document);
          }
        }, 1);
      }
    );
    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('editor.action.formatDocument');
  });
}

export function waitForDiagnostics(
  message: string,
  source = DIAGNOSTICS_ID
): Promise<void> {
  return new Promise(async (resolve) => {
    const disposable = vscode.languages.onDidChangeDiagnostics(() => {
      const diagnostics = vscode.languages.getDiagnostics(
        vscode.window.activeTextEditor!.document.uri
      );
      const hasSpotlessDiagnostic = diagnostics.find(
        (diagnostic) =>
          diagnostic.source === source && diagnostic.message === message
      );
      if (hasSpotlessDiagnostic) {
        disposable.dispose();
        resolve();
      }
    });
  });
}

export function waitFor(func: () => boolean): Promise<void> {
  const interval = 50;
  return new Promise((resolve) => {
    async function check(): Promise<void> {
      if (func()) {
        resolve();
      } else {
        setTimeout(check, interval);
      }
    }
    check();
  });
}
