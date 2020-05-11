import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as assert from 'assert';
import { formatFileWithCommand, formatFileOnSave } from '../testUtil';
import { logger } from '../../logger';
import { Spotless } from '../../Spotless';

describe('Extension Test Suite', () => {
  describe('Running Spotless', () => {
    const basePath = path.resolve(
      __dirname,
      '../../../test-fixtures/gradle-project/src/main/java/gradle/project'
    );

    describe('Happy path', () => {
      ['App.java', 'App.kt'].forEach((file) => {
        describe(file, function () {
          const appFilePath = path.resolve(basePath, file);
          const appFileContents = fs.readFileSync(appFilePath, 'utf8');
          const helloFilePath = path.resolve(basePath, 'Hello.java');
          const helloFileContents = fs.readFileSync(helloFilePath, 'utf8');
          const formattedAppFilePath = path.resolve(
            basePath,
            `${file}.formatted.txt`
          );
          const formattedAppFileContents = fs.readFileSync(
            formattedAppFilePath,
            'utf8'
          );

          // VS Code will cancel the formatting when formatting immediately
          // after opening a document. So we have to keep retrying.
          // 10 * 10000 = max 100 seconds per test.
          this.retries(10);

          afterEach(async () => {
            await vscode.commands.executeCommand(
              'workbench.action.closeActiveEditor'
            );
            fs.writeFileSync(appFilePath, appFileContents, 'utf8');
            sinon.restore();
          });

          it('should run spotless when saving a file', async () => {
            const loggerSpy = sinon.spy(logger, 'info');
            const document = await formatFileOnSave(appFilePath);
            assert.equal(
              document?.getText(),
              formattedAppFileContents,
              'The formatted document does not match the expected formatting'
            );
            assert.equal(
              fs.readFileSync(helloFilePath, 'utf8'),
              helloFileContents,
              'Spotless formatted multiple files'
            );
            assert.ok(
              loggerSpy.calledWith(`${file}: IS DIRTY`),
              'Spotless status not logged'
            );
          });

          it('should run spotless when formatting a file', async () => {
            const loggerSpy = sinon.spy(logger, 'info');
            const document = await formatFileWithCommand(appFilePath);
            assert.equal(
              document?.getText(),
              formattedAppFileContents,
              'The formatted document does not match the expected formatting'
            );
            assert.equal(
              fs.readFileSync(helloFilePath, 'utf8'),
              helloFileContents,
              'Spotless formatted multiple files'
            );
            assert.equal(document?.isDirty, true, 'The document was saved');
            assert.ok(
              loggerSpy.calledWith(`${file}: IS DIRTY`),
              'Spotless status not logged'
            );
          });
        });
      });
    });

    describe('Error path', () => {
      const invalidFilePath = path.resolve(basePath, 'AppInvalid.java');

      before(() => {
        fs.copyFileSync(
          path.resolve(basePath, 'AppInvalid.java.txt'),
          invalidFilePath
        );
      });

      after(() => {
        fs.unlinkSync(invalidFilePath);
      });

      it('should log errors when formatting invalid Java files', async () => {
        const loggerSpy = sinon.spy(logger, 'error');
        const document = await vscode.workspace.openTextDocument(
          invalidFilePath
        );
        await vscode.window.showTextDocument(document);
        await vscode.commands.executeCommand('editor.action.formatDocument');
        assert.ok(
          loggerSpy.calledWith(
            'Unable to apply formatting:',
            sinon.match("Step 'google-java-format' found problem")
          ),
          'Spotless error not logged'
        );
      });
    });
  });
  // We can't test for .kt, .scala, .graphql or .vue as they're not known language identifiers
  // See: https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers
  describe.only('Supported language types', async () => {
    const basePath = path.resolve(
      __dirname,
      '../../../test-fixtures/language-types'
    );
    const files = fs.readdirSync(basePath);

    afterEach(() => {
      sinon.restore();
    });

    files.forEach((file) => {
      describe(file, () => {
        it('should format with spotless', async () => {
          const spotlessApplySpy = sinon.spy(Spotless.prototype, 'apply');
          const filePath = path.resolve(basePath, file);
          const document = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(document);
          await vscode.commands.executeCommand('editor.action.formatDocument');
          assert.ok(
            spotlessApplySpy.calledWith(document, sinon.match.any),
            'Spotless was not called'
          );
        });
      });
    });
  });
});
