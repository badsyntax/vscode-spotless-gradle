import * as path from 'path';
import * as vscode from 'vscode';
import {
  ExtensionApi as GradleApi,
  RunTaskOpts,
  RunTaskRequest,
  CancelTaskOpts,
  Output,
} from 'vscode-gradle';
import { logger } from './logger';
import { sanitizePath } from './util';
import {
  SPOTLESS_STATUSES,
  SPOTLESS_STATUS_IS_DIRTY,
  SPOTLESS_STATUS_IS_CLEAN,
} from './constants';

export function cancelMakeSpotless(
  gradleApi: GradleApi,
  document: vscode.TextDocument
): Promise<void> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    throw new Error(
      `Unable to find workspace folder for ${path.basename(
        document.uri.fsPath
      )}`
    );
  }
  const cancelTaskOpts: CancelTaskOpts = {
    projectFolder: workspaceFolder.uri.fsPath,
    taskName: 'spotlessApply',
  };
  return gradleApi.cancelRunTask(cancelTaskOpts);
}

export async function makeSpotless(
  gradleApi: GradleApi,
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
    // Don't stream bytes to support super-massive files
    outputStream: RunTaskRequest.OutputStream.STRING,
    onOutput: (output: Output) => {
      switch (output.getOutputType()) {
        case Output.OutputType.STDOUT:
          stdOut = output.getMessage();
          break;
        case Output.OutputType.STDERR:
          stdErr = output.getMessage().trim();
          break;
      }
    },
  };

  await gradleApi.runTask(runTaskOpts);

  if (SPOTLESS_STATUSES.includes(stdErr)) {
    const basename = path.basename(document.uri.fsPath);
    logger.info(`${basename}: ${stdErr}`);
  }
  if (stdErr === SPOTLESS_STATUS_IS_DIRTY) {
    return stdOut;
  }
  if (stdErr !== SPOTLESS_STATUS_IS_CLEAN) {
    throw new Error(stdErr);
  }
  return null;
}
