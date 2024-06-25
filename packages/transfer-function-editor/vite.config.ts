/// <reference types="vitest" />

import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    port: 5174,
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'happy-dom',
    deps: {
      inline: ['vitest-canvas-mock'],
    },
    // For this config, check https://github.com/vitest-dev/vitest/issues/740
    // threads: false,
  },
  resolve: {
    alias: {
      '@itk-viewer/transfer-function-editor': fileURLToPath(
        new URL('./lib/TransferFunctionEditor.ts', import.meta.url),
      ),
    },
  },
});
