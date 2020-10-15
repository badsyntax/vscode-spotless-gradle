export interface Command {
  readonly id: string | string[];
  execute(...args: unknown[]): void;
}
