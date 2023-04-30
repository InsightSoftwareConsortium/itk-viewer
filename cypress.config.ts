import { defineConfig } from 'cypress';
// @ts-ignore
import cypressWatchPlugin from 'cypress-watch-and-reload/plugins';

import viteConfig from './vite.config.js';

export default defineConfig({
  component: {
    devServer: {
      framework: 'svelte',
      bundler: 'vite',
      viteConfig,
    },
    env: {
      // list the files and file patterns to watch
      'cypress-watch-and-reload': {
        watch: ['src/*'],
      },
    },
    setupNodeEvents(on, config) {
      return cypressWatchPlugin(on, config);
    },
  },
  projectId: 'nrnh8e',
});
