import { makeZarrImage } from '@itk-viewer/remote-viewport/remote-image.js';
import { ItkViewport } from './itk-viewport.js';

const viewerElement = document.querySelector('itk-viewer');
if (!viewerElement) throw new Error('Could not find element');
const viewer = viewerElement.getActor();

const rightViewport = document.querySelector(
  '#right-viewport',
) as ItkViewport | null;
if (!rightViewport) throw new Error('Could not find element');
const rightV = rightViewport.getActor();
viewer.send({ type: 'addViewport', viewport: rightV, name: 'right' });

const serverUrl = import.meta.env.VITE_HYPHA_URL;
const remoteZarrServiceId = import.meta.env.VITE_HYPHA_REMOTE_ZARR_SERVICE_ID;

const imagePath = import.meta.env.VITE_IMAGE;

const setImage = async (imagePath: string) => {
  const image = await makeZarrImage({
    imagePath,
    serverUrl,
    serviceId: remoteZarrServiceId,
  });
  viewer.send({ type: 'setImage', image, name: 'image' });
};

setImage(imagePath);
