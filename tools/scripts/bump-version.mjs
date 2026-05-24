import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const projectName = process.argv[2];
if (!projectName) {
  console.error('Usage: node tools/scripts/bump-version.mjs <projectName>');
  process.exit(1);
}

const versionFile = `apps/${projectName}/version`;
const projectDir = `apps/${projectName}`;

// Read current version
let currentVersion = '1.0.0';
if (existsSync(versionFile)) {
  currentVersion = readFileSync(versionFile, 'utf-8').trim();
}

// Find the last commit that touched the version file
let lastVersionCommit = '';
try {
  lastVersionCommit = execSync(`git log -1 --format="%H" -- "${versionFile}"`, {
    encoding: 'utf-8',
  }).trim();
} catch {
  // No previous version commit found — use initial commit
}

// Get commits since that commit affecting this app
const range = lastVersionCommit ? `${lastVersionCommit}..HEAD` : 'HEAD';
let log = '';
try {
  log = execSync(`git log ${range} --oneline -- "${projectDir}/"`, {
    encoding: 'utf-8',
  }).trim();
} catch {
  // No commits found
}

if (!log) {
  // No changes — keep current version, just regenerate
  const generatedDir = `apps/${projectName}/src/generated`;
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(
    `${generatedDir}/version.ts`,
    `// Auto-generated - do not edit manually\nexport const APP_VERSION = '${currentVersion}';\n`,
  );
  console.log(currentVersion);
  process.exit(0);
}

// Determine bump type from conventional commits
let bump = 'patch';
const lines = log.split('\n');
for (const line of lines) {
  const msg = line.replace(/^[a-f0-9]+\s+/, '');
  if (/BREAKING CHANGE/i.test(msg) || /!:/.test(msg)) {
    bump = 'major';
    break;
  }
  if (/^feat(\(.+\))?!?\s*:/.test(msg)) {
    bump = 'minor';
  }
}

// Parse and bump semver
const parts = currentVersion.split('.').map(Number);
let [major, minor, patch] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];

if (bump === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bump === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;

// Write version file
writeFileSync(versionFile, `${newVersion}\n`);

// Write generated version.ts
const generatedDir = `apps/${projectName}/src/generated`;
mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  `${generatedDir}/version.ts`,
  `// Auto-generated - do not edit manually\nexport const APP_VERSION = '${newVersion}';\n`,
);

console.log(newVersion);
