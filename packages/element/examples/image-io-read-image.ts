import './assetPathSetup.js';
import { ItkWasmMultiscaleSpatialImage } from '@itk-viewer/io/ItkWasmMultiscaleSpatialImage.js';
import { ItkViewer2d } from '../src/itk-viewer-2d.js';
import { readImage } from '@itk-wasm/image-io';
import { readImageDicomFileSeries } from '@itk-wasm/dicom';

/**
 * Filenames must be sanitized prior to being passed into itk-wasm.
 *
 * In particular, forward slashes cause FS errors in itk-wasm.
 * @param name
 * @returns
 */
function sanitizeFileName(name: string) {
  return name.replace(/\//g, '_');
}

/**
 * Returns a new File instance with a sanitized name.
 * @param file
 */
function sanitizeFile(file: File) {
  return new File([file], sanitizeFileName(file.name));
}

const makeImage = async (files: File[]) => {
  const cleanFiles = files.map(sanitizeFile);
  if (cleanFiles.length === 1) {
    const { image } = await readImage(cleanFiles[0]);
    return image;
  }
  const { outputImage } = await readImageDicomFileSeries({
    inputImages: cleanFiles,
    singleSortedSeries: false,
  });
  return outputImage;
};

document.addEventListener('DOMContentLoaded', async function () {
  const viewerElement = document.querySelector('#viewer')! as ItkViewer2d;
  const viewer = viewerElement.getActor();

  const path = 'HeadMRVolume.nrrd';
  const url = new URL(path, document.location.origin);
  const response = await fetch(url.href);
  const data = new Uint8Array(await response.arrayBuffer());
  const inputFile = { data, path };
  const { image: itkimage } = await readImage(inputFile);
  const image = new ItkWasmMultiscaleSpatialImage(itkimage);

  viewer!.send({ type: 'setImage', image, name: 'image' });

  const fileInput = document.querySelector('#file-input')! as HTMLInputElement;
  fileInput.addEventListener('change', async (event: Event) => {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) {
      return;
    }
    const itkImage = await makeImage(Array.from(files));
    const image = new ItkWasmMultiscaleSpatialImage(itkImage);
    viewer!.send({ type: 'setImage', image, name: 'image' });
  });
});
