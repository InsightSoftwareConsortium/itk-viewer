import { makePlaceholderMultiscaleImage } from '@itk-viewer/io/makePlaceholderMultiscaleImage.js';
import { ItkViewport } from './itk-viewport.js';

// Remote image placeholders for FPS pyramid-scale switching
const makeMultiscaleImage = (image: string) => {
  if (image.endsWith('.tif')) {
    return makePlaceholderMultiscaleImage(image, 1);
  }
  return makePlaceholderMultiscaleImage(image, 8);
};

const imagePath = import.meta.env.VITE_IMAGE;
const image = makeMultiscaleImage(imagePath);

const viewerElement = document.querySelector('itk-viewer');
if (!viewerElement) throw new Error('Could not find element');
const viewer = viewerElement.getActor();

const rightViewport = document.querySelector(
  '#right-viewport',
) as ItkViewport | null;
if (!rightViewport) throw new Error('Could not find element');
const rightV = rightViewport.getActor();
viewer.send({ type: 'addViewport', viewport: rightV, name: 'right' });

viewer.send({ type: 'addImage', image, name: image.name });
