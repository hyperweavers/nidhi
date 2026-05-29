import * as path from 'path';

const workspaceRoot = path.resolve(__dirname, '../..');
const reporters: Array<string | [string, Record<string, string>]> = ['default'];
if (process.env['CI']) {
  reporters.push([
    'jest-junit',
    {
      outputDirectory: path.join(workspaceRoot, 'test-results/apps/palan'),
      outputName: 'junit.xml',
    },
  ]);
}

export default {
  displayName: 'palan',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/palan',
  reporters,
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|lightweight-charts|fancy-canvas|dexie-export-import)/|.*\\.mjs$)',
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
