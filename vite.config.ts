/// <reference types="vitest" />

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'lib/TfEditor.ts',
      name: 'TfEditor',
      fileName: (format) => `TfEditor.${format}.js`,
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
