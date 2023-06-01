// Generated file. Do not edit.

import {
  InterfaceTypes,
  PipelineOutput,
  PipelineInput,
  runPipelineNode
} from 'itk-wasm'

import BloscZarrOptions from './BloscZarr-options.js'
import BloscZarrNodeResult from './BloscZarr-node-result.js'


import path from 'path'

/**
 * Compress or decompress binaries with Blosc
 *
 * @param {string} inputBinaryStream - The input binary stream
 * @param {string} outputBinaryStream - The output binary stream
 * @param {string} compressor - Blosc compressor
 * @param {number} inputSize - Input binary size in bytes
 *
 * @returns {Promise<BloscZarrNodeResult>} - result object
 */
async function BloscZarrNode(
  inputBinaryStream: string,
  outputBinaryStream: string,
  compressor: string,
  inputSize: number,
  options: BloscZarrOptions = {}
) : Promise<BloscZarrNodeResult> {

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

  const pipelinePath = path.join(path.dirname(import.meta.url.substring(7)), '..', 'pipelines', 'BloscZarr')

  const {
    returnValue,
    stderr,
  } = await runPipelineNode(pipelinePath, args, desiredOutputs, inputs)
  if (returnValue !== 0) {
    throw new Error(stderr)
  }

  const result = {
  }
  return result
}

export default BloscZarrNode
