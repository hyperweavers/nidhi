import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';

const projectName = process.argv[2];
if (!projectName) {
  console.error(
    'Usage: node tools/scripts/generate-sentry-env.mjs <projectName>',
  );
  process.exit(1);
}

const envVarName = `SENTRY_DSN_${projectName.toUpperCase()}`;
const dsn = process.env[envVarName] || '__DSN_PLACEHOLDER__';

const dir = `apps/${projectName}/src/generated`;
mkdirSync(dir, { recursive: true });

writeFileSync(
  `${dir}/sentry-config.ts`,
  `// Auto-generated from .env - do not edit manually
export const SENTRY_DSN = '${dsn}';
`,
);
