import { defineConfig } from "cypress";
import cypressWatchPlugin from "cypress-watch-and-reload/plugins";

export default defineConfig({
  component: {
    devServer: {
      framework: "svelte",
      bundler: "vite",
    },
    env: {
      // list the files and file patterns to watch
      "cypress-watch-and-reload": {
        watch: ["src/*"],
      },
    },
    setupNodeEvents(on, config) {
      return cypressWatchPlugin(on, config);
    },
  },
});
