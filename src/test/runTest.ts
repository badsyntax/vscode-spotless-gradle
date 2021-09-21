import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';

import {
  runTests,
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
} from 'vscode-test';

const VSCODE_VERSION = '1.45.0';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const fixturePath = path.resolve(
    __dirname,
    '../../test-fixtures/gradle-project/'
  );
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-user'));
  fs.copySync(
    path.resolve(__dirname, '../../test-fixtures/vscode-user/User'),
    path.join(tmpDir, 'User')
  );

  try {
    const vscodeExecutablePath = await downloadAndUnzipVSCode(VSCODE_VERSION);
    const cliPath =
      resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

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
        fixturePath,
        '--disable-extension=vscjava.vscode-java-pack',
        '--disable-extension=redhat.java',
        '--disable-extension=vscjava.vscode-java-dependency',
        '--disable-extension=vscjava.vscode-java-test',
        '--disable-extension=shengchen.vscode-checkstyle',
        '--disable-extension=eamodio.gitlens',
        '--disable-extension=sonarsource.sonarlint-vscode',
        '--disable-extension=esbenp.prettier-vscode',
        `--user-data-dir=${tmpDir}`,
      ],
    });
  } catch (err) {
    console.error('Failed to run tests', (err as Error).message);
    process.exit(1);
  } finally {
    fs.removeSync(tmpDir);
  }
}

main();
