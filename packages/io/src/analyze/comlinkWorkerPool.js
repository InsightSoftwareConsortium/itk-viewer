import { WorkerPool } from 'itk-wasm';
import * as Comlink from 'comlink';

export function comlinkWorkerPool(numberOfWorkers, makeWorker, operationName) {
  const createWorker = (existingWorker) => {
    if (existingWorker) {
      return existingWorker;
    }

    const worker = makeWorker();
    const proxy = Comlink.wrap(worker);
    worker.proxy = proxy;

    const originalTerminate = worker.terminate;
    worker.terminate = () => {
      proxy.releaseProxy();
      originalTerminate();
    };
    return worker;
  };

  const compute = async (webWorker, ...args) => {
    const worker = createWorker(webWorker);
    const result = await worker.proxy[operationName](...args);
    return { result, webWorker: worker };
  };

  const workerPool = new WorkerPool(numberOfWorkers, compute);

  return workerPool;
}
