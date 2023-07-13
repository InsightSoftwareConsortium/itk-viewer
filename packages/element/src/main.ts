import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { ItkViewport } from './itk-viewport.js';

const imagePath = '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr';
const url = new URL(imagePath, document.location.origin);
const image = await ZarrMultiscaleSpatialImage.fromUrl(url);

const viewerElement = document.querySelector('itk-viewer');
if (!viewerElement) throw new Error('Could not find element');
const viewer = viewerElement.getActor();

const leftViewport = document.querySelector(
  '#left-viewport'
) as ItkViewport | null;
if (!leftViewport) throw new Error('Could not find element');
const leftV = leftViewport.getActor();
viewer.send({ type: 'addViewport', viewport: leftV, name: 'left' });

const rightViewport = document.querySelector(
  '#right-viewport'
) as ItkViewport | null;
if (!rightViewport) throw new Error('Could not find element');
const rightV = rightViewport.getActor();
viewer.send({ type: 'addViewport', viewport: rightV, name: 'right' });

viewer.send({ type: 'addImage', image, name: image.name });
