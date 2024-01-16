import { hyphaWebsocketClient } from 'imjoy-rpc';
import { setup } from './viewer.js';
import { createViewer } from '@itk-viewer/viewer/viewer.js';

const server_url = 'https://hypha.website';

describe('imjoy-viewer', () => {
  it('starts and takes set image', async () => {
    const viewer = createViewer();
    const storeURL = new URL(
      '/ome-ngff-prototypes/single_image/v0.4/yx.ome.zarr',
      document.location.origin,
    );

    const server = await hyphaWebsocketClient.connectToServer({
      name: 'test-client',
      server_url,
    });
    const viewerService = await setup(server, viewer);
    await viewerService.setImage(storeURL.href);
  });
});
