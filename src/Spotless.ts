import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import {
  ExtensionApi as GradleApi,
  RunTaskOpts,
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

    cancellationToken.onCancellationRequested(() => {
      this.cancel(document);
      cancelledDeferred.resolve();
    });

    let stdOut = '';
    let stdErr = '';
    const sanitizedPath = sanitizePath(document.uri.fsPath);

    const runTaskOpts: RunTaskOpts = {
      projectFolder: workspaceFolder.uri.fsPath,
      taskName: 'spotlessApply',
      args: [
        `-PspotlessIdeHook=${sanitizedPath}`,
        '-PspotlessIdeHookUseStdIn',
        '-PspotlessIdeHookUseStdOut',
        '--quiet',
      ],
      input: document.getText(),
      showOutputColors: false,
      onOutput: (output: Output) => {
        const outputString = new util.TextDecoder('utf-8').decode(
          output.getOutputBytes_asU8()
        );
        switch (output.getOutputType()) {
          case Output.OutputType.STDOUT:
            stdOut += outputString;
            break;
          case Output.OutputType.STDERR:
            stdErr += outputString;
            break;
        }
      },
    };

    const runTask = this.gradleApi.runTask(runTaskOpts);

    await Promise.race([runTask, cancelledDeferred.promise]);

    const trimmedStdErr = stdErr.trim();

    if (cancellationToken.isCancellationRequested) {
      logger.warning('Spotless formatting cancelled');
    } else {
      if (SPOTLESS_STATUSES.includes(trimmedStdErr)) {
        const basename = path.basename(document.uri.fsPath);
        logger.info(`${basename}: ${trimmedStdErr}`);
      }
      if (trimmedStdErr === SPOTLESS_STATUS_IS_DIRTY) {
        return stdOut;
      }
      if (trimmedStdErr !== SPOTLESS_STATUS_IS_CLEAN) {
        throw new Error(trimmedStdErr || 'No status received from Spotless');
      }
    }
    return null;
  }
}
