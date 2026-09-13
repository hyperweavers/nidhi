import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const FALLBACK_THRESHOLD = 95;

function readCodecovPatchTarget() {
  // Minimal indentation-scoped reader for:
  //   coverage:
  //     status:
  //       patch:
  //         default:
  //           target: 95%
  // Returns the number, or null for missing/unparseable/auto.
  // No YAML dep on purpose — full parsers are overkill for one scalar.
  try {
    const lines = readFileSync('codecov.yml', 'utf-8').split('\n');
    let inCoverage = false;
    let inStatus = false;
    let inPatch = false;
    let inDefault = false;
    for (const raw of lines) {
      const line = raw.replace(/#.*$/, '');
      if (!line.trim()) continue;
      const indent = line.match(/^ */)[0].length;
      const key = line
        .trim()
        .slice(
          0,
          line.trim().indexOf(':') === -1
            ? undefined
            : line.trim().indexOf(':'),
        );
      const value = line.includes(':')
        ? line
            .slice(line.indexOf(':') + 1)
            .trim()
            .replace(/^['"]|['"]$/g, '')
        : '';
      if (indent === 0) inCoverage = key === 'coverage';
      else if (inCoverage && indent === 2) inStatus = key === 'status';
      else if (inCoverage && inStatus && indent === 4)
        inPatch = key === 'patch';
      else if (inCoverage && inStatus && inPatch && indent === 6)
        inDefault = key === 'default';
      else if (
        inCoverage &&
        inStatus &&
        inPatch &&
        inDefault &&
        indent === 8 &&
        key === 'target'
      ) {
        const m = /^(\d+(?:\.\d+)?)\s*%?$/.exec(value);
        return m ? Number(m[1]) : null; // null covers `auto`
      }
      if (indent === 0 && !inCoverage) {
        inStatus = inPatch = inDefault = false;
      }
    }
  } catch {
    // missing/unreadable codecov.yml
  }
  return null;
}

let THRESHOLD;
let THRESHOLD_SOURCE;
if (
  process.env.PATCH_COVERAGE_THRESHOLD != null &&
  process.env.PATCH_COVERAGE_THRESHOLD !== ''
) {
  THRESHOLD = Number(process.env.PATCH_COVERAGE_THRESHOLD);
  THRESHOLD_SOURCE = 'env PATCH_COVERAGE_THRESHOLD';
} else {
  const fromCodecov = readCodecovPatchTarget();
  if (fromCodecov != null) {
    THRESHOLD = fromCodecov;
    THRESHOLD_SOURCE = 'codecov.yml coverage.status.patch.default.target';
  } else {
    THRESHOLD = FALLBACK_THRESHOLD;
    THRESHOLD_SOURCE = 'built-in fallback';
  }
}
const BASE_REF =
  process.env.GITHUB_BASE_REF ??
  process.env.PATCH_BASE_REF ??
  (existsSync('.git/refs/remotes/origin/main') ? 'origin/main' : 'HEAD~1');

// Project root like "apps/pangu" or "libs/shared/http".
// 1) explicit CLI arg: node check-patch-coverage.mjs apps/pangu
// 2) Nx env: NX_TASK_TARGET_PROJECT + its project.json -> sourceRoot's dirname
// 3) fallback: apps/pangu (backwards compat)
let PROJECT_ROOT = process.argv[2]?.trim();
if (!PROJECT_ROOT) {
  const nxProject = process.env.NX_TASK_TARGET_PROJECT;
  if (nxProject) {
    // Map known project names to roots; fallback to discovery via project.json is too heavy for a coverage script,
    // so we resolve via a small static map + heuristic.
    const known = {
      pangu: 'apps/pangu',
      palan: 'apps/palan',
      vatti: 'apps/vatti',
      'shared-http': 'libs/shared/http',
      'shared-logger': 'libs/shared/logger',
      'shared-sentry': 'libs/shared/sentry',
      'shared-toast': 'libs/shared/toast',
    };
    PROJECT_ROOT = known[nxProject] ?? `apps/${nxProject}`;
  }
}
PROJECT_ROOT = (PROJECT_ROOT || 'apps/pangu')
  .replace(/\\/g, '/')
  .replace(/\/$/, '');
const SRC_GLOB = `${PROJECT_ROOT}/src`;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

function getBase() {
  try {
    // merge-base handles both local and CI where origin/main may be stale
    const base = run(`git merge-base ${BASE_REF} HEAD`);
    return base || BASE_REF;
  } catch {
    return BASE_REF;
  }
}

function parseDiff(base) {
  // -U0 gives only changed lines, no context; we collect added line numbers per file
  const raw = run(`git diff -U0 ${base}...HEAD -- ${SRC_GLOB}`);
  const perFile = new Map(); // file -> Set<newLine>
  let file = null;
  let newLine = 0;

  for (const line of raw.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6).trim();
      perFile.set(file, new Set());
    } else if (line.startsWith('@@')) {
      // @@ -oldStart,oldCount +newStart,newCount @@
      const m = /\+(\d+)(?:,(\d+))?/.exec(line);
      newLine = m ? Number(m[1]) : 0;
    } else if (file && line.startsWith('+') && !line.startsWith('+++')) {
      perFile.get(file).add(newLine);
      newLine += 1;
    } else if (file && line.startsWith(' ')) {
      newLine += 1;
    } else if (file && line.startsWith('-')) {
      // removed line does not advance newLine
    }
  }

  // also include untracked/new files that are not in diff but are new
  try {
    const untracked = run(
      `git diff --name-only --diff-filter=A HEAD -- ${SRC_GLOB}`,
    )
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const f of untracked) {
      if (!perFile.has(f)) {
        // count all lines in the file as changed — coverage will filter to instrumented lines
        const content = readFileSync(f, 'utf-8');
        const total = content.split('\n').length;
        const set = new Set();
        for (let i = 1; i <= total; i++) set.add(i);
        perFile.set(f, set);
      }
    }
  } catch {
    // ignore
  }

  return perFile;
}

