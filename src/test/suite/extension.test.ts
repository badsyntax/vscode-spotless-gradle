/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as assert from 'assert';
import { formatFileWithCommand, formatFileOnSave } from '../testUtil';
import { DependencyChecker } from '../../DependencyChecker';
import {
  GRADLE_TASKS_EXTENSION_ID,
  SPOTLESS_GRADLE_EXTENSION_ID,
} from '../../constants';
import { ExtensionApi } from '../../extension';
import { getPositionFromOffset } from '../../util';

describe('Extension Test Suite', () => {
  const { logger, spotless } = vscode.extensions.getExtension(
    SPOTLESS_GRADLE_EXTENSION_ID
  )!.exports as ExtensionApi;

  describe('Diagnostics', () => {
    describe('getRange', () => {
      const getLoc = (
        offset: number,
        linesText: string[] = ['123456'],
        deleteText = '45'
      ): {
        start: vscode.Position;
        end: vscode.Position;
      } => {
        const difference = {
          offset,
          deleteText,
        };
        const lines = linesText.map((lineText, i) => ({
          lineNumber: i,
          text: lineText,
        }));
        const document = {
          lineCount: lines.length,
          lineAt(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            index: number
          ): {
            lineNumber: number;
            text: string;
          } {
            return lines[index];
          },
        };
        const start = getPositionFromOffset(
          document as vscode.TextDocument,
          difference.offset
        );
        const end = getPositionFromOffset(
          document as vscode.TextDocument,
          difference.offset + difference.deleteText!.length
        );
        return { start, end };
      };
      it('should get correct delete range with 0 offset', () => {
        const { start, end } = getLoc(0);
        assert.ok(start);
        assert.ok(end);
        assert.strictEqual(start.line, 0);
        assert.strictEqual(start.character, 0);
        assert.strictEqual(end.line, 0);
        assert.strictEqual(end.character, 2);
      });
      it('should get correct delete range with 3 offset', () => {
        const { start, end } = getLoc(3);
        assert.ok(start);
        assert.ok(end);
        assert.strictEqual(start.line, 0);
        assert.strictEqual(start.character, 3);
        assert.strictEqual(end.line, 0);
        assert.strictEqual(end.character, 5);
      });

      it('should get correct delete range for multi-lines', () => {
        const { start, end } = getLoc(7, ['123456', '78910']);
        assert.ok(start);
        assert.ok(end);
        assert.strictEqual(start.line, 1);
        assert.strictEqual(start.character, 1);
        assert.strictEqual(end.line, 1);
        assert.strictEqual(end.character, 3);
      });
    });
  });
  describe('Running Spotless', () => {
    const javaBasePath = path.resolve(
      __dirname,
      '../../../test-fixtures/gradle-project/src/main/java/gradle/project'
    );
    const groovyBasePath = path.resolve(
      __dirname,
      '../../../test-fixtures/gradle-project/src/main/groovy/gradle/project'
    );
    describe('Java', function () {
      const appFilePath = path.resolve(javaBasePath, 'App.java');
      const appFileContents = fs.readFileSync(appFilePath, 'utf8');
      const helloFilePath = path.resolve(javaBasePath, 'Hello.java');
      const helloFileContents = fs.readFileSync(helloFilePath, 'utf8');
      const formattedAppFilePath = path.resolve(
        javaBasePath,
        'App.java.formatted.txt'
      );
      const formattedAppFileContents = fs.readFileSync(
        formattedAppFilePath,
        'utf8'
      );

      // VS Code will cancel the formatting when formatting immediately
      // after opening a document. So we have to keep retrying.
      this.retries(5);

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
          loggerSpy.calledWith('App.java: IS DIRTY'),
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
          loggerSpy.calledWith('App.java: IS DIRTY'),
          'Spotless status not logged'
        );
      });
    });

    describe('Groovy', function () {
      const appFilePath = path.resolve(groovyBasePath, 'App.groovy');
      const appFileContents = fs.readFileSync(appFilePath, 'utf8');
      const formattedAppFilePath = path.resolve(
        groovyBasePath,
        'App.groovy.formatted.txt'
      );
      const formattedAppFileContents = fs.readFileSync(
        formattedAppFilePath,
        'utf8'
      );

      // VS Code will cancel the formatting when formatting immediately
      // after opening a document. So we have to keep retrying.
      this.retries(5);

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
        assert.ok(
          loggerSpy.calledWith('App.groovy: IS DIRTY'),
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
        assert.equal(document?.isDirty, true, 'The document was saved');
        assert.ok(
          loggerSpy.calledWith('App.groovy: IS DIRTY'),
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
          loggerSpy.calledWith('Unable to apply formatting:', sinon.match.any),
          'Spotless error not logged'
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

    afterEach(() => {
      sinon.restore();
    });

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

  describe('Dependency checks', () => {
    afterEach(async () => {
      sinon.restore();
    });

    it('should match patch versions', async () => {
      sinon.stub(vscode.extensions, 'getExtension').callsFake(() => {
        return {
          id: GRADLE_TASKS_EXTENSION_ID,
          packageJSON: {
            version: '1.0.2',
          },
          isActive: true,
        } as vscode.Extension<any>;
      });
      const dependencyChecker = new DependencyChecker({
        extensionDependencies: [GRADLE_TASKS_EXTENSION_ID],
        extensionDependenciesCompatibility: {
          [GRADLE_TASKS_EXTENSION_ID]: '^1.0.1',
        },
      });
      const isValid = await dependencyChecker.check();
      assert.ok(isValid, 'Dependencies do not match');
    });

    it('should match minor versions', async () => {
      sinon.stub(vscode.extensions, 'getExtension').callsFake(() => {
        return {
          id: GRADLE_TASKS_EXTENSION_ID,
          packageJSON: {
            version: '1.1.0',
          },
          isActive: true,
        } as vscode.Extension<any>;
      });
      const dependencyChecker = new DependencyChecker({
        extensionDependencies: [GRADLE_TASKS_EXTENSION_ID],
        extensionDependenciesCompatibility: {
          [GRADLE_TASKS_EXTENSION_ID]: '^1.0.1',
        },
      });
      const isValid = await dependencyChecker.check();
      assert.ok(isValid, 'Dependencies do not match');
    });

    it('should not match major versions', async () => {
      const errorSpy = sinon.spy(vscode.window, 'showErrorMessage');
      sinon.stub(vscode.extensions, 'getExtension').callsFake(() => {
        return {
          id: GRADLE_TASKS_EXTENSION_ID,
          packageJSON: {
            version: '2.0.0',
          },
          isActive: true,
        } as vscode.Extension<any>;
      });
      const dependencyChecker = new DependencyChecker({
        extensionDependencies: [GRADLE_TASKS_EXTENSION_ID],
        extensionDependenciesCompatibility: {
          [GRADLE_TASKS_EXTENSION_ID]: '^1.0.1',
        },
      });
      const isValid = await dependencyChecker.check();
      assert.equal(isValid, false, 'Dependencies match');
      assert.ok(
        errorSpy.calledWith(
          'Extension versions are incompatible: richardwillis.vscode-gradle@^1.0.1. Install those specific versions or update this extension.',
          'Install Compatible Versions' as vscode.MessageOptions
        ),
        'Error message not shown'
      );
    });
  });
});
