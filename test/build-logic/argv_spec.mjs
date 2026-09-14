import { expect } from 'chai';
import { describe, it } from 'mocha';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helpers from '../../gulpHelpers.js';

const { BOOLEAN_OPTIONS } = helpers;

const HELPERS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gulpHelpers.js');

const kebab = (option) => option.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// gulpHelpers parses process.argv when it is first required, so each case
// needs its own process.
function parse(...args) {
  const result = spawnSync(process.execPath, [
    '-e',
    `console.log(JSON.stringify(require(${JSON.stringify(HELPERS)}).argv))`,
    '--',
    ...args,
  ], { encoding: 'utf8' });
  expect(result.error, `spawn failed: ${result.error}`).to.equal(undefined);
  expect(result.status, result.stderr).to.equal(0);
  return JSON.parse(result.stdout);
}

describe('build CLI argument parsing', () => {
  it('maps the negated flags the repo itself uses to false', () => {
    expect(parse('--no-coverage', '--no-fetch', '--no-lint-warnings')).to.eql({
      coverage: false,
      fetch: false,
      lintWarnings: false,
    });
  });

  it('negates every boolean option under its declared spelling', () => {
    expect(parse(...BOOLEAN_OPTIONS.map((option) => `--no-${option}`)))
      .to.eql(Object.fromEntries(BOOLEAN_OPTIONS.map((option) => [option, false])));
  });

  it('negates every boolean option under its kebab-case spelling', () => {
    expect(parse(...BOOLEAN_OPTIONS.map((option) => `--no-${kebab(option)}`)))
      .to.eql(Object.fromEntries(BOOLEAN_OPTIONS.map((option) => [option, false])));
  });

  it('lets the last occurrence of a flag win', () => {
    expect(parse('--no-coverage', '--coverage')).to.eql({ coverage: true });
    expect(parse('--coverage', '--no-coverage')).to.eql({ coverage: false });
  });

  it('recognizes every boolean option under its kebab-case positive spelling', () => {
    expect(parse(...BOOLEAN_OPTIONS.map((option) => `--${kebab(option)}`)))
      .to.eql(Object.fromEntries(BOOLEAN_OPTIONS.map((option) => [option, true])));
  });

  it('lets a later explicit value win over a negation, and vice versa', () => {
    expect(parse('--no-fetch', '--fetch=1')).to.eql({ fetch: '1' });
    expect(parse('--fetch=1', '--no-fetch')).to.eql({ fetch: false });
    expect(parse('--coverage', '--coverage=')).to.eql({ coverage: '' });
    // "=false" is the string 'false', which is truthy — same trap as yargs.
    expect(parse('--no-coverage', '--coverage=false')).to.eql({ coverage: 'false' });
  });

  it('does not negate misspelled flags', () => {
    expect(parse('--no-COVERAGE')).to.eql({ 'no-COVERAGE': true });
    expect(parse('--no-sourcemaps')).to.eql({ 'no-sourcemaps': true });
  });

  it('lets spellings of the same flag override each other', () => {
    expect(parse('--no-source-maps', '--sourceMaps')).to.eql({ sourceMaps: true });
    expect(parse('--no-sourceMaps', '--source-maps')).to.eql({ sourceMaps: true });
    expect(parse('--source-maps', '--no-sourceMaps')).to.eql({ sourceMaps: false });
  });

  it('handles boolean options whose own names start with "no"', () => {
    expect(parse('--nolint')).to.eql({ nolint: true });
    expect(parse('--no-nolint', '--no-notest')).to.eql({ nolint: false, notest: false });
  });

  it('parses flags placed after a task word', () => {
    expect(parse('test-only', '--no-coverage')).to.eql({ coverage: false });
  });

  it('leaves string options and undeclared flags alone', () => {
    expect(parse('--file', 'foo.js', '--modules', 'a,b', '--no-lint', '--somethingElse')).to.eql({
      file: 'foo.js',
      modules: 'a,b',
      'no-lint': true,
      somethingElse: true,
    });
  });

  it('does not rewrite a flag given an explicit value once', () => {
    expect(parse('--coverage=false')).to.eql({ coverage: 'false' });
  });
});
