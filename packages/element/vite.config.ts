import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: '../../test/data/input',
  build: {
    lib: {
      entry: 'src/itk-viewer-element.ts',
      formats: ['es'],
    },
    rollupOptions: {
      external: /^lit/,
    },
  },
});
