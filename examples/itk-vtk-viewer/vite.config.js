import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'itk-viewer-reference-ui': fileURLToPath(
        new URL(
          './node_modules/itk-vtk-viewer/src/UI/reference-ui',
          import.meta.url
        )
      ),
    },
  },
})
