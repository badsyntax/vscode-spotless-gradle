/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as assert from 'assert';
import { formatFileWithCommand, formatFileOnSave, waitFor } from '../testUtil';
import { SPOTLESS_GRADLE_EXTENSION_ID } from '../../constants';
import { ExtensionApi } from '../../extension';

const javaBasePath = path.resolve(
  __dirname,
  '../../../test-fixtures/gradle-project/src/main/java/gradle/project'
);
const groovyBasePath = path.resolve(
  __dirname,
  '../../../test-fixtures/gradle-project/src/main/groovy/gradle/project'
);
const typeScriptBasePath = path.resolve(
  __dirname,
  '../../../test-fixtures/gradle-project/src/main/typescript'
);

const javaAppFilePath = path.resolve(javaBasePath, 'App.java');
const javaAppFileContents = fs.readFileSync(javaAppFilePath, 'utf8');
const javaHelloFilePath = path.resolve(javaBasePath, 'Hello.java');
const javaHelloFileContents = fs.readFileSync(javaHelloFilePath, 'utf8');
const javaFormattedAppFilePath = path.resolve(
  javaBasePath,
  'App.java.formatted.txt'
);
const javaFormattedAppFileContents = fs.readFileSync(
  javaFormattedAppFilePath,
  'utf8'
);

const typeScriptAppFilePath = path.resolve(typeScriptBasePath, 'App.ts');
const typeScriptAppFileContents = fs.readFileSync(
  typeScriptAppFilePath,
  'utf8'
);
const typeScriptFormattedAppFilePath = path.resolve(
  typeScriptBasePath,
  'App.ts.formatted.txt'
);
const typeScriptFormattedAppFileContents = fs.readFileSync(
  typeScriptFormattedAppFilePath,
  'utf8'
);

const groovyAppFilePath = path.resolve(groovyBasePath, 'App.groovy');
const groovyAppFileContents = fs.readFileSync(groovyAppFilePath, 'utf8');
const groovyFormattedAppFilePath = path.resolve(
  groovyBasePath,
  'App.groovy.formatted.txt'
);
const groovyFormattedAppFileContents = fs.readFileSync(
  groovyFormattedAppFilePath,
  'utf8'
);

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

    describe('Java', function () {
      // VS Code might choose to cancel the formatting
      this.timeout(6000);
      this.retries(5);

      afterEach(async () => {
        await reset(javaAppFilePath, javaAppFileContents);
      });

      it('should call spotless.apply when saving a file', async () => {
        const spotlessSpy = sinon.spy(spotless, 'apply');

        const document = await vscode.workspace.openTextDocument(
          javaAppFilePath
        );
        await vscode.window.showTextDocument(document);
        vscode.commands.executeCommand('workbench.action.files.save');

        await waitFor(() => spotlessSpy.calledWith(document));
      });

      it('should run spotless when saving a file', async () => {
        const loggerSpy = sinon.spy(logger, 'info');

        const document = await formatFileOnSave(javaAppFilePath);

        assert.equal(
          document?.getText(),
          javaFormattedAppFileContents,
          'The formatted document does not match the expected formatting'
        );
        assert.equal(
          fs.readFileSync(javaHelloFilePath, 'utf8'),
          javaHelloFileContents,
          'Spotless formatted multiple files'
        );
        assert.ok(
          loggerSpy.calledWith('App.java: IS DIRTY'),
          'Spotless status not logged'
        );
      });

      it('should run spotless when formatting a file', async () => {
        const loggerSpy = sinon.spy(logger, 'info');
        const document = await formatFileWithCommand(javaAppFilePath);
        assert.equal(
          document?.getText(),
          javaFormattedAppFileContents,
          'The formatted document does not match the expected formatting'
        );
        assert.equal(
          fs.readFileSync(javaHelloFilePath, 'utf8'),
          javaHelloFileContents,
          'Spotless formatted multiple files'
        );
        assert.equal(document?.isDirty, true, 'The document was saved');
        assert.ok(
          loggerSpy.calledWith('App.java: IS DIRTY'),
          'Spotless status not logged'
        );
      });
    });

    describe('Groovy', function () {
      // VS Code might choose to cancel the formatting
      this.timeout(6000);
      this.retries(5);

      afterEach(async () => {
        await reset(groovyAppFilePath, groovyAppFileContents);
      });

      it('should run spotless when saving a file', async () => {
        const loggerSpy = sinon.spy(logger, 'info');
        const document = await formatFileOnSave(groovyAppFilePath);
        assert.equal(
          document?.getText(),
          groovyFormattedAppFileContents,
          'The formatted document does not match the expected formatting'
        );
        assert.ok(
          loggerSpy.calledWith('App.groovy: IS DIRTY'),
          'Spotless status not logged'
        );
      });

      it('should run spotless when formatting a file', async () => {
        const loggerSpy = sinon.spy(logger, 'info');
        const document = await formatFileWithCommand(groovyAppFilePath);
        assert.equal(
          document?.getText(),
          groovyFormattedAppFileContents,
          'The formatted document does not match the expected formatting'
        );
        assert.equal(document?.isDirty, true, 'The document was saved');
        assert.ok(
          loggerSpy.calledWith('App.groovy: IS DIRTY'),
          'Spotless status not logged'
        );
      });
    });

    describe('Languages config', function () {
      const resetConfig = async (): Promise<void> =>
        await vscode.workspace
          .getConfiguration('spotlessGradle')
          .update('languages', []);

      // VS Code might choose to cancel the formatting
      this.timeout(6000);
      this.retries(5);

      before(async () => {
        await vscode.workspace
          .getConfiguration('spotlessGradle')
          .update('languages', ['typescript']);
      });

      after(async () => {
        await resetConfig();
        await reset(javaAppFilePath, javaAppFileContents);
        await reset(typeScriptAppFilePath, typeScriptAppFileContents);
      });

      it('should provide diagnostics for languages specified in config', async () => {
        const loggerSpy = sinon.spy(logger, 'info');
        const document = await formatFileOnSave(typeScriptAppFilePath);
        assert.equal(
          document?.getText(),
          typeScriptFormattedAppFileContents,
          'The formatted document does not match the expected formatting'
        );
        assert.ok(
          loggerSpy.calledWith('App.ts: IS DIRTY'),
          'Spotless status not logged'
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

      it('should log errors when formatting invalid Java files', async () => {
        const loggerSpy = sinon.spy(logger, 'error');
        const document = await vscode.workspace.openTextDocument(
          invalidFilePath
        );
        await vscode.window.showTextDocument(document);
        await vscode.commands.executeCommand('editor.action.formatDocument');
        assert.ok(
          loggerSpy.calledWith(sinon.match('Unable to apply formatting')),
          'Spotless formatting error not logged'
        );
      });
    });
  });

  // We can't test for .kt, .scala, .graphql or .vue as they're not known language identifiers
  // See: https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers
  describe('Supported language types', async () => {
    const basePath = path.resolve(
      __dirname,
      '../../../test-fixtures/gradle-project/src/main/resources/language-types'
    );
    const files = fs.readdirSync(basePath);

    files.forEach((file) => {
      describe(file, () => {
        it('should format with spotless', async () => {
          const spotlessApplySpy = sinon.spy(spotless, 'apply');
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
