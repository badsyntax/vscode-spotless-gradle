import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from './logger';

export async function makeSpotless(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gradleApi: any,
  document: vscode.TextDocument
): Promise<null> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    return null;
  }
  logger.info('Running spotless on', path.basename(document.uri.fsPath));
  try {
    const saved = await document.save();
    if (!saved) {
      throw new Error(`Unable to save file ${document.fileName}`);
    }
    const args = [`-PspotlessFiles=${document.uri.fsPath}`];
    await gradleApi.runTask(workspaceFolder.uri.fsPath, 'spotlessApply', args);
  } catch (e) {
    logger.error('Error running spotless formatter', e.message);
  }
  return null;
}
