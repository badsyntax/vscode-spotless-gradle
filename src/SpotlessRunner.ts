import * as vscode from 'vscode';
import { Spotless } from './Spotless';
export class SpotlessRunner {
  private promise: Promise<string | null> | undefined;

  constructor(private readonly spotless: Spotless) {}

  run(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string | null> {
    if (this.promise) {
      throw new Error('spotlessApply is already running');
    }
    this.promise = this.spotless.apply(document, cancellationToken);
    return this.promise.finally(() => {
      this.promise = undefined;
    });
  }
}
