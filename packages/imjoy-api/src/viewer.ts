import { Viewer } from '@itk-viewer/viewer/viewer.js';
import { Viewport } from '@itk-viewer/viewer/viewport.js';
import MultiscaleSpatialImage from '@itk-viewer/io/MultiscaleSpatialImage.js';

type HyphaServer = {
  registerService: (api: object) => any,
  getService: (name: string) => any,
  id: string,
};

export async function setup(server: HyphaServer, viewer: Viewer) {
  const service = await server.registerService({
    name: "itk_viewer",
    id: "itk-viewer",
    description: "Retrieve the viewer API",
    viewer: () => viewer,
    addViewport: (viewport: Viewport, name: string) => viewer.send({ type: 'addViewport', viewport: viewport, name: name }),
    setImage: (image: MultiscaleSpatialImage, name?: string) => viewer.send({ type: 'setImage', image, name: name ?? 'image' }),
  });

  return await server.getService(service.id)
}
