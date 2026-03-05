import {describe, it} from 'mocha';
import {expect} from 'chai';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('build hygiene checks', () => {
  it('should not contain the forbidden legacy token in LocID files', () => {
    const forbiddenToken = ['33', '84'].join('');
    const scopeArgs = [
      'ls-files',
      '--',
      ':(glob)modules/**/locId*',
      ':(glob)test/spec/**/locId*',
      'docs/modules/locid.md',
      'modules/locIdSystem.md'
    ];
    const scopedPaths = execFileSync('git', scopeArgs, { cwd: repoRoot, encoding: 'utf8' })
      .split('\n')
      .map(filePath => filePath.trim())
      .filter(Boolean);

    expect(scopedPaths.length, 'No LocID files were selected for the 3384 guard').to.be.greaterThan(0);

    const args = [
      'grep',
      '-n',
      '-I',
      '-E',
      `\\b${forbiddenToken}\\b`,
      '--',
      ...scopedPaths
    ];

    try {
      const output = execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
      expect(output.trim(), `Unexpected ${forbiddenToken} matches:\n${output}`).to.equal('');
    } catch (e) {
      if (e?.status === 1) {
        return;
      }
      throw e;
    }
  });
});
