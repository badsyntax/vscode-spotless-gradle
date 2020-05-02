import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';

const appFilePath = path.resolve(
  __dirname,
  '../../../test-fixtures/gradle-project/src/main/java/gradle/project/App.java'
);
const appFileContents = fs.readFileSync(appFilePath, 'utf8');

const helloFilePath = path.resolve(
  __dirname,
  '../../../test-fixtures/gradle-project/src/main/java/gradle/project/Hello.java'
);
const helloFileContents = fs.readFileSync(helloFilePath, 'utf8');

const expectedFileContents = `package gradle.project;

public class App {
  public static void main(String[] args) {
    System.out.println("app");
  }
}
`;

function runAndCheck(command: string): Promise<void> {
  return new Promise(async (resolve) => {
    const watcher = vscode.workspace.createFileSystemWatcher(appFilePath);
    watcher.onDidChange((uri: vscode.Uri) => {
      const newContents = fs.readFileSync(uri.fsPath, 'utf8');
      if (newContents !== appFileContents) {
        watcher.dispose();
        assert.equal(newContents, expectedFileContents);
        // check for single file spotless
        assert.equal(fs.readFileSync(helloFilePath, 'utf8'), helloFileContents);
        resolve();
      }
    });
    await vscode.window.showTextDocument(
      await vscode.workspace.openTextDocument(appFilePath)
    );
    setTimeout(() => {
      vscode.commands.executeCommand(command);
    }, 100);
  });
}

describe('Extension Test Suite', () => {
  afterEach(() => {
    fs.writeFileSync(appFilePath, appFileContents, 'utf8');
  });

  it('should run spotless when saving a file', async () => {
    await runAndCheck('workbench.action.files.save');
  });

  it('should run spotless when formatting a file', async () => {
    await runAndCheck('editor.action.formatDocument');
  });
});
