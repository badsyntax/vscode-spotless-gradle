import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DIAGNOSTICS_ID } from '../constants';

export const javaBasePath = path.resolve(
  __dirname,
  '../../test-fixtures/gradle-project/src/main/java/gradle/project'
);
export const multiProjectJavaBasePath = path.resolve(
  __dirname,
  '../../test-fixtures/gradle-multi-project/app/src/main/java/gradle/project'
);
export const groovyBasePath = path.resolve(
  __dirname,
  '../../test-fixtures/gradle-project/src/main/groovy/gradle/project'
);
export const typeScriptBasePath = path.resolve(
  __dirname,
  '../../test-fixtures/gradle-project/src/main/typescript'
);

export const javaAppFilePath = path.resolve(javaBasePath, 'App.java');
export const javaAppFileContents = fs.readFileSync(javaAppFilePath, 'utf8');
export const javaHelloFilePath = path.resolve(javaBasePath, 'Hello.java');
export const javaHelloFileContents = fs.readFileSync(javaHelloFilePath, 'utf8');
export const javaFormattedAppFilePath = path.resolve(
  javaBasePath,
  'App.java.formatted.txt'
);
export const javaFormattedAppFileContents = fs.readFileSync(
  javaFormattedAppFilePath,
  'utf8'
);
export const multiProjectJavaAppFilePath = path.resolve(
  multiProjectJavaBasePath,
  'App.java'
);
export const multiProjectJavaAppFileContents = fs.readFileSync(
  multiProjectJavaAppFilePath,
  'utf8'
);
export const multiProjectJavaHelloFilePath = path.resolve(
  multiProjectJavaBasePath,
  'Hello.java'
);
export const multiProjectJavaHelloFileContents = fs.readFileSync(
  multiProjectJavaHelloFilePath,
  'utf8'
);
export const multiProjectJavaFormattedAppFilePath = path.resolve(
  multiProjectJavaBasePath,
  'App.java.formatted.txt'
);
export const multiProjectJavaFormattedAppFileContents = fs.readFileSync(
  multiProjectJavaFormattedAppFilePath,
  'utf8'
);
export const typeScriptAppFilePath = path.resolve(typeScriptBasePath, 'App.ts');
export const typeScriptAppFileContents = fs.readFileSync(
  typeScriptAppFilePath,
  'utf8'
);
export const typeScriptFormattedAppFilePath = path.resolve(
  typeScriptBasePath,
  'App.ts.formatted.txt'
);
export const typeScriptFormattedAppFileContents = fs.readFileSync(
  typeScriptFormattedAppFilePath,
  'utf8'
);
export const groovyAppFilePath = path.resolve(groovyBasePath, 'App.groovy');
export const groovyAppFileContents = fs.readFileSync(groovyAppFilePath, 'utf8');
export const groovyFormattedAppFilePath = path.resolve(
  groovyBasePath,
  'App.groovy.formatted.txt'
);
export const groovyFormattedAppFileContents = fs.readFileSync(
  groovyFormattedAppFilePath,
  'utf8'
);

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
