import * as path from 'path';

const workspaceRoot = process.env['NX_WORKSPACE_ROOT'] || '../../..';
const reporters: Array<string | [string, Record<string, string>]> = ['default'];
if (process.env['CI']) {
  reporters.push([
    'jest-junit',
    {
      outputDirectory: path.join(
        workspaceRoot,
        'test-results/libs/shared/sentry',
      ),
      outputName: 'junit.xml',
    },
  ]);
}

export default {
  displayName: 'shared-sentry',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/shared/sentry',
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
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
  },
};
