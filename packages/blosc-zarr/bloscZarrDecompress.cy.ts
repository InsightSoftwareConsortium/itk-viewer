import { setPipelineWorkerUrl, setPipelinesBaseUrl } from 'itk-wasm';
import { bloscZarrDecompress } from './bloscZarrDecompress.js';

describe(`BloscZarrDecompress`, () => {
  const pipelineWorkerUrl = new URL(
    '/itk/web-workers/bundles/pipeline.worker.js',
    document.location.origin
  );
  setPipelineWorkerUrl(pipelineWorkerUrl);
  const pipelineBaseUrl = new URL('/itk/pipelines', document.location.origin);
  setPipelinesBaseUrl(pipelineBaseUrl);

  it(`Decompresses chunk`, async () => {
    const chunkPath =
      'ome-ngff-prototypes/single_image/v0.4/zyx.ome.zarr/s2/0/0/0';
    const chunkURL = new URL(chunkPath, document.location.origin);

    const response = await fetch(chunkURL.href);

    const arrayBuffer = await response.arrayBuffer();

    const metadata = {
      chunks: [64, 64, 64],
      compressor: {
        blocksize: 0,
        clevel: 5,
        cname: 'lz4',
        id: 'blosc',
        shuffle: 1,
      },
      dimension_separator: '/',
      dtype: '|u1',
      fill_value: 0,
      filters: null,
      order: 'C',
      shape: [151, 98, 121],
      zarr_format: 2,
    };

    const chunks = [{ data: arrayBuffer, metadata }];
    const uncompressed = await bloscZarrDecompress(chunks);

    expect(uncompressed.length).to.equal(1);
  });
});
