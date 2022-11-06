import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        lib: "src/index.ts",
        app: "src/app.ts",
      },
      name: "ItkViewer",
      fileName: (format, entryName) => {
        const extension = format === "es" ? ".js" : ".umd.js";
        switch (entryName) {
          case "lib":
            return `itk-viewer${extension}`;
          case "app":
            return `itk-viewer-app${extension}`;
        }
      },
      formats: ["es"],
    },
    rollupOptions: {
      input: {
        app: "index.html",
        lib: "src/index.ts",
      },
      output: {
        globals: {},
      },
    },
  },
});
