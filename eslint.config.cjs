const nx = require('@nx/eslint-plugin');
const stylistic = require('@stylistic/eslint-plugin');
const tseslint = require('typescript-eslint');

module.exports = [
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  {
    plugins: {
      '@nx': nx,
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin,
    },
  },
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
      '@stylistic/no-extra-semi': 'error',
      'no-extra-semi': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.spec.js', '**/*.spec.jsx'],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },
];
