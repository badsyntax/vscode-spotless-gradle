import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { ExtensionApi as GradleApi, Output } from 'vscode-gradle';
import { logger } from './logger';
import { getWorkspaceFolder, sanitizePath } from './util';
import {
  SPOTLESS_STATUSES,
  SPOTLESS_STATUS_IS_DIRTY,
  SPOTLESS_STATUS_IS_CLEAN,
} from './constants';
import { Deferred } from './Deferred';
import { RunBuildOpts } from 'vscode-gradle/lib/api/Api'; // FIXME new vscode-gradle version required

export class Spotless {
  constructor(private readonly gradleApi: GradleApi) {}

  public async cancel(): Promise<void> {
    // FIXME: new vscode-gradle version required
    await this.gradleApi.cancelRunBuild({
      cancellationKey: this.cancellationKey,
    });
  }

  public onReady(callback: () => void): vscode.Disposable {
    return this.gradleApi.onReady(callback);
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
      this.cancel();
      cancelledDeferred.resolve();
    });

    let stdOut = '';
    let stdErr = '';
    const sanitizedPath = sanitizePath(document.uri.fsPath);

    const runBuildOpts: RunBuildOpts = {
      projectFolder: workspaceFolder.uri.fsPath,
      args: [
        'spotlessApply',
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

    const runBuild = this.gradleApi.runBuild(runBuildOpts);

    await Promise.race([runBuild, cancelledDeferred.promise]);

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
