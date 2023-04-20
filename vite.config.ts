import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  publicDir: './test/data/input',
  plugins: [
    // put lazy loaded JavaScript and Wasm bundles in dist directory
    viteStaticCopy({
      targets: [
        {
          src: './packages/io/node_modules/itk-wasm/dist/web-workers/*',
          dest: 'itk/web-workers',
        },
        {
          src: '/io/node_modules/itk-image-io/*',
          dest: 'dist/itk/image-io',
        },
        {
          src: './packages/blosc-zarr/emscripten-build/*',
          dest: 'itk/pipelines',
        },
      ],
    }),
  ],
});
