import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';

const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
setPipelineWorkerUrl(pipelineWorkerUrl);
const pipelineBaseUrl = '/itk/pipelines';
setPipelinesBaseUrl(pipelineBaseUrl);

async function setImage(imagePath: string) {
  const url = new URL(imagePath, document.location.origin);
  const image = await ZarrMultiscaleSpatialImage.fromUrl(url);

  const viewerElement = document.querySelector('itk-viewer');
  if (!viewerElement) throw new Error('Could not find element');
  const viewer = viewerElement.getActor();

  viewer.send({ type: 'setImage', image, name: 'image' });
}

document.addEventListener('DOMContentLoaded', async function () {
  const imageSelect = document.querySelector<HTMLInputElement>('#image-select');
  if (!imageSelect) throw new Error('Could not find image-select');
  const updateImage = () => {
    const path = imageSelect.value;
    setImage(path);
  };
  updateImage();
  imageSelect.addEventListener('change', updateImage);
});
