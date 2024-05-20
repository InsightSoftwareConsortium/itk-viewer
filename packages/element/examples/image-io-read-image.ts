import { readImage } from '@itk-wasm/image-io';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { ItkWasmMultiscaleSpatialImage } from '@itk-viewer/io/ItkWasmMultiscaleSpatialImage.js';
import { ItkViewer2d } from '../src/itk-viewer-2d.js';

const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
setPipelineWorkerUrl(pipelineWorkerUrl);
const pipelineBaseUrl = '/itk/pipelines';
setPipelinesBaseUrl(pipelineBaseUrl);

document.addEventListener('DOMContentLoaded', async function () {
  const viewerElement = document.querySelector('#viewer')! as ItkViewer2d;
  const viewer = viewerElement.getActor();

  const path = 'prostate-slight-rotation.nrrd';
  const url = new URL(path, document.location.origin);
  const response = await fetch(url.href);
  const data = new Uint8Array(await response.arrayBuffer());
  const inputFile = { data, path: path };
  const { image: itkimage } = await readImage(inputFile);
  const image = new ItkWasmMultiscaleSpatialImage(itkimage);

  viewer!.send({ type: 'setImage', image, name: 'image' });
});
