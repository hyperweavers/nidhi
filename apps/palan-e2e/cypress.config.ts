import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: 'src',
      webServerCommands: {
        default: 'pnpm nx run palan:serve',
        production: 'pnpm nx run palan:serve-static',
      },
      ciWebServerCommand: 'pnpm nx run palan:serve-static',
      ciBaseUrl: 'http://localhost:4400',
    }),
    baseUrl: 'http://localhost:4400',
    // Please ensure you use `cy.origin()` when navigating between domains and remove this option.
    // See https://docs.cypress.io/app/references/migration-guide#Changes-to-cyorigin
    injectDocumentDomain: true,
  },
});
