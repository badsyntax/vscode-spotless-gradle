import * as path from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { Difference, generateDifferences } from 'prettier-linter-helpers';
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
  GRADLE_TASKS_EXTENSION_ID,
} from './constants';
import { Deferred } from './Deferred';

const spotlessApplyTask = 'spotlessApply';

export class Spotless {
  constructor(private readonly gradleApi: GradleApi) {}

  public cancel(document: TextDocument): Promise<void> {
    const workspaceFolder = getWorkspaceFolder(document.uri);
    const cancelTaskOpts: CancelTaskOpts = {
      projectFolder: workspaceFolder.uri.fsPath,
      taskName: spotlessApplyTask,
    };
    return this.gradleApi.cancelRunTask(cancelTaskOpts);
  }

  public async getDiff(
    document: TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<{
    source: string;
    formattedSource: string;
    differences: Difference[];
  }> {
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
    document: TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string | null> {
    document.uri;
    // if (document.isClosed || document.isUntitled) {
    //   throw new Error('Document is closed or not saved, skipping formatting');
    // }
    const workspaceFolder = getWorkspaceFolder(document.uri);
    const cancelledDeferred = new Deferred();

    cancellationToken.onCancellationRequested(() => {
      this.cancel(document);
      cancelledDeferred.resolve();
    });

    let stdOut = '';
    let stdErr = '';
    const sanitizedPath = sanitizePath(document.uri);

    const runTaskOpts: RunTaskOpts = {
      projectFolder: workspaceFolder.uri.fsPath,
      taskName: spotlessApplyTask,
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

    if (cancellationToken.isCancellationRequested) {
      logger.warning('Spotless formatting cancelled');
    } else {
      const trimmedStdErr = stdErr.trim();

      if (SPOTLESS_STATUSES.includes(trimmedStdErr)) {
        const basename = path.basename(document.uri);
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

// let spotless: Spotless;

// export async function getSpotless(): Promise<Spotless> {
//   if (spotless) {
//     return spotless;
//   }
//   const gradleTasksExtension = vscode.extensions.getExtension(
//     GRADLE_TASKS_EXTENSION_ID
//   );
//   // vscode should be checking this for us (via `extensionDependencies`), but
//   // we're also doing this as a type-check.
//   if (!gradleTasksExtension) {
//     throw new Error('Gradle Tasks extension is not installed');
//   }

//   await gradleTasksExtension.activate();

//   const gradleApi = gradleTasksExtension.exports as GradleApi;
//   return new Spotless(gradleApi);
// }
