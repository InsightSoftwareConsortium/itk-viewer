import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';

const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
setPipelineWorkerUrl(pipelineWorkerUrl);
const pipelineBaseUrl = '/itk/pipelines';
setPipelinesBaseUrl(pipelineBaseUrl);

const makeZarrImage = (imagePath: string) => {
  const url = new URL(imagePath, document.location.origin);
  return ZarrMultiscaleSpatialImage.fromUrl(url);
};

document.addEventListener('DOMContentLoaded', async function () {
  const image = await makeZarrImage(
    '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr',
  );

  const viewerElement = document.querySelector('itk-viewer');
  if (!viewerElement) throw new Error('Could not find element');
  const viewer = viewerElement.getActor();
  viewer.send({ type: 'setImage', image, name: 'image' });

  const first2d = document.querySelectorAll('itk-view-2d')[0];
  first2d.getActor()?.send({ type: 'setScale', scale: 0 });

  const image2d = await makeZarrImage(
    '/ome-ngff-prototypes/single_image/v0.4/tyx.ome.zarr',
  );
  const lastViewport = document.querySelectorAll('itk-viewport')[2];
  if (!lastViewport) throw new Error('Could not find viewport element');
  const viewActor = lastViewport.getActor();
  if (!viewActor) throw new Error('No view actor');
  viewActor.send({ type: 'setImage', image: image2d });
  // viewActor.send({ type: 'setSlice', slice: 0.8 });
});
