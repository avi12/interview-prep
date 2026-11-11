export class Worker {
  readonly url: URL;
  readonly options: WorkerOptions;

  constructor(url: URL, options: WorkerOptions) {
    this.url = url;
    this.options = options;
  }
}
