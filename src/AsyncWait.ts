export class AsyncWait<T> {
  private promise: Promise<T> | undefined;
  private stale = false;
  protected async waitAndRun(func: () => Promise<T>): Promise<T | undefined> {
    if (this.promise) {
      this.stale = true;
    } else {
      this.promise = func();
      const result = await this.promise;
      this.promise = undefined;
      if (this.stale) {
        this.stale = false;
        return this.waitAndRun(func);
      }
      return result;
    }
  }
}
