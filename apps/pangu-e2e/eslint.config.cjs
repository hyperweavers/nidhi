const cypress = require('eslint-plugin-cypress');
const baseConfig = require('../../eslint.config.cjs');

module.exports = [
  ...baseConfig,
  cypress.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
];
