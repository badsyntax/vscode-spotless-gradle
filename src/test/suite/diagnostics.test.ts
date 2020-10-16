import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as assert from 'assert';
import { SPOTLESS_GRADLE_EXTENSION_ID } from '../../constants';
import { ExtensionApi } from '../../extension';
import { waitFor, waitForDiagnostics } from '../testUtil';

async function waitForDiagnosticsOnDocumentOpen(
  appFilePath: string
): Promise<vscode.TextDocument> {
  const document = await vscode.workspace.openTextDocument(appFilePath);
  await vscode.window.showTextDocument(document);
  await waitForDiagnostics(
    'Replace public·static·void·main(String[]·args)·{System.out.println("app");} with ⏎··public·static·void·main(String[]·args)·{⏎····System.out.println("app");⏎··}⏎'
  );
  return document;
}

describe('Diagnostics', () => {
  const { logger } = vscode.extensions.getExtension(
    SPOTLESS_GRADLE_EXTENSION_ID
  )!.exports as ExtensionApi;

  afterEach((done) => {
    sinon.restore();
    // This helps clear the nodejs async queue to fix flaky macos CI tests
    setTimeout(done, 100);
  });

  describe('Running Spotless', () => {
    const javaBasePath = path.resolve(
      __dirname,
      '../../../test-fixtures/gradle-project/src/main/java/gradle/project'
    );

    const reset = async (
      appFilePath: string,
      appFileContents: string
    ): Promise<void> => {
      await vscode.commands.executeCommand(
        'workbench.action.closeActiveEditor'
      );
      fs.writeFileSync(appFilePath, appFileContents, 'utf8');
    };

    describe('Java', function () {
      const appFilePath = path.resolve(javaBasePath, 'App.java');
      const appFileContents = fs.readFileSync(appFilePath, 'utf8');

      afterEach(async () => {
        await reset(appFilePath, appFileContents);
      });

      it('should provide spotless diagnostics when opening a text document', async () => {
        const loggerSpy = sinon.spy(logger, 'info');
        await waitForDiagnosticsOnDocumentOpen(appFilePath);
        assert.ok(loggerSpy.calledWith('App.java: IS DIRTY'));
        assert.ok(
          loggerSpy.calledWith('Updated diagnostics (name: java) (total: 1)')
        );
      });

      it('should provide spotless diagnostics when changing a text document', async () => {
        const loggerSpy = sinon.spy(logger, 'info');

        const document = await waitForDiagnosticsOnDocumentOpen(appFilePath);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.insert(document.uri, new vscode.Position(0, 0), '  ');
        await vscode.workspace.applyEdit(workspaceEdit);
        await waitForDiagnostics('Delete ··');
        assert.ok(loggerSpy.calledWith('App.java: IS DIRTY'));
        assert.ok(
          loggerSpy.calledWith('Updated diagnostics (name: java) (total: 2)')
        );
      });
    });

    describe('Error path', () => {
      const invalidFilePath = path.resolve(javaBasePath, 'AppInvalid.java');

      before(() => {
        fs.copyFileSync(
          path.resolve(javaBasePath, 'AppInvalid.java.txt'),
          invalidFilePath
        );
      });

      after(() => {
        fs.unlinkSync(invalidFilePath);
      });

      it('should log errors when linting invalid Java files', async () => {
        const loggerSpy = sinon.spy(logger, 'error');
        const document = await vscode.workspace.openTextDocument(
          invalidFilePath
        );
        await vscode.window.showTextDocument(document);
        waitFor((): boolean =>
          loggerSpy.calledWith(sinon.match('Unable to provide diagnostics'))
        );
      });
    });
  });
});
