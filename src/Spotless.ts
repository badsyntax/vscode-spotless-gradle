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
import { Deferred } from './Deferred';

export class Spotless {
  constructor(private readonly gradleApi: GradleApi) {}

  cancel(document: vscode.TextDocument): Promise<void> {
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
    return this.gradleApi.cancelRunTask(cancelTaskOpts);
  }

  async apply(
    document: vscode.TextDocument,
    cancellationToken: vscode.CancellationToken
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

    const cancelledDeferred = new Deferred();
    const stdOutDeferred = new Deferred();
    const stdErrDeferred = new Deferred();
    const hasStdErrAndStdOut = Promise.all([
      stdOutDeferred.promise,
      stdErrDeferred.promise,
    ]);

    cancellationToken.onCancellationRequested(() => {
      this.cancel(document);
      cancelledDeferred.resolve();
    });

    let stdOut = '';
    let stdErr = '';
    const sanitizedPath = sanitizePath(document.uri.fsPath);

    // Don't stream the output as bytes. Request the output to be streamed
    // as a string only when the stdout or stderr streams are closed.
    const outputStream = RunTaskRequest.OutputStream.STRING;

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
      outputStream,
      onOutput: (output: Output) => {
        switch (output.getOutputType()) {
          case Output.OutputType.STDOUT:
            stdOut = output.getOutputString();
            stdOutDeferred.resolve();
            break;
          case Output.OutputType.STDERR:
            stdErr = output.getOutputString().trim();
            stdErrDeferred.resolve();
            break;
        }
      },
    };

    const runTask = this.gradleApi.runTask(runTaskOpts);

    await Promise.race([
      runTask,
      hasStdErrAndStdOut,
      cancelledDeferred.promise,
    ]);

    if (cancellationToken.isCancellationRequested) {
      logger.warning('Spotless formatting cancelled');
    } else {
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
    }
    return null;
  }
}
