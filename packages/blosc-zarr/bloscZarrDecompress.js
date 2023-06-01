import { runPipeline, InterfaceTypes, WorkerPool } from 'itk-wasm';
import { getSize } from '@itk-viewer/wasm-utils/dtypeUtils.js';
import { getPipelineWorkerUrl, getPipelinesBaseUrl } from './typescript/src';

/**
 * Input:
 *
 *   chunkData: An Array of
 *
 *     {
 *       data: chunkArrayBuffer,
 *       metadata: zarrayMetadata
 *     }
 *
 *   objects.
 *
 *
 * Output:
 *
 *   An Array of decompressed ArrayBuffer chunks.
 */
export async function bloscZarrDecompress(chunkData) {
  const options = {
    pipelineBaseUrl: getPipelinesBaseUrl(),
    pipelineWorkerUrl: getPipelineWorkerUrl(),
  };
  const cores = navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : 4;
  const numberOfWorkers = cores + Math.floor(Math.sqrt(cores));
  const workerPool = new WorkerPool(numberOfWorkers, runPipeline);
  const desiredOutputs = [{ type: InterfaceTypes.BinaryStream }];
  const taskArgsArray = [];
  let dtype = null;

  let results = [];
  let webWorker;
  for (let index = 0; index < chunkData.length; index++) {
    const zarrayMetadata = chunkData[index].metadata;
    const compressedChunk = chunkData[index].data;
    console.log(compressedChunk);
    console.log(zarrayMetadata);
    dtype = zarrayMetadata.dtype;
    const nElements = zarrayMetadata.chunks.reduce((a, b) => a * b);
    const elementSize = getSize(dtype);
    if (!elementSize) throw Error('Unknown dtype in .zarray metadata');
    const outputSize = nElements * elementSize;
    const inputs = [
      {
        type: InterfaceTypes.BinaryStream,
        data: { data: new Uint8Array(compressedChunk) },
      },
    ];
    const args = [
      '0',
      '0',
      zarrayMetadata.compressor.cname,
      compressedChunk.byteLength.toString(),
      '--output-size',
      outputSize.toString(),
      '--decompress',
      '--memory-io',
    ];
    // taskArgsArray.push(['BloscZarr', args, desiredOutputs, inputs, options]);

    const pipelinePath = 'BloscZarr';
    const {
      webWorker: usedWebWorker,
      returnValue,
      outputs,
      stderr,
    } = await runPipeline(
      webWorker,
      pipelinePath,
      args,
      desiredOutputs,
      inputs,
      {
        pipelineBaseUrl: getPipelinesBaseUrl(),
        pipelineWorkerUrl: getPipelineWorkerUrl(),
      }
    );
    results.push(outputs[0].data.data.buffer);
    webWorker = usedWebWorker;
  }
  // const results = await workerPool.runTasks(taskArgsArray).promise;

  return results; // results.map((result) => result.outputs[0].data.data.buffer);
}
