import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const projectName = process.argv[2];
if (!projectName) {
  console.error('Usage: node tools/scripts/generate-version.mjs <projectName>');
  process.exit(1);
}

const versionFile = `apps/${projectName}/version`;
const generatedDir = `apps/${projectName}/src/generated`;

let version = '1.0.0';
if (existsSync(versionFile)) {
  version = readFileSync(versionFile, 'utf-8').trim();
}

mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  `${generatedDir}/version.ts`,
  `// Auto-generated - do not edit manually
export const APP_VERSION = '${version}';
`,
);
