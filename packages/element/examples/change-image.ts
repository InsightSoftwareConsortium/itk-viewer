import './assetPathSetup.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { ItkView3d } from '@itk-viewer/element/itk-view-3d.js';

async function setImage(imagePath: string) {
  const url = new URL(imagePath, document.location.origin);
  const image = await ZarrMultiscaleSpatialImage.fromUrl(url);

  const viewerElement = document.querySelector('itk-viewer');
  if (!viewerElement) throw new Error('Could not find element');
  const viewer = viewerElement.getActor();

  viewer.send({ type: 'setImage', image, name: 'image' });

  // don't reset on second image load
  const view3d = document.querySelector<ItkView3d>('itk-view-3d');
  view3d!.getActor()!.send({ type: 'setAutoCameraReset', enableReset: false });
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
