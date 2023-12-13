module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['standard'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist/*'],
  rules: {
    'comma-dangle': [0],
    'space-before-function-paren': [0],
    indent: [0],
    'no-console': [1],
  },
}
