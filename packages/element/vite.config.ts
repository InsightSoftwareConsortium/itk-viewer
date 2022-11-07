import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/itk-viewer-element.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: /^lit/,
    },
  },
});
