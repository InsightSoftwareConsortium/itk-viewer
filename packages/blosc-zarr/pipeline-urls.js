import {
  getPipelinesBaseUrl as itkWasmGetPipelinesBaseUrl,
  getPipelineWorkerUrl as itkWasmGetPipelineWorkerUrl,
} from 'itk-wasm';
import { version } from './version.js';

let pipelinesBaseUrl;
let defaultPipelinesBaseUrl = `https://cdn.jsdelivr.net/npm/@itk-viewer/blosc-zarr@${version}/emscripten-build`;

export function setPipelinesBaseUrl(baseUrl) {
  pipelinesBaseUrl = baseUrl;
}

export function getPipelinesBaseUrl() {
  return (
    pipelinesBaseUrl ?? itkWasmGetPipelinesBaseUrl() ?? defaultPipelinesBaseUrl
  );
}

let pipelineWorkerUrl;
// Use the version shipped with an app's bundler
const defaultPipelineWorkerUrl = null;

export function setPipelineWorkerUrl(workerUrl) {
  pipelineWorkerUrl = workerUrl;
}

export function getPipelineWorkerUrl() {
  return (
    pipelineWorkerUrl ??
    itkWasmGetPipelineWorkerUrl() ??
    defaultPipelineWorkerUrl
  );
}
