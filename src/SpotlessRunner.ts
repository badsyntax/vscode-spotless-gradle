import * as vscode from 'vscode';
import { AsyncQueue } from './AsyncQueue';
import { Spotless } from './Spotless';

export class SpotlessRunner extends AsyncQueue<string | null> {
  constructor(private readonly spotless: Spotless) {
    super();
  }

  async run(
    document: vscode.TextDocument,
    cancellationToken?: vscode.CancellationToken
  ): Promise<string | null> {
    return this.queue(() => this.spotless.apply(document, cancellationToken));
  }
}
