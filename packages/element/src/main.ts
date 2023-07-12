import { ZarrMultiscaleSpatialImage } from '@itk-viewer/io/ZarrMultiscaleSpatialImage.js';

const imagePath = '/ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr';
const url = new URL(imagePath, document.location.origin);
const image = await ZarrMultiscaleSpatialImage.fromUrl(url);

const viewer = document.querySelector('itk-viewer');
if (!viewer) throw new Error('Could not find itk-viewer element');

viewer.addImage(image);
