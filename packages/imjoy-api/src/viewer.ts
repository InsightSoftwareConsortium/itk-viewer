import { Viewer } from '@itk-viewer/viewer/viewer.js';

type HyphaServer = unknown;

export const setup = (server: HyphaServer, viewer: Viewer) => {
  console.log('setup', { server, viewer });
};
