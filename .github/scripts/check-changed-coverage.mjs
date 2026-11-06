#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const [, , coverageFile = 'coverage.info', baseCommit = ''] = process.argv;
const threshold = 80;
const sourceRoots = ['src', 'modules', 'libraries', 'creative'];

function isSourceFile(file) {
  return /\.(?:js|mjs|ts|mts)$/.test(file) && !/\.d\.ts$/.test(file) &&
    sourceRoots.some(root => file === root || file.startsWith(root + '/'));
}

function changedSourceFiles(base) {
  if (!base) throw new Error('A base commit is required');
  return execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', base + '...HEAD'], {
    encoding: 'utf8'
  }).trim().split('\n').filter(Boolean).filter(isSourceFile);
}

function parseLcov(text) {
  const files = new Map();
  let current;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      current = { linesFound: 0, linesHit: 0 };
      const raw = line.slice(3);
      files.set(raw, current);
      files.set(raw.replace(/^[./]+/, ''), current);
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

const coverage = parseLcov(readFileSync(coverageFile, 'utf8'));
const root = process.cwd();
const failures = [];

for (const file of changedSourceFiles(baseCommit)) {
  const rel = relative(root, resolve(root, file));
  const record = coverage.get(file) || coverage.get(rel) || coverage.get('./' + rel);
  if (!record) {
    failures.push({ file, percent: 0, reason: 'no coverage record' });
    continue;
  }
  const percent = record.linesFound === 0 ? 100 : (record.linesHit / record.linesFound) * 100;
  if (percent < threshold) {
    failures.push({ file, percent, reason: record.linesHit + '/' + record.linesFound + ' lines covered' });
  }
}

if (failures.length) {
  console.error('Changed source files must have at least ' + threshold + '% line coverage.');
  for (const failure of failures) {
    console.error('- ' + failure.file + ': ' + failure.percent.toFixed(1) + '% (' + failure.reason + ')');
  }
  process.exit(1);
}
console.log('All changed source JS/TS files meet the ' + threshold + '% line coverage threshold.');
