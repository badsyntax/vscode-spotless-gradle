import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const gradleTasksExtension = vscode.extensions.getExtension(
    'richardwillis.vscode-gradle'
  );
  if (!gradleTasksExtension) {
    return;
  }
  const disposable = vscode.languages.registerDocumentFormattingEditProvider(
    'java',
    {
      async provideDocumentFormattingEdits(
        document: vscode.TextDocument
      ): Promise<vscode.TextEdit[] | null> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          document.uri
        );
        if (!workspaceFolder) {
          return null;
        }
        try {
          const saved = await document.save();
          if (!saved) {
            throw new Error('Unable to save file');
          }
          const args = [`-PspotlessFiles=${document.uri.fsPath}`];
          const gradleApi = gradleTasksExtension.exports;
          await gradleApi.runTask(
            workspaceFolder.uri.fsPath,
            'spotlessApply',
            args
          );
        } catch (e) {
          console.log('Error running spotless formatter', e.message);
        }
        return null;
      },
    }
  );

  context.subscriptions.push(disposable);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void {}
