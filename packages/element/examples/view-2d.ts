import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { View2dControlsMaterial } from '../src/itk-view-2d-controls-material.js';

const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
setPipelineWorkerUrl(pipelineWorkerUrl);
const pipelineBaseUrl = '/itk/pipelines';
setPipelinesBaseUrl(pipelineBaseUrl);

document.addEventListener('DOMContentLoaded', async function () {
  const imagePath = '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr';
  const url = new URL(imagePath, document.location.origin);
  const image = await ZarrMultiscaleSpatialImage.fromUrl(url);

  const viewerElement = document.querySelector('itk-viewer')!;
  const viewer = viewerElement.getActor();
  viewer.send({ type: 'setImage', image, name: 'image' });

  const view2d = document.querySelector('itk-view-2d')!;
  const view2dActor = view2d.getActor()!;
  const controls = document.querySelector(
    '#view-controls',
  )! as View2dControlsMaterial;
  controls.setActor(view2dActor);
});
