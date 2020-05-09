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
  SPOTLESS_STATUS_DID_NOT_CONVERGE,
  SPOTLESS_STATUS_IS_CLEAN,
} from './constants';

interface OutputBuffers {
  stdOut: string[];
  stdErr: string[];
}

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
  const outputBuffers: OutputBuffers = {
    stdOut: [],
    stdErr: [],
  };

  const runTaskOpts: RunTaskOpts = {
    projectFolder: workspaceFolder.uri.fsPath,
    taskName: 'spotlessApply',
    args: [`-PspotlessIdeHook=${sanitizedPath}`, '--quiet'],
    showProgress: true,
    input: document.getText(),
    showOutputColors: false,
    onOutput: (output: Output) => {
      switch (output.getOutputType()) {
        case Output.OutputType.STDOUT:
          outputBuffers.stdOut.push(output.getMessage());
          break;
        case Output.OutputType.STDERR:
          outputBuffers.stdErr.push(output.getMessage());
          break;
      }
    },
  };

  await gradleApi.runTask(runTaskOpts);

  const stdOut = outputBuffers.stdOut.join('');
  const stdErr = outputBuffers.stdErr.join('').trim();

  if (SPOTLESS_STATUSES.includes(stdErr)) {
    logger.debug('Status:', stdErr);
  }
  if (stdErr === SPOTLESS_STATUS_IS_DIRTY) {
    return stdOut;
  }
  if (
    stdErr !== SPOTLESS_STATUS_DID_NOT_CONVERGE &&
    stdErr !== SPOTLESS_STATUS_IS_CLEAN
  ) {
    throw new Error(stdErr);
  }
  return null;
}
