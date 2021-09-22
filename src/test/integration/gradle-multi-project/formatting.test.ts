/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as assert from 'assert';
import {
  formatFileWithCommand,
  formatFileOnSave,
  waitFor,
  multiProjectJavaAppFilePath,
  multiProjectJavaAppFileContents,
  multiProjectJavaFormattedAppFileContents,
  multiProjectJavaHelloFilePath,
  multiProjectJavaHelloFileContents,
} from '../../testUtil';
import { SPOTLESS_GRADLE_EXTENSION_ID } from '../../../constants';
import { ExtensionApi } from '../../../extension';

describe('Formatting', () => {
  const { logger, spotless } = vscode.extensions.getExtension(
    SPOTLESS_GRADLE_EXTENSION_ID
  )!.exports as ExtensionApi;

  afterEach(() => {
    sinon.restore();
  });

  describe('Running Spotless', () => {
    const reset = async (
      appFilePath: string,
      appFileContents: string
    ): Promise<void> => {
      await vscode.commands.executeCommand(
        'workbench.action.closeActiveEditor'
      );
      fs.writeFileSync(appFilePath, appFileContents, 'utf8');
    };

    describe('Java multi project', function () {
      // VS Code might choose to cancel the formatting
      this.timeout(6000);
      this.retries(5);

      afterEach(async () => {
        await reset(
          multiProjectJavaAppFilePath,
          multiProjectJavaAppFileContents
        );
      });

      it('should call spotless.apply when saving a file', async () => {
        const spotlessSpy = sinon.spy(spotless, 'apply');

        const document = await vscode.workspace.openTextDocument(
          multiProjectJavaAppFilePath
        );
        await vscode.window.showTextDocument(document);
        vscode.commands.executeCommand('workbench.action.files.save');

        await waitFor(() => spotlessSpy.calledWith(document));
      });

      it('should run spotless when saving a file', async () => {
        const loggerSpy = sinon.spy(logger, 'info');

        const document = await formatFileOnSave(multiProjectJavaAppFilePath);

        assert.equal(
          document?.getText(),
          multiProjectJavaFormattedAppFileContents,
          'The formatted document does not match the expected formatting'
        );
        assert.equal(
          fs.readFileSync(multiProjectJavaHelloFilePath, 'utf8'),
          multiProjectJavaHelloFileContents,
          'Spotless formatted multiple files'
        );
        assert.ok(
          loggerSpy.calledWith('App.java: IS DIRTY'),
          'Spotless status not logged'
        );
      });

      it('should run spotless when formatting a file', async () => {
        const loggerSpy = sinon.spy(logger, 'info');
        const document = await formatFileWithCommand(
          multiProjectJavaAppFilePath
        );
        assert.equal(
          document?.getText(),
          multiProjectJavaFormattedAppFileContents,
          'The formatted document does not match the expected formatting'
        );
        assert.equal(
          fs.readFileSync(multiProjectJavaHelloFilePath, 'utf8'),
          multiProjectJavaHelloFileContents,
          'Spotless formatted multiple files'
        );
        assert.equal(document?.isDirty, true, 'The document was saved');
        assert.ok(
          loggerSpy.calledWith('App.java: IS DIRTY'),
          'Spotless status not logged'
        );
      });
    });
  });
});
