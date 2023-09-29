import { hyphaWebsocketClient } from 'imjoy-rpc';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';

type GetStore = {
  imagePath: string;
  serverUrl?: string;
  serviceId?: string;
};

export const makeZarrImage = async ({
  imagePath,
  serverUrl = 'https://hypha.website',
  serviceId = 'remote-zarr',
}: GetStore) => {
  const config = {
    client_id: 'remote-image-io-client',
    name: 'remote_image_io_client',
    server_url: serverUrl,
  };
  const hypha = await hyphaWebsocketClient.connectToServer(config);
  const remoteZarr = await hypha.getService(serviceId);
  const store = await remoteZarr.getStore(imagePath);

  const image = await ZarrMultiscaleSpatialImage.fromStore(store);
  image.name = imagePath;

  hypha.disconnect();

  return image;
};
