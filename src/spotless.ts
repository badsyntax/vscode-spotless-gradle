import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from './logger';
import type {
  ExtensionApi as GradleTasksApi,
  RunTaskOpts,
} from 'vscode-gradle';
import { Output } from 'vscode-gradle';
import { sanitizePath } from './util';

const SPOTLESS_STATUS_IS_CLEAN = 'IS CLEAN';
const SPOTLESS_STATUS_DID_NOT_CONVERGE = 'DID NOT CONVERGE';
const SPOTLESS_STATUS_IS_DIRTY = 'IS DIRTY';

const SPOTLESS_STATUSES = [
  SPOTLESS_STATUS_DID_NOT_CONVERGE,
  SPOTLESS_STATUS_IS_CLEAN,
  SPOTLESS_STATUS_IS_DIRTY,
];

interface TextBuffers {
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
  const textBuffers: TextBuffers = {
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
