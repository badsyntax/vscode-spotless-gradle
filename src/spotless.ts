import * as path from 'path';
import * as vscode from 'vscode';
import type {
  ExtensionApi as GradleTasksApi,
  RunTaskOpts,
} from 'vscode-gradle';
import { Output } from 'vscode-gradle';
import { logger } from './logger';
import { sanitizePath } from './util';
import {
  SPOTLESS_STATUSES,
  SPOTLESS_STATUS_IS_DIRTY,
  SPOTLESS_STATUS_IS_CLEAN,
} from './constants';

export async function makeSpotless(
  gradleApi: GradleTasksApi,
  document: vscode.TextDocument
): Promise<string | null> {
  if (document.isClosed || document.isUntitled) {
    throw new Error('Document is closed or not saved, skipping formatting');
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    throw new Error(
      `Unable to find workspace folder for ${path.basename(
        document.uri.fsPath
      )}`
    );
  }

  const sanitizedPath = sanitizePath(document.uri.fsPath);

  let stdOut = '';
  let stdErr = '';

  const runTaskOpts: RunTaskOpts = {
    projectFolder: workspaceFolder.uri.fsPath,
    taskName: 'spotlessApply',
    args: [
      `-PspotlessIdeHook=${sanitizedPath}`,
      '-PspotlessIdeHookUseStdIn',
      '-PspotlessIdeHookUseStdOut',
      '--quiet',
    ],
    showProgress: true,
    input: document.getText(),
    showOutputColors: false,
    onOutput: (output: Output) => {
      switch (output.getOutputType()) {
        case Output.OutputType.STDOUT:
          stdOut += String.fromCharCode(output.getMessageByte());
          break;
        case Output.OutputType.STDERR:
          stdErr += String.fromCharCode(output.getMessageByte());
          break;
      }
    },
  };

  await gradleApi.runTask(runTaskOpts);

  const stdErrClean = stdErr.trim();

  if (SPOTLESS_STATUSES.includes(stdErrClean)) {
    const basename = path.basename(document.uri.fsPath);
    logger.info(`${basename}: ${stdErrClean}`);
  }
  if (stdErrClean === SPOTLESS_STATUS_IS_DIRTY) {
    return stdOut;
  }
  if (stdErrClean !== SPOTLESS_STATUS_IS_CLEAN) {
    throw new Error(stdErrClean);
  }
  return null;
}
