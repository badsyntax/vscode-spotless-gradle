import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from './logger';
import type {
  ExtensionApi as GradleTasksApi,
  RunTaskOpts,
} from 'vscode-gradle';
import { Output } from 'vscode-gradle';

const SPOTLESS_STATUS_IS_CLEAN = 'IS CLEAN';
const SPOTLESS_STATUS_DID_NOT_CONVERGE = 'DID NOT CONVERGE';
const SPOTLESS_STATUS_IS_DIRTY = 'IS DIRTY';

const SPOTLESS_STATUSES = [
  SPOTLESS_STATUS_DID_NOT_CONVERGE,
  SPOTLESS_STATUS_IS_CLEAN,
  SPOTLESS_STATUS_IS_DIRTY,
];

function sanitizePath(fsPath: string): string {
  if (process.platform === 'win32') {
    // vscode.Uri.fsPath will lower-case the drive letters
    // https://github.com/microsoft/vscode/blob/dc348340fd1a6c583cb63a1e7e6b4fd657e01e01/src/vs/vscode.d.ts#L1338
    return fsPath[0].toUpperCase() + fsPath.substr(1);
  }
  return fsPath;
}

interface TextBuffers {
  stdOut: string[];
  stdErr: string[];
}

export async function makeSpotless(
  gradleApi: GradleTasksApi,
  document: vscode.TextDocument
): Promise<string | null> {
  if (document.isClosed || document.isUntitled) {
    throw new Error('Document is closed or not saved yet, skipping');
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    throw new Error(
      `Unable to find workspace folder for ${path.basename(
        document.uri.fsPath
      )}, skipping`
    );
  }

  const sanitizedPath = sanitizePath(document.uri.fsPath);
  const args = [`-PspotlessIdeHook=${sanitizedPath}`, '--quiet'];
  const textBuffers: TextBuffers = {
    stdOut: [],
    stdErr: [],
  };

  const runTaskOpts: RunTaskOpts = {
    projectFolder: workspaceFolder.uri.fsPath,
    taskName: 'spotlessApply',
    args,
    showProgress: true,
    input: document.getText(),
    showOutputColors: false,
    onOutput: (output: Output) => {
      switch (output.getOutputType()) {
        case Output.OutputType.STDOUT:
          textBuffers.stdOut.push(output.getMessage());
          break;
        case Output.OutputType.STDERR:
          textBuffers.stdErr.push(output.getMessage());
          break;
      }
    },
  };

  await gradleApi.runTask(runTaskOpts);

  const stdOut = textBuffers.stdOut.join('');
  const stdErr = textBuffers.stdErr.join('').trim();

  if (SPOTLESS_STATUSES.includes(stdErr)) {
    logger.debug('Spotless:', stdErr);
  }
  if (stdErr === SPOTLESS_STATUS_IS_DIRTY) {
    return stdOut;
  }
  if (
    stdErr !== SPOTLESS_STATUS_DID_NOT_CONVERGE &&
    stdErr !== SPOTLESS_STATUS_IS_CLEAN
  ) {
    logger.error(stdErr);
  }
  return null;
}
