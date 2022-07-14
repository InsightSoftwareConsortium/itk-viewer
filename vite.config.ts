/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    lib: {
      entry: 'lib/TransferFunctionEditor.ts',
      name: 'TransferFunctionEditor',
      fileName: (format) => `TransferFunctionEditor.${format}.js`,
    },
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'happy-dom',
    deps: {
      inline: ['vitest-canvas-mock'],
    },
    // For this config, check https://github.com/vitest-dev/vitest/issues/740
    threads: false,
  },
})
