import * as vscode from 'vscode';
import { Spotless } from './Spotless';

export class SpotlessRunner {
  private promise: Promise<string | null> | undefined;

  constructor(private readonly spotless: Spotless) {}

  async run(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string | null> {
    return this.queue(this.spotless.apply(document, cancellationToken));
  }

  private async queue(promise: Promise<string | null>): Promise<string | null> {
    if (this.promise) {
      await this.promise;
    }
    this.promise = promise;
    return this.promise.finally(() => {
      this.promise = undefined;
    });
  }
}
