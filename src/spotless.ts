import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from './logger';
import { ExtensionApi as GradleTasksApi } from 'vscode-gradle';

function escapeStringRegexp(str: string): string {
  return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function sanitizePath(fsPath: string): string {
  const platform = process.platform;
  if (platform === 'win32') {
    // vscode.Uri.fsPath will lowercase the drive letters
    // https://github.com/microsoft/vscode/blob/dc348340fd1a6c583cb63a1e7e6b4fd657e01e01/src/vs/vscode.d.ts#L1338
    return fsPath[0].toUpperCase() + fsPath.substr(1);
  }
  return fsPath;
}

export async function makeSpotless(
  gradleApi: GradleTasksApi,
  document: vscode.TextDocument
): Promise<null> {
  if (document.isClosed || document.isUntitled) {
    logger.warning('Document is closed or not saved yet, skipping');
    return null;
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    logger.error(
      `Unable to find workspace folder for ${path.basename(
        document.uri.fsPath
      )}, skipping`
    );
    return null;
  }
  logger.info('Running spotless on', path.basename(document.uri.fsPath));
  try {
    if (document.isDirty) {
      const saved = await document.save();
      if (!saved) {
        throw new Error(`Unable to save file ${document.fileName}`);
      }
    }
    const normalizedPath = escapeStringRegexp(
      sanitizePath(document.uri.fsPath)
    );
    const args = [`-PspotlessFiles=${normalizedPath}`];
    await gradleApi.runTask(workspaceFolder.uri.fsPath, 'spotlessApply', args);
  } catch (e) {
    logger.error('Error running spotless formatter:', e.message);
  }
  return null;
}
