import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/itk-viewer.ts',
      formats: ['es'],
    },
  },
});
