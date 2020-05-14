/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as semver from 'semver';
import {
  INSTALL_COMPATIBLE_EXTENSION_VERSIONS,
  SPOTLESS_GRADLE_EXTENSION_ID,
} from './constants';

export interface PackageJson {
  extensionDependencies: string[];
  extensionDependenciesCompatibility?: {
    [key: string]: string;
  };
  [key: string]: any;
}

export interface ExtensionVersion {
  id: string;
  required: string;
  compatible: boolean;
}

export class DependencyChecker {
  constructor(private readonly packageJson: PackageJson) {
    if (!packageJson.extensionDependenciesCompatibility) {
      throw new Error(
        `'extensionDependenciesCompatibility' not specified in packageJson`
      );
    }
  }

  public async check(): Promise<boolean> {
    const extensions = this.getExtensionDependencies();
    const extensionVersions = this.getExtensionVersions(extensions);
    const incompatibleExtensions = extensionVersions.filter(
      (extensionVersion) => !extensionVersion.compatible
    );

    if (incompatibleExtensions.length) {
      this.notify(incompatibleExtensions);
      return false;
    }

    return true;
  }

  private getExtensionDependencies(): vscode.Extension<any>[] {
    return this.packageJson.extensionDependencies
      .map((extensionDependency) =>
        vscode.extensions.getExtension(extensionDependency)
      )
      .filter(
        (extensionDependency) =>
          extensionDependency && extensionDependency.isActive
      ) as vscode.Extension<any>[];
  }

  private getExtensionVersions(
    extensions: vscode.Extension<any>[]
  ): ExtensionVersion[] {
    const {
      extensionDependenciesCompatibility: compatibleVersions,
    } = this.packageJson;
    return extensions.map((extensionDependency) => {
      const extensionVersion = extensionDependency.packageJSON.version;
      const requiredVersion = compatibleVersions![extensionDependency.id];
      const version: ExtensionVersion = {
        id: extensionDependency.id,
        required: requiredVersion,
        compatible: semver.satisfies(
          extensionVersion,
          semver.validRange(requiredVersion)
        ),
      };
      return version;
    });
  }

  private async notify(
    incompatibleExtensions: ExtensionVersion[]
  ): Promise<void> {
    const requiredVersions = incompatibleExtensions
      .map((extension) => `${extension.id}@${extension.required}`)
      .join(', ');
    const message = [
      `Extension versions are incompatible: ${requiredVersions}.`,
      'Install those specific versions or update this extension.',
    ].join(' ');
    const input = await vscode.window.showErrorMessage(
      message,
      INSTALL_COMPATIBLE_EXTENSION_VERSIONS
    );
    if (input === INSTALL_COMPATIBLE_EXTENSION_VERSIONS) {
      const extensionIds = incompatibleExtensions.map(
        (extension) => extension.id
      );
      extensionIds.push(SPOTLESS_GRADLE_EXTENSION_ID);
      // From here it's up to the user to choose the correct dependency
      await vscode.commands.executeCommand(
        'workbench.extensions.action.showExtensionsWithIds',
        extensionIds
      );
    }
  }
}
