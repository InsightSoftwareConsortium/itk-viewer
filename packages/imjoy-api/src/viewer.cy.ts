import { createViewer } from '@itk-viewer/viewer/viewer.js';
import { hyphaWebsocketClient } from 'imjoy-rpc';
import { setup } from './viewer.js';

const serverUrl = 'http://localhost:9000';

describe('imjoy-viewer', () => {
  it('registers service with Hypha server', async () => {
    const viewer = createViewer();

    // TODO? beforeEach spin up hypha signaling server
    const server = await hyphaWebsocketClient.connectToServer({
      name: 'remote-renderer-client',
      server_url: serverUrl,
    });

    const service = setup(server, viewer);

    expect(service).to.be.ok;
  });
});
