import {describe, it} from 'mocha';
import {expect} from 'chai';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('build hygiene checks', () => {
  it('should not contain the forbidden legacy token in tracked files', () => {
    const forbiddenToken = ['33', '84'].join('');
    const args = [
      'grep',
      '-n',
      '-I',
      '-E',
      `\\b${forbiddenToken}\\b`,
      '--',
      '.',
      ':(exclude)node_modules/**',
      ':(exclude)dist/**',
      ':(exclude)build/**',
      ':(exclude)package-lock.json',
      ':(exclude)yarn.lock',
      ':(exclude)pnpm-lock.yaml'
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
