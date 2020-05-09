import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { formatFileWithCommand, formatFileOnSave } from '../testUtil';

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

describe('Extension Test Suite', function () {
  // Series of events:
  // 1. Save document
  // 2. Wait for spotless (which waits for vscode-gradle to load tasks)
  // 3. Formatting cancelled by vscode
  // 4. Save document
  // 5. Original spotless request still pending, so no effect on save
  // 6. Spotless returns (but due to 3, has no effect on the document)
  // 7. Save document
  // 8. Wait for spotless
  // 9. Apply formatting

  // The above steps show how complex it is to test for cancelled formatting.
  // As we can't cancel the spotless process (step 2) when the formatting is
  // cancelled, we just have to keep trying.
  // 10 * 5000 = max 50 seconds per test.
  this.retries(10);

  afterEach(async () => {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    fs.writeFileSync(appFilePath, appFileContents, 'utf8');
  });

  it('should run spotless when saving a file', async function () {
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
  });

  it('should run spotless when formatting a file', async () => {
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
    // check the document hasn't been saved
    assert.equal(document?.isDirty, true, 'The document was saved');
  });
});
