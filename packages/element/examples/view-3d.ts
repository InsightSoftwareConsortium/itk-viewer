import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { ItkViewer3d } from '../src/itk-viewer-3d.js';

const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
setPipelineWorkerUrl(pipelineWorkerUrl);
const pipelineBaseUrl = '/itk/pipelines';
setPipelinesBaseUrl(pipelineBaseUrl);

document.addEventListener('DOMContentLoaded', async function () {
  const imagePath = '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr';
  const url = new URL(imagePath, document.location.origin);
  const zarrImage = await ZarrMultiscaleSpatialImage.fromUrl(url);

  const viewerElement = document.querySelector('#viewer')! as ItkViewer3d;
  const viewer = viewerElement.getActor();
  viewer!.send({ type: 'setImage', image: zarrImage, name: 'image' });

  const imageActor = viewer!
    .getSnapshot()
    .context.viewports[0].getSnapshot()
    .context.views[0].getSnapshot().context.imageActor;
  imageActor.send({ type: 'colorMap', colorMap: '2hot', component: 0 });
});
