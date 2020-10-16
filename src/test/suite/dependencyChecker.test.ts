/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as assert from 'assert';
import { DependencyChecker } from '../../DependencyChecker';
import { GRADLE_TASKS_EXTENSION_ID } from '../../constants';

describe('Dependency checker', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should match patch versions', async () => {
    sinon.stub(vscode.extensions, 'getExtension').callsFake(() => {
      return {
        id: GRADLE_TASKS_EXTENSION_ID,
        packageJSON: {
          version: '1.0.2',
        },
        isActive: true,
      } as vscode.Extension<any>;
    });
    const dependencyChecker = new DependencyChecker({
      extensionDependencies: [GRADLE_TASKS_EXTENSION_ID],
      extensionDependenciesCompatibility: {
        [GRADLE_TASKS_EXTENSION_ID]: '^1.0.1',
      },
    });
    const isValid = await dependencyChecker.check();
    assert.ok(isValid, 'Dependencies do not match');
  });

  it('should match minor versions', async () => {
    sinon.stub(vscode.extensions, 'getExtension').callsFake(() => {
      return {
        id: GRADLE_TASKS_EXTENSION_ID,
        packageJSON: {
          version: '1.1.0',
        },
        isActive: true,
      } as vscode.Extension<any>;
    });
    const dependencyChecker = new DependencyChecker({
      extensionDependencies: [GRADLE_TASKS_EXTENSION_ID],
      extensionDependenciesCompatibility: {
        [GRADLE_TASKS_EXTENSION_ID]: '^1.0.1',
      },
    });
    const isValid = await dependencyChecker.check();
    assert.ok(isValid, 'Dependencies do not match');
  });

  it('should not match major versions', async () => {
    const errorSpy = sinon.spy(vscode.window, 'showErrorMessage');
    sinon.stub(vscode.extensions, 'getExtension').callsFake(() => {
      return {
        id: GRADLE_TASKS_EXTENSION_ID,
        packageJSON: {
          version: '2.0.0',
        },
        isActive: true,
      } as vscode.Extension<any>;
    });
    const dependencyChecker = new DependencyChecker({
      extensionDependencies: [GRADLE_TASKS_EXTENSION_ID],
      extensionDependenciesCompatibility: {
        [GRADLE_TASKS_EXTENSION_ID]: '^1.0.1',
      },
    });
    const isValid = await dependencyChecker.check();
    assert.equal(isValid, false, 'Dependencies match');
    assert.ok(
      errorSpy.calledWith(
        'Dependant extension versions are incompatible: richardwillis.vscode-gradle@^1.0.1. Update those extensions to use this version of Spotless Gradle.',
        'Install Compatible Versions' as vscode.MessageOptions
      ),
      'Error message not shown'
    );
  });
});
