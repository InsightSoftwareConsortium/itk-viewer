import './assetPathSetup.js';
import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';
import { ItkViewer3d } from '../src/itk-viewer-3d.js';

document.addEventListener('DOMContentLoaded', async function () {
  const imagePath = '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr';
  const url = new URL(imagePath, document.location.origin);
  const zarrImage = await ZarrMultiscaleSpatialImage.fromUrl(url);

  const viewerElement = document.querySelector('#viewer')! as ItkViewer3d;
  const viewer = viewerElement.getActor();
  viewer!.send({ type: 'setImage', image: zarrImage, name: 'image' });

  const imageActor = viewer!
    .getSnapshot()
    .context.viewports[0].getSnapshot()
    .context.views[0].getSnapshot().context.imageActor;

  imageActor.send({ type: 'colorMap', colorMap: '2hot', component: 0 });

  imageActor.send({
    type: 'opacityPoints',
    points: [
      [60, 0.1],
      [100, 0.9],
      [220, 0.2],
    ],
    component: 0,
  });
  imageActor.send({
    type: 'colorRange',
    range: [60, 220],
    component: 0,
  });
});
