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
    devServerPublicPathRoute: '', // needed for vite 5.0 https://github.com/cypress-io/cypress/issues/28347#issuecomment-2111054407
  },
  // videos are not reliable in github action: https://github.com/cypress-io/github-action/issues/337
  video: false,
  projectId: 'nrnh8e',
});
