import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';
import { ExtensionApi as GradleTasksApi } from 'vscode-gradle';

function escapePath(str: string): string {
  return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function sanitizePath(fsPath: string): string {
  const platform = process.platform;
  if (platform === 'win32') {
    // vscode.Uri.fsPath will lowercase the windows drive letters
    return fsPath[0].toUpperCase() + fsPath.substr(1);
  }
  return fsPath;
}

function updateConfig(
  config: vscode.WorkspaceConfiguration,
  value: object | unknown
): Thenable<void> {
  return config.update('exclude', value, vscode.ConfigurationTarget.Workspace);
}

export async function makeSpotless(
  gradleApi: GradleTasksApi,
  document: vscode.TextDocument
): Promise<string | void> {
  if (document.isClosed || document.isUntitled) {
    return logger.warning('Document is closed or not saved yet, skipping');
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    return logger.error(
      `Unable to find workspace folder for ${path.basename(
        document.uri.fsPath
      )}, skipping`
    );
  }
  logger.info('Running spotless on', path.basename(document.uri.fsPath));

  const filesConfig = vscode.workspace.getConfiguration(
    'files',
    workspaceFolder.uri
  );
  const excludedFiles = filesConfig.inspect('exclude');

  const sanitizedPath = sanitizePath(document.uri.fsPath);
  const extName = path.extname(sanitizedPath);
  const fileName = path.basename(sanitizedPath, extName);
  const tmpName = `${fileName}_${Date.now()}${extName}`;
  const dirName = path.dirname(sanitizedPath);
  const tmpFile = path.join(dirName, tmpName);
  const relativeTmpFile = path.relative(workspaceFolder.uri.fsPath, tmpFile);

  // As we can't use streams (stdin & stdout) to format the code with spotless we
  // have to use temporary files, and tell vscode to ignore those temporary files.
  try {
    await updateConfig(filesConfig, {
      ...(excludedFiles?.workspaceValue as object),
      [relativeTmpFile]: true,
    });
    fs.writeFileSync(tmpFile, document.getText(), 'utf8');
    const escapedPath = escapePath(tmpFile);
    const args = [`-PspotlessFiles=${escapedPath}`];
    await gradleApi.runTask(workspaceFolder.uri.fsPath, 'spotlessApply', args);
    return fs.readFileSync(tmpFile, 'utf8');
  } catch (e) {
    logger.error('Error running spotless formatter:', e.message);
  } finally {
    await updateConfig(filesConfig, excludedFiles?.workspaceValue);
    fs.unlinkSync(tmpFile);
  }
}
