import { expect } from 'chai';
import { describe, it } from 'mocha';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HELPERS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gulpHelpers.js');

// gulpHelpers parses process.argv when it is first required, so each case
// needs its own process.
function parse(...args) {
  const result = spawnSync(process.execPath, [
    '-e',
    `console.log(JSON.stringify(require(${JSON.stringify(HELPERS)}).argv))`,
    '--',
    ...args,
  ], { encoding: 'utf8' });
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

  it('accepts negation in the camelCase spelling', () => {
    expect(parse('--no-sourceMaps', '--no-manualEnable')).to.eql({
      sourceMaps: false,
      manualEnable: false,
    });
  });

  it('accepts negation in the kebab-case spelling', () => {
    expect(parse('--no-source-maps', '--no-manual-enable')).to.eql({
      sourceMaps: false,
      manualEnable: false,
    });
  });

  it('negates ES5 in either capitalization', () => {
    expect(parse('--no-ES5')).to.eql({ ES5: false });
    expect(parse('--no-es5')).to.eql({ ES5: false });
  });

  it('lets the last occurrence of a flag win', () => {
    expect(parse('--no-coverage', '--coverage')).to.eql({ coverage: true });
    expect(parse('--coverage', '--no-coverage')).to.eql({ coverage: false });
  });

  it('does not negate misspelled flags', () => {
    expect(parse('--no-COVERAGE')).to.eql({ 'no-COVERAGE': true });
    expect(parse('--no-sourcemaps')).to.eql({ 'no-sourcemaps': true });
  });

  it('handles boolean options whose own names start with "no"', () => {
    expect(parse('--nolint')).to.eql({ nolint: true });
    expect(parse('--no-nolint', '--no-notest')).to.eql({ nolint: false, notest: false });
  });

  it('leaves string options, undeclared flags, and positionals alone', () => {
    expect(parse('--file', 'foo.js', '--modules', 'a,b', '--no-lint', '--somethingElse')).to.eql({
      file: 'foo.js',
      modules: 'a,b',
      'no-lint': true,
      somethingElse: true,
    });
  });

  it('does not rewrite a flag given an explicit value', () => {
    expect(parse('--coverage=false')).to.eql({ coverage: 'false' });
  });
});
