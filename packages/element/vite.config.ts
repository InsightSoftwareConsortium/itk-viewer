import { resolve } from 'path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  publicDir: '../../test/data/input',
  build: {
    outDir: 'examples/dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        compare: resolve(__dirname, 'examples/compare.html'),
        imageIoReadImage: resolve(
          __dirname,
          'examples/image-io-read-image.html',
        ),
        multiViews: resolve(__dirname, 'examples/multi-views.html'),
        remoteViewport: resolve(__dirname, 'examples/remote-viewport.html'),
        remoteWebrtc: resolve(__dirname, 'examples/remote-webrtc.html'),
        view2d: resolve(__dirname, 'examples/view-2d.html'),
        view3d2d: resolve(__dirname, 'examples/view-3d-2d.html'),
        view3d: resolve(__dirname, 'examples/view-3d.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['@itk-wasm/htj2k', 'itk-wasm'],
  },
  plugins: [
    // collect lazy loaded JavaScript and Wasm bundles in public directory
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/itk-wasm/dist/pipeline/web-workers/bundles/itk-wasm-pipeline.min.worker.js',
          dest: 'itk/web-workers',
        },
        {
          src: '../io/node_modules/itk-image-io/*',
          dest: 'itk/image-io',
        },
        {
          src: '../blosc-zarr/emscripten-build/*',
          dest: 'itk/pipelines',
        },
      ],
    }),
  ],
});
