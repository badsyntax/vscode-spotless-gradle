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
import { getWorkspaceFolder, sanitizePath } from './util';
import {
  SPOTLESS_STATUSES,
  SPOTLESS_STATUS_IS_DIRTY,
  SPOTLESS_STATUS_IS_CLEAN,
} from './constants';
import { Deferred } from './Deferred';
import { Difference, generateDifferences } from 'prettier-linter-helpers';

export interface SpotlessDiff {
  source: string;
  formattedSource: string;
  differences: Difference[];
}

export class Spotless {
  constructor(private readonly gradleApi: GradleApi) {}

  public cancel(document: vscode.TextDocument): Promise<void> {
    const workspaceFolder = getWorkspaceFolder(document.uri);
    const cancelTaskOpts: CancelTaskOpts = {
      projectFolder: workspaceFolder.uri.fsPath,
      taskName: 'spotlessApply',
    };
    return this.gradleApi.cancelRunTask(cancelTaskOpts);
  }

  public async getDiff(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<SpotlessDiff> {
    const source = document.getText();
    const formattedSource =
      (await this.apply(document, cancellationToken)) || '';
    let differences: Difference[] = [];
    if (formattedSource && source !== formattedSource) {
      differences = generateDifferences(source, formattedSource);
    }
    return {
      source,
      formattedSource,
      differences,
    };
  }

  public async apply(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string | null> {
    if (document.isClosed || document.isUntitled) {
      throw new Error('Document is closed or not saved, skipping formatting');
    }
    const workspaceFolder = getWorkspaceFolder(document.uri);
    const cancelledDeferred = new Deferred();

    cancellationToken?.onCancellationRequested(() => {
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

    if (cancellationToken?.isCancellationRequested) {
      logger.warning('Spotless formatting cancelled');
    } else {
      const trimmedStdErr = stdErr.trim();

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
