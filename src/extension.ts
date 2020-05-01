import * as vscode from "vscode";

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  const lastLineId = document.lineCount - 1;
  return new vscode.Range(
    0,
    0,
    lastLineId,
    document.lineAt(lastLineId).text.length
  );
}

export function activate(context: vscode.ExtensionContext): void {
  console.log(
    'Congratulations, your extension "vscode-spotless-gradle" is now active!'
  );

  const disposable = vscode.languages.registerDocumentFormattingEditProvider(
    "java",
    {
      provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): vscode.TextEdit[] {
        return [
          vscode.TextEdit.replace(
            fullDocumentRange(document),
            "FORMATTED CODE TO GO HERE"
          ),
        ];
      },
    }
  );

  context.subscriptions.push(disposable);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
