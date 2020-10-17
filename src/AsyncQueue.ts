export class AsyncQueue<T> {
  private promise: Promise<T> | undefined;
  protected async queue(func: () => Promise<T>): Promise<T> {
    if (this.promise) {
      await this.promise;
    }
    this.promise = func();
    return this.promise.finally(() => {
      this.promise = undefined;
    });
  }
}
