import { makeZarrImage } from '@itk-viewer/remote-viewport/remote-image.js';

const viewport = document.querySelector('itk-remote-viewport-webrtc');
if (!viewport) throw new Error('Could not find element');

const serverUrl = import.meta.env.VITE_HYPHA_URL;
const remoteZarrServiceId = import.meta.env.VITE_HYPHA_REMOTE_ZARR_SERVICE_ID;

const imagePath = import.meta.env.VITE_IMAGE;

const setImage = async (imagePath: string) => {
  const image = await makeZarrImage({
    imagePath,
    serverUrl,
    serviceId: remoteZarrServiceId,
  });
  viewport.viewport.send({ type: 'setImage', image });
  viewport.remote.send({ type: 'imageAssigned', image });
};

setImage(imagePath);
