// Generated file. Do not edit.

import {
  InterfaceTypes,
  PipelineOutput,
  PipelineInput,
  runPipeline
} from 'itk-wasm'

import BloscZarrOptions from './BloscZarr-options.js'
import BloscZarrResult from './BloscZarr-result.js'


import { getPipelinesBaseUrl } from './pipelines-base-url.js'


import { getPipelineWorkerUrl } from './pipeline-worker-url.js'

/**
 * Compress or decompress binaries with Blosc
 *
 * @param {string} inputBinaryStream - The input binary stream
 * @param {string} outputBinaryStream - The output binary stream
 * @param {string} compressor - Blosc compressor
 * @param {number} inputSize - Input binary size in bytes
 *
 * @returns {Promise<BloscZarrResult>} - result object
 */
async function BloscZarr(
  webWorker: null | Worker,
  inputBinaryStream: string,
  outputBinaryStream: string,
  compressor: string,
  inputSize: number,
  options: BloscZarrOptions = {}
) : Promise<BloscZarrResult> {

  const desiredOutputs: Array<PipelineOutput> = [
  ]
  const inputs: Array<PipelineInput> = [
  ]

  const args = []
  // Inputs
  args.push(inputBinaryStream.toString())
  args.push(outputBinaryStream.toString())
  args.push(compressor.toString())
  args.push(inputSize.toString())
  // Outputs
  // Options
  args.push('--memory-io')
  if (typeof options.decompress !== "undefined") {
    args.push('--decompress')
  }
  if (typeof options.outputSize !== "undefined") {
    args.push('--output-size', options.outputSize.toString())
  }
  if (typeof options.compressionLevel !== "undefined") {
    args.push('--compression-level', options.compressionLevel.toString())
  }
  if (typeof options.typesize !== "undefined") {
    args.push('--typesize', options.typesize.toString())
  }
  if (typeof options.noShuffle !== "undefined") {
    args.push('--no-shuffle')
  }
  if (typeof options.verbose !== "undefined") {
    args.push('--verbose')
  }

  const pipelinePath = 'BloscZarr'

  const {
    webWorker: usedWebWorker,
    returnValue,
    stderr,
  } = await runPipeline(webWorker, pipelinePath, args, desiredOutputs, inputs, { pipelineBaseUrl: getPipelinesBaseUrl(), pipelineWorkerUrl: getPipelineWorkerUrl() })
  if (returnValue !== 0) {
    throw new Error(stderr)
  }

  const result = {
    webWorker: usedWebWorker as Worker,
  }
  return result
}

export default BloscZarr
