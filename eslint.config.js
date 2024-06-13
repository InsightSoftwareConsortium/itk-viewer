import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/dist/',
      '**/cypress',
      'cypress.config.ts',
      'environment.yml',
      'micromamba/*',
      'packages/blosc-zarr/**/*',
      '!packages/blosc-zarr/bloscZarrDecompress.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict, // superset of recommended
  {
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
      },
    },
  },
];
