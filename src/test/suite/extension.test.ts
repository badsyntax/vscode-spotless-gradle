import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import {
  rerunIfCancelled,
  formatFileWithCommand,
  formatFileOnSave,
} from '../testUtil';

const SPOTLESS_EXTENSION_ID = 'richardwillis.vscode-spotless-gradle';
const GRADLE_TASKS_EXTENSION_ID = 'richardwillis.vscode-gradle';

const spotlessExtension = vscode.extensions.getExtension(SPOTLESS_EXTENSION_ID);
const gradleTasksExtension = vscode.extensions.getExtension(
  GRADLE_TASKS_EXTENSION_ID
);

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

describe('Extension Test Suite', () => {
  before(function (done) {
    // It's a high timeout as gradle needs to install deps
    this.timeout(90000);

    // Although the vscode-gradle `runTask` api also waits for tasks to be
    // loaded before running a task, we do this here to speed up the tests,
    // as once the tasks are loaded formatting should be quick.
    gradleTasksExtension?.exports.onTasksLoaded(done);
  });

  afterEach(async () => {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    fs.writeFileSync(appFilePath, appFileContents, 'utf8');
  });

  it('should run spotless when saving a file', async () => {
    const document = await rerunIfCancelled(
      spotlessExtension!.exports.fixAllProvider.onCancelled,
      () => formatFileOnSave(appFilePath)
    );
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
  });

  it('should run spotless when formatting a file', async () => {
    const document = await rerunIfCancelled(
      spotlessExtension!.exports.documentFormattingEditProvider.onCancelled,
      () => formatFileWithCommand(appFilePath)
    );
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
    // check the document hasn't been saved
    assert.equal(document?.isDirty, true, 'The document was saved');
  });
});
