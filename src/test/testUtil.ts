import * as fs from 'fs';
import * as vscode from 'vscode';

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
