import { describe, it, after, beforeEach } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
// named rather than default: gulp.precompilation.js has a top-level dynamic import, which makes
// eslint-plugin-import read it as ESM and miss the CommonJS default
import { copyDeclarations } from '../../gulp.precompilation.js';
import helpers from '../../gulpHelpers.js';

/**
 * `tsc` emits into `.cache/ts/out` and never deletes an output whose input is gone, so the copy
 * into `dist/src` is what keeps deleted modules out of the type surface: an orphan declaration
 * would be type-checked by `check-declarations` and imported by `generateTypeSummary`, leaving a
 * removed module visible to consumers.
 */
describe('copyDeclarations', () => {
  // a name of our own, so that this cannot collide with - or clean up - anything a build owns
  const name = `zzCopyDeclarationsSpec${process.pid}`;
  const source = path.resolve('src', `${name}.ts`);
  const cached = path.resolve('.cache', 'ts', 'out', 'src', `${name}.d.ts`);
  const copied = helpers.getPrecompiledPath(path.join('src', `${name}.d.ts`));

  /** Stand in for a declaration tsc emitted on an earlier run. */
  function seedCache() {
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    fs.writeFileSync(cached, `export declare function ${name}(): number;\n`);
    fs.rmSync(copied, { force: true });
  }

  after(() => {
    [source, cached, copied].forEach(file => fs.rmSync(file, { force: true }));
  });

  it('should copy a cached declaration whose source is still there', async () => {
    fs.writeFileSync(source, `export function ${name}(): number { return 1; }\n`);
    seedCache();
    await copyDeclarations();
    expect(fs.existsSync(copied)).to.equal(true);
    expect(fs.readFileSync(copied, 'utf8')).to.equal(fs.readFileSync(cached, 'utf8'));
  });

  it('should skip a cached declaration whose source is gone', async () => {
    fs.rmSync(source, { force: true });
    seedCache();
    await copyDeclarations();
    expect(fs.existsSync(copied)).to.equal(false);
  });

  describe('when the declaration is already in dist/src', () => {
    const past = new Date('2000-01-01T00:00:00Z');

    function seedCopied(contents) {
      fs.mkdirSync(path.dirname(copied), { recursive: true });
      fs.writeFileSync(copied, contents);
      fs.utimesSync(copied, past, past);
    }

    beforeEach(() => {
      fs.writeFileSync(source, `export function ${name}(): number { return 1; }\n`);
      seedCache();
    });

    it('should not rewrite it when it is identical', async () => {
      seedCopied(fs.readFileSync(cached));
      await copyDeclarations();
      expect(fs.statSync(copied).mtime.getTime()).to.equal(past.getTime());
    });

    it('should overwrite it when it differs', async () => {
      seedCopied(`export declare function ${name}(): string;\n`);
      await copyDeclarations();
      expect(fs.readFileSync(copied, 'utf8')).to.equal(fs.readFileSync(cached, 'utf8'));
    });
  });

  it('should leave the orphan in the cache rather than delete it', async () => {
    fs.rmSync(source, { force: true });
    seedCache();
    await copyDeclarations();
    // inert, not cleaned up: `gulp clean-cache` is what clears these
    expect(fs.existsSync(cached)).to.equal(true);
  });
});
