import './assetPathSetup.js';
import { readImage } from '@itk-wasm/image-io';
import { ItkWasmMultiscaleSpatialImage } from '@itk-viewer/io/ItkWasmMultiscaleSpatialImage.js';
import { ItkViewer2d } from '../src/itk-viewer-2d.js';

document.addEventListener('DOMContentLoaded', async function () {
  const viewerElement = document.querySelector('#viewer')! as ItkViewer2d;
  const viewer = viewerElement.getActor();

  const path = 'HeadMRVolume.nrrd';
  const url = new URL(path, document.location.origin);
  const response = await fetch(url.href);
  const data = new Uint8Array(await response.arrayBuffer());
  const inputFile = { data, path };
  const { image: itkimage } = await readImage(inputFile);
  const image = new ItkWasmMultiscaleSpatialImage(itkimage);

  viewer!.send({ type: 'setImage', image, name: 'image' });
});
