import { describe, it } from 'mocha';
import { expect } from 'chai';
// named rather than default: gulp.precompilation.js has a top-level dynamic import, which makes
// eslint-plugin-import read it as ESM and miss the CommonJS default
import { renderPublicModule } from '../../gulp.precompilation.js';
import helpers from '../../gulpHelpers.js';

/**
 * The public module files are what NPM consumers import (`prebid.js/modules/<name>`, through package.json "exports").
 */
describe('renderPublicModule', () => {
  it('imports the real module', () => {
    expect(renderPublicModule('js', 'rubiconBidAdapter', '../modules/rubiconBidAdapter.js'))
      .to.equal(`import '../modules/rubiconBidAdapter.js';`);
  });

  it('imports the parent module first for submodules', () => {
    expect(helpers.getParentModule('sharedIdSystem')).to.equal('userId');
    expect(renderPublicModule('js', 'sharedIdSystem', '../modules/sharedIdSystem.js'))
      .to.equal(`import './userId.js';\nimport '../modules/sharedIdSystem.js';`);
  });

  it('does not import anything else for parent modules themselves', () => {
    expect(renderPublicModule('js', 'userId', '../modules/userId/index.js'))
      .to.equal(`import '../modules/userId/index.js';`);
  });

  it('only re-exports the module types in type declarations', () => {
    expect(renderPublicModule('d.ts', 'sharedIdSystem', '../modules/sharedIdSystem.js'))
      .to.equal(`export type * from '../modules/sharedIdSystem.js'`);
  });
});
