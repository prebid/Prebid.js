#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const [, , coverageFile = 'coverage.info', baseCommit = ''] = process.argv;
const threshold = 80;
const sourceRoots = ['src', 'modules', 'libraries', 'creative'];

function isSourceFile(file) {
  return /\.(?:js|mjs|ts|mts)$/.test(file) &&
    !/\.d\.(?:ts|mts)$/.test(file) &&
    sourceRoots.some(root => file === root || file.startsWith(root + '/'));
}

function changedSourceFiles(base) {
  if (!base) throw new Error('A base commit is required');
  const diff = execFileSync(
    'git',
    ['diff', '--name-status', '--diff-filter=AMR', '-M', base + '...HEAD'],
    { encoding: 'utf8' }
  ).trim();

  return diff.split('\n').filter(Boolean).flatMap(line => {
    const parts = line.split('\t');
    const status = parts[0];
    const file = status.startsWith('R') ? parts[2] : parts[1];
    return file && isSourceFile(file) ? [file] : [];
  });
}

function isTypeOnlyModule(file) {
  if (!/\.(?:ts|mts)$/.test(file)) return false;
  const source = readFileSync(file, 'utf8')
    .replace(/\/\*[\\s\\S]*?\*\//g, '')
    .replace(/(^|\\s)\/\/.*$/gm, '')
    .trim();
  if (!source) return true;
  const runtimePattern = /\\b(class|enum|function|const|let|var|new|return|throw|if|for|while|switch|try|catch|await|yield)\\b|(^|[=({;])\\s*(async\\s+)?[A-Za-z_$][\\w$]*\\s*\\(/m;
  return !runtimePattern.test(source);
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
    if (isTypeOnlyModule(rel)) continue;
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
console.log('All changed executable source JS/TS files meet the ' + threshold + '% line coverage threshold.');