function parseLcov() {
  const candidates = [
    `coverage/${PROJECT_ROOT}/lcov.info`,
    'coverage/lcov.info',
    `coverage/${PROJECT_ROOT}/lcov-report/lcov.info`,
  ];
  const lcovPath = candidates.find((p) => existsSync(p));
  if (!lcovPath) {
    console.error(
      `No lcov.info found for ${PROJECT_ROOT}. Tried: ${candidates.join(', ')}\nRun: pnpm nx run ${PROJECT_ROOT.split('/').pop()}:test --coverage --coverageReporters=lcov`,
    );
    process.exit(2);
  }

  const raw = readFileSync(lcovPath, 'utf-8');
  // SF -> DA
  const byFile = new Map(); // file (as in SF) -> Map<line, hits>
  let cur = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('SF:')) {
      cur = line.slice(3).trim().replace(/\\/g, '/');
      // lcov SF is like apps/pangu/src/app/pages/ipo/ipo.page.ts
      byFile.set(cur, new Map());
    } else if (line.startsWith('DA:') && cur) {
      const [l, h] = line.slice(3).split(',').map(Number);
      byFile.get(cur).set(l, h);
    } else if (line === 'end_of_record') {
      cur = null;
    }
  }
  return byFile;
}

function normalizeFileForLcov(file) {
  // diff file is like apps/pangu/src/app/pages/ipo/ipo.page.ts -> matches SF exactly
  return file.replace(/\\/g, '/');
}

const base = getBase();
console.log(
  `Project: ${PROJECT_ROOT}  Base: ${base}...HEAD  Threshold: ${THRESHOLD}% (${THRESHOLD_SOURCE})`,
);

const diffByFile = parseDiff(base);
if (diffByFile.size === 0) {
  console.log(
    `No changed files under ${SRC_GLOB} — patch coverage trivially 100%.`,
  );
  process.exit(0);
}

const lcovByFile = parseLcov();

let totalChangedInstrumented = 0;
let coveredChanged = 0;
const details = [];

for (const [file, changedLines] of diffByFile) {
  const norm = normalizeFileForLcov(file);
  // lcov keys may be exactly norm or with ./ prefix; try both
  const lcov =
    lcovByFile.get(norm) ??
    lcovByFile.get(`./${norm}`) ??
    lcovByFile.get(norm.replace(/^apps\//, '')) ??
    null;

  if (!lcov) {
    // File not instrumented (e.g. pure CSS/HTML) — skip
    console.log(
      `  skip (not in coverage): ${file} (${changedLines.size} changed lines)`,
    );
    continue;
  }

  let fileTotal = 0;
  let fileCovered = 0;
  let fileMissing = [];
  for (const line of changedLines) {
    if (!lcov.has(line)) continue; // blank / type-only line, not instrumented
    fileTotal += 1;
    totalChangedInstrumented += 1;
    if (lcov.get(line) > 0) {
      fileCovered += 1;
      coveredChanged += 1;
    } else {
      fileMissing.push(line);
    }
  }

  if (fileTotal > 0) {
    const pct = ((fileCovered / fileTotal) * 100).toFixed(2);
    details.push({ file, pct, fileCovered, fileTotal, fileMissing });
  }
}

if (totalChangedInstrumented === 0) {
  console.log(
    'No instrumented changed lines — patch coverage 100% (nothing to cover).',
  );
  process.exit(0);
}

const patchPct = (coveredChanged / totalChangedInstrumented) * 100;

console.log('\nPer-file patch coverage (changed & instrumented lines only):');
for (const d of details.sort((a, b) => Number(a.pct) - Number(b.pct))) {
  const icon = Number(d.pct) >= THRESHOLD ? '✓' : '✗';
  console.log(
    `  ${icon} ${d.pct}%  ${d.file}  (${d.fileCovered}/${d.fileTotal})` +
      (d.fileMissing.length
        ? `  missing: ${d.fileMissing.slice(0, 12).join(',')}${d.fileMissing.length > 12 ? ',…' : ''}`
        : ''),
  );
}

console.log(
  `\nPatch: ${coveredChanged}/${totalChangedInstrumented} = ${patchPct.toFixed(2)}%  (target ${THRESHOLD}%)`,
);

if (patchPct + 1e-9 < THRESHOLD) {
  console.error(`✗ Patch coverage ${patchPct.toFixed(2)}% < ${THRESHOLD}%`);
  process.exit(1);
}

console.log(`✓ Patch coverage ${patchPct.toFixed(2)}% ≥ ${THRESHOLD}%`);
