import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { ExtensionApi as GradleApi, Output, RunBuildOpts } from 'vscode-gradle';
import { logger } from './logger';
import { getWorkspaceFolder, sanitizePath } from './util';
import {
  SPOTLESS_STATUSES,
  SPOTLESS_STATUS_IS_DIRTY,
  SPOTLESS_STATUS_IS_CLEAN,
} from './constants';
import { Deferred } from './Deferred';
import { Disposables } from './Disposables';

export class Spotless {
  private disposables = new Disposables();
  private readyHandlers: Array<(isReady: boolean) => void> = [];
  public isReady = false;

  constructor(private readonly gradleApi: GradleApi) {}

  public register(): void {
    this.disposables.add(
      this.gradleApi
        .getTaskProvider()
        .onDidLoadTasks((tasks: vscode.Task[]) => {
          this.isReady = this.hasSpotlessTask(tasks);
          this.readyHandlers.forEach((handler) => handler(this.isReady));
        })
    );
  }

  public dispose(): void {
    this.disposables.dispose();
  }

  public onReady(callback: (isReady: boolean) => void): void {
    this.readyHandlers.push(callback);
  }

  private hasSpotlessTask(tasks: vscode.Task[]): boolean {
    return !!tasks.find(
      (task) =>
        task.name === 'spotlessApply' || task.name.endsWith(':spotlessApply')
    );
  }

  public async apply(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string | null> {
    if (document.isClosed || document.isUntitled) {
      throw new Error(
        'Document is closed or not saved, skipping spotlessApply'
      );
    }
    const basename = path.basename(document.uri.fsPath);
    const sanitizedPath = sanitizePath(document.uri.fsPath);
    const args = [
      'spotlessApply',
      `-PspotlessIdeHook=${sanitizedPath}`,
      '-PspotlessIdeHookUseStdIn',
      '-PspotlessIdeHookUseStdOut',
      '--quiet',
    ];
    const workspaceFolder = getWorkspaceFolder(document.uri);
    const cancelledDeferred = new Deferred();

    cancellationToken?.onCancellationRequested(() =>
      cancelledDeferred.resolve(undefined)
    );

    let stdOut = '';
    let stdErr = '';

    const runBuildOpts: RunBuildOpts = {
      projectFolder: workspaceFolder.uri.fsPath,
      args,
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

    logger.info(`Running spotlessApply on ${basename}`);

    const runBuild = this.gradleApi.runBuild(runBuildOpts);

    await Promise.race([runBuild, cancelledDeferred.promise]);

    if (cancellationToken?.isCancellationRequested) {
      logger.warning('Spotless formatting cancelled');
    } else {
      const trimmedStdErr = stdErr.trim();

      if (SPOTLESS_STATUSES.includes(trimmedStdErr)) {
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
