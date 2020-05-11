import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as assert from 'assert';
import { formatFileWithCommand, formatFileOnSave } from '../testUtil';
import { logger } from '../../logger';

const basePath = path.resolve(
  __dirname,
  '../../../test-fixtures/gradle-project/src/main/java/gradle/project'
);

const appFilePath = path.resolve(basePath, 'App.java');
const appFileContents = fs.readFileSync(appFilePath, 'utf8');
const helloFilePath = path.resolve(basePath, 'Hello.java');
const helloFileContents = fs.readFileSync(helloFilePath, 'utf8');
const expectedFileContents = `package gradle.project;

public class App {
  public static void main(String[] args) {
    System.out.println("app");
  }
}
`;

describe('Extension Test Suite', function () {
  // VsCode will cancel the formatting so we have to keep trying.
  // 10 * 5000 = max 50 seconds per test.
  this.retries(10);

  afterEach(async () => {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    fs.writeFileSync(appFilePath, appFileContents, 'utf8');
    sinon.restore();
  });

  it('should run spotless when saving a file', async function () {
    const loggerSpy = sinon.spy(logger, 'info');
    const document = await formatFileOnSave(appFilePath);
    assert.equal(
      document?.getText(),
      expectedFileContents,
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
      expectedFileContents,
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

  describe('Errors', () => {
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
      const document = await vscode.workspace.openTextDocument(invalidFilePath);
      await vscode.window.showTextDocument(document);
      vscode.commands.executeCommand('editor.action.formatDocument');
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
