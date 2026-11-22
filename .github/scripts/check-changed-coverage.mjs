#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const [, , coverageFile = 'coverage.info', baseCommit = ''] = process.argv;
const threshold = 80;
const sourceRoots = ['src', 'modules', 'libraries', 'creative'];

function isSourceFile(file) {
  return /\.(?:js|mjs|ts|mts)$/.test(file) &&
    !/\.d\.m?ts$/.test(file) &&
    sourceRoots.some(root => file.startsWith(root + '/'));
}

function isCommit(ref) {
  try {
    execFileSync('git', ['cat-file', '-e', ref + '^{commit}'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function changedSourceFiles(base) {
  return execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=AMR', '-M', base + '...HEAD'],
    { encoding: 'utf8' }
  ).split('\n').filter(isSourceFile);
}

// Files that are never loaded at runtime (only ever imported with `import type`) get no coverage record.
function hasNoOwnCode(file) {
  let code;
  try {
    code = file.endsWith('ts') ? stripTypeScriptTypes(readFileSync(file, 'utf8')) : readFileSync(file, 'utf8');
  } catch {
    // stripTypeScriptTypes rejects syntax that emits code, such as enums
    return false;
  }
  return code
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    .replace(/\bimport\s*(['"])[^'"\n]*\1\s*;?/g, '')
    .replace(/\b(?:import|export)\b[^;'"]*?\bfrom\s*(['"])[^'"\n]*\1\s*;?/g, '')
    .replace(/\bexport\s*\{[^}]*\}\s*;?/g, '')
    .trim() === '';
}

function parseLcov(text) {
  const files = new Map();
  let current;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      current = { linesFound: 0, linesHit: 0 };
      files.set(line.slice(3).replace(/^\.\//, ''), current);
    } else if (current && line.startsWith('LF:')) {
      current.linesFound = Number(line.slice(3));
    } else if (current && line.startsWith('LH:')) {
      current.linesHit = Number(line.slice(3));
    } else if (line === 'end_of_record') {
      current = undefined;
    }
  }
  return files;
}

if (!isCommit(baseCommit)) {
  // e.g. the push that creates a branch, or a force push whose previous head is gone
  console.log(`::notice::No usable base commit ('${baseCommit}'); skipping the changed-file coverage check`);
  process.exit(0);
}

const coverage = parseLcov(readFileSync(coverageFile, 'utf8'));
const failures = [];

for (const file of changedSourceFiles(baseCommit)) {
  const record = coverage.get(file);
  if (!record) {
    if (!hasNoOwnCode(file)) failures.push(`${file}: no coverage record`);
    continue;
  }
  const percent = record.linesFound === 0 ? 100 : (record.linesHit / record.linesFound) * 100;
  if (percent < threshold) {
    failures.push(`${file}: ${percent.toFixed(1)}% (${record.linesHit}/${record.linesFound} lines covered)`);
  }
}

if (failures.length) {
  console.error(`Changed source files must have at least ${threshold}% line coverage:`);
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}
console.log(`All changed source files meet the ${threshold}% line coverage threshold.`);
