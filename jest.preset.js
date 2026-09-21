const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // The @nx/jest preset only reports `html` coverage, so `nx test` prints no
  // terminal summary. Restore text output plus the clover artifact CI uploads
  // to Codecov. (Nx 23 infers `jest` run-commands targets, so the old
  // `@nx/jest:jest` targetDefaults `codeCoverage` no longer applies.)
  collectCoverage: true,
  coverageReporters: ['text-summary', 'html', 'clover'],
};
