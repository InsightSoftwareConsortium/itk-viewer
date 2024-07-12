import { getPipelinesBaseUrl as itkWasmGetPipelinesBaseUrl, getPipelineWorkerUrl as itkWasmGetPipelineWorkerUrl } from "itk-wasm";
import { version } from "./version.js";

let pipelinesBaseUrl
let defaultPipelinesBaseUrl  =
  `https://cdn.jsdelivr.net/npm/@itk-viewer/blosc-zarr@${version}/`;

export function setPipelinesBaseUrl(baseUrl)  {
  pipelinesBaseUrl = baseUrl;
}

export function getPipelinesBaseUrl() {
  if (typeof pipelinesBaseUrl !== "undefined") {
    return pipelinesBaseUrl;
  }
  const itkWasmPipelinesBaseUrl = itkWasmGetPipelinesBaseUrl();
  if (typeof itkWasmPipelinesBaseUrl !== "undefined") {
    return itkWasmPipelinesBaseUrl;
  }
  return defaultPipelinesBaseUrl;
}

let pipelineWorkerUrl
// Use the version shipped with an app's bundler
const defaultPipelineWorkerUrl = null

export function setPipelineWorkerUrl (workerUrl)  {
  pipelineWorkerUrl = workerUrl
}

export function getPipelineWorkerUrl () {
  if (typeof pipelineWorkerUrl !== 'undefined') {
    return pipelineWorkerUrl
  }
  const itkWasmPipelineWorkerUrl = itkWasmGetPipelineWorkerUrl()
  if (typeof itkWasmPipelineWorkerUrl !== 'undefined') {
    return itkWasmPipelineWorkerUrl
  }
  return defaultPipelineWorkerUrl
}

