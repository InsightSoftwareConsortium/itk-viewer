import { Viewer } from '@itk-viewer/viewer/viewer.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';

type HyphaService = {
  id: string;
};

type ViewerService = {
  setImage: (storeHref: string) => void;
};

type HyphaServer = {
  registerService: (api: object) => Promise<HyphaService>;
  getService: (id: string) => Promise<ViewerService>;
  id: string;
};

export async function setup(server: HyphaServer, viewer: Viewer) {
  const service = await server.registerService({
    name: 'itk-viewer',
    id: 'itk-viewer',
    description: 'Retrieve the viewer API',
    setImage: async (imagePath: string, name?: string) => {
      const url = new URL(imagePath, document.location.origin);
      const image = await ZarrMultiscaleSpatialImage.fromUrl(url);
      viewer.send({ type: 'setImage', image, name: name ?? 'image' });
    },
  });
  return server.getService(service.id);
}
