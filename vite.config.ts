/// <reference types="vitest" />

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'lib/TransferFunctionEditor.ts',
      name: 'TransferFunctionEditor',
      fileName: (format) => `TransferFunctionEditor.${format}.js`,
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
