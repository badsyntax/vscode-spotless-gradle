export class AsyncQueue<T> {
  private promise: Promise<T> | undefined;
  protected async queue(promise: Promise<T>): Promise<T> {
    if (this.promise) {
      await this.promise;
    }
    this.promise = promise;
    return this.promise.finally(() => {
      this.promise = undefined;
    });
  }
}
