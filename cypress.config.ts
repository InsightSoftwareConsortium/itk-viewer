import { defineConfig } from 'cypress';

import viteConfig from './vite.config.js';

export default defineConfig({
  component: {
    devServer: {
      framework: 'svelte',
      bundler: 'vite',
      viteConfig,
    },
    watchForFileChanges: true,
    defaultCommandTimeout: 30000,
  },
  projectId: 'nrnh8e',
});
