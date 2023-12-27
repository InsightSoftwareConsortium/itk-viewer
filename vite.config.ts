import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  publicDir: './test/data/input',
  plugins: [
    // collect lazy loaded JavaScript and Wasm bundles in public directory
    viteStaticCopy({
      targets: [
        {
          src: './packages/io/node_modules/itk-wasm/dist/pipeline/web-workers/bundles/itk-wasm-pipeline.min.worker.js',
          dest: 'itk/web-workers',
        },
        {
          src: './packages/io/node_modules/itk-image-io/*',
          dest: 'itk/image-io',
        },
        {
          src: './packages/blosc-zarr/emscripten-build/*',
          dest: 'itk/pipelines',
        },
      ],
    }),
  ],
});
