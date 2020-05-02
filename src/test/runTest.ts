import * as path from 'path';
import * as cp from 'child_process';

import {
  runTests,
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
} from 'vscode-test';

async function main(): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    const vscodeExecutablePath = await downloadAndUnzipVSCode('1.44.2');
    const cliPath = resolveCliPathFromVSCodeExecutablePath(
      vscodeExecutablePath
    );

    cp.spawnSync(
      cliPath,
      ['--install-extension', 'richardwillis.vscode-gradle'],
      {
        encoding: 'utf-8',
        stdio: 'inherit',
      }
    );

    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        path.resolve(__dirname, '../../test-fixtures/gradle-project/'),
        '--disable-extension=vscjava.vscode-java-pack',
        '--disable-extension=redhat.java',
        '--disable-extension=vscjava.vscode-java-dependency',
        '--disable-extension=vscjava.vscode-java-test',
        '--disable-extension=shengchen.vscode-checkstyle',
        '--disable-extension=eamodio.gitlens',
        '--disable-extension=sonarsource.sonarlint-vscode',
      ],
    });
  } catch (err) {
    console.error('Failed to run tests', err.message);
    process.exit(1);
  }
}

main();
