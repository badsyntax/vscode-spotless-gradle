import * as fs from 'fs';
import * as vscode from 'vscode';

const WAIT_FOR_FORMATTING_TIMEOUT = 2000;
const TOTAL_CANCELLED_RERUNS = 3;

export async function formatFileOnSave(
  appFilePath: string
): Promise<vscode.TextDocument> {
  const appFileContents = fs.readFileSync(appFilePath, 'utf8');
  const document = await vscode.workspace.openTextDocument(appFilePath);
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(reject, WAIT_FOR_FORMATTING_TIMEOUT);
    const disposable = vscode.workspace.onDidSaveTextDocument(
      (savedDocument: vscode.TextDocument) => {
        if (
          savedDocument === document &&
          document.getText() !== appFileContents
        ) {
          disposable.dispose();
          clearTimeout(timeout);
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
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(reject, WAIT_FOR_FORMATTING_TIMEOUT);
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
            clearTimeout(timeout);
            resolve(document);
          }
        }, 1);
      }
    );
    await vscode.window.showTextDocument(document);
    vscode.commands.executeCommand('editor.action.formatDocument');
  });
}

// Formatting immediately after editor start can conflict with other editor
// operations, which is why we have to accomodate this. Although somewhat
// clunky, this approach is better than using arbitrary timeout values.
// See: https://code.visualstudio.com/api/references/vscode-api#cancellation-tokens
// We could alternatively use mocha retries(), but that results in tests that
// are hard to comprehend. This approach shows exactly what's happening in the editor.
export async function rerunIfCancelled(
  onFormattingCancelled: vscode.Event<null>,
  formatCallback: () => Promise<vscode.TextDocument | null>,
  runs = 0
): Promise<vscode.TextDocument | null> {
  let isCancelled = false;
  onFormattingCancelled(() => {
    isCancelled = true;
  });
  try {
    return await formatCallback();
  } catch (e) {
    if (isCancelled && runs < TOTAL_CANCELLED_RERUNS) {
      console.warn('Formatting was cancelled, re-running...');
      return rerunIfCancelled(onFormattingCancelled, formatCallback, runs + 1);
    } else if (!isCancelled) {
      console.error('Formatting failed');
    }
  }
  return null;
}
