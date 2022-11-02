import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: {
        lib: path.resolve(__dirname, 'src/index.ts'),
        app: path.resolve(__dirname, 'src/app.ts'),
      },
      name: 'ItkViewer',
      fileName: (format, entryName) => {
        const extension = format === 'es' ? '.js' : '.umd.js'
        switch(entryName) {
        case 'lib':
          return `itk-viewer${extension}`
        case 'app':
          return `itk-viewer-app${extension}`
        }
      },
      formats: ['es',]
    },
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'index.html'),
        lib: path.resolve(__dirname, 'src', 'index.ts'),
      },
      output: {
        globals: {
        }
      }
    }
  }
})
