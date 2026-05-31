import * as path from 'path';

const workspaceRoot = process.env['NX_WORKSPACE_ROOT'] || '../..';
const reporters: Array<string | [string, Record<string, string>]> = ['default'];
if (process.env['CI']) {
  reporters.push([
    'jest-junit',
    {
      outputDirectory: path.join(workspaceRoot, 'test-results/apps/vatti'),
      outputName: 'junit.xml',
    },
  ]);
}

export default {
  displayName: 'vatti',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/vatti',
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 80,
      functions: 85,
      lines: 90,
    },
  },
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
    'node_modules/(?!(?:.pnpm/)?(?:[^/]+/node_modules/)?(msw|@mswjs)/|.*\\.mjs$)',
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
  },
};
