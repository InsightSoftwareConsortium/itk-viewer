const path = require('path')

const { babel } = require('@rollup/plugin-babel')

module.exports = {
  build: {
    lib: {
      entry: path.resolve(__dirname, 'main.js'),
      name: 'customReferenceUIMachineOptions',
      formats: ['es'],
      fileName: 'referenceUIMachineOptions.js',
    },
    rollupOptions: {
      plugins: [
        babel({
          include: ['src/**'],
          extensions: ['.js'],
          exclude: 'node_modules/**',
          babelHelpers: 'runtime',
        }),
      ],
    },
  },
}
