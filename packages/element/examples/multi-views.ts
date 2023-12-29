import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';

const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
setPipelineWorkerUrl(pipelineWorkerUrl);
const pipelineBaseUrl = '/itk/pipelines';
setPipelinesBaseUrl(pipelineBaseUrl);

document.addEventListener('DOMContentLoaded', async function () {
  const imagePath = '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr';
  const url = new URL(imagePath, document.location.origin);
  const image = await ZarrMultiscaleSpatialImage.fromUrl(url);

  const viewerElement = document.querySelector('itk-viewer');
  if (!viewerElement) throw new Error('Could not find element');
  const viewer = viewerElement.getActor();

  viewer.send({ type: 'setImage', image, name: 'image' });

  const viewportElement = document.querySelectorAll('itk-view-2d')[1];
  if (!viewportElement) throw new Error('Could not find viewport element');
  const viewActor = viewportElement.view2d;
  if (!viewActor) throw new Error('No view actor');
  viewActor.send({ type: 'setSlice', slice: 0.8 });
  viewActor.send({ type: 'setScale', scale: 0 });

  const viewportLast = document.querySelectorAll('itk-view-2d')[2];
  const image2dUrl = new URL(
    '/ome-ngff-prototypes/single_image/v0.4/tyx.ome.zarr',
    document.location.origin,
  );
  const image2d = await ZarrMultiscaleSpatialImage.fromUrl(image2dUrl);

  const viewport = viewportLast.getActor();
  if (!viewport) throw new Error('No viewport actor');
  viewport.send({ type: 'setImage', image: image2d });
});
