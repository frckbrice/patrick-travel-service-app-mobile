const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const path = require('path');
const { fileURLToPath } = require('url');

const compat = new FlatCompat({
  baseDirectory: path.dirname(require.resolve('./package.json')),
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'android/**',
      'ios/**',
    ],
  },
  ...compat.extends('expo', 'prettier'),
  ...compat.plugins('prettier'),
  {
    rules: {
      'prettier/prettier': 'warn',
    },
  },
];
