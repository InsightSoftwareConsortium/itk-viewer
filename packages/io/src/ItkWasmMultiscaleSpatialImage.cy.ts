import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { readImage } from '@itk-wasm/image-io';
import { ItkWasmMultiscaleSpatialImage } from './ItkWasmMultiscaleSpatialImage.js';
import { takeSnapshot } from './testUtils.js';

before(() => {
  const pipelineWorkerUrl = '/itk/web-workers/itk-wasm-pipeline.min.worker.js';
  setPipelineWorkerUrl(pipelineWorkerUrl);
  const pipelineBaseUrl = '/itk/pipelines';
  setPipelinesBaseUrl(pipelineBaseUrl);
});

const baseline =
  '{"imageType":{"dimension":3,"componentType":"uint8","pixelType":"Scalar","components":1},"name":"Default Image Name","origin":[0,0,0],"spacing":[4,4,4],"direction":{"0":1,"1":0,"2":0,"3":0,"4":1,"5":0,"6":0,"7":0,"8":1},"size":[48,62,42],"ranges":[[0,255]],"data":[1,2,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,2,1,2,1,2,2,3,1,1,2,1,1,1,1,1,2,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,2,2,1,1,1,2,2,2,2,1,1,1,1,2,2,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,2,2,1,2,1]}';

describe(`ItkWasmMultiscaleSpatialImage`, () => {
  it('returns an image from ', async () => {
    const path = 'HeadMRVolume.nrrd';
    const url = new URL(path, document.location.origin);
    const response = await fetch(url.href);
    const data = new Uint8Array(await response.arrayBuffer());
    const inputFile = { data, path: path };
    const { image: itkimage } = await readImage(inputFile);
    const image = new ItkWasmMultiscaleSpatialImage(itkimage);
    const builtImage = await image.getImage(0);

    return expect(takeSnapshot(builtImage)).to.deep.equal(baseline);
  });
});
