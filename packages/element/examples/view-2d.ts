import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
// import { ItkWasmMultiscaleSpatialImage } from '@itk-viewer/io/ItkWasmMultiscaleSpatialImage.js';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { ItkViewer2d } from '../src/itk-viewer-2d.js';

const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
setPipelineWorkerUrl(pipelineWorkerUrl);
const pipelineBaseUrl = '/itk/pipelines';
setPipelinesBaseUrl(pipelineBaseUrl);

document.addEventListener('DOMContentLoaded', async function () {
  const viewerElement = document.querySelector('#viewer')! as ItkViewer2d;
  const viewer = viewerElement.getActor();

  const imagePath = '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr';
  const url = new URL(imagePath, document.location.origin);
  const zarrImage = await ZarrMultiscaleSpatialImage.fromUrl(url);

  viewer!.send({ type: 'setImage', image: zarrImage, name: 'image' });

  // const image = new ItkWasmMultiscaleSpatialImage(
  //   await zarrImage.getImage(zarrImage.coarsestScale),
  // );
  // viewer!.send({ type: 'setImage', image, name: 'image' });
});
