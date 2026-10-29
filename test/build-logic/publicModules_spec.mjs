import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import publicModules from '../../gulp.publicModules.js';

const { renderPublicModule, getPublicParent, getPublicModule, isOverridden } = publicModules;

/**
 * The public module files are what NPM consumers import (`prebid.js/modules/<name>`, through package.json "exports").
 */
describe('renderPublicModule', () => {
  it('imports the real module', () => {
    expect(renderPublicModule('js', '../modules/rubiconBidAdapter.js', null))
      .to.equal(`import '../modules/rubiconBidAdapter.js';`);
  });

  it('imports the parent module first', () => {
    expect(renderPublicModule('js', '../modules/sharedIdSystem.js', 'userId'))
      .to.equal(`import './userId.js';\nimport '../modules/sharedIdSystem.js';`);
  });

  it('re-exports the module types in type declarations', () => {
    expect(renderPublicModule('d.ts', '../modules/rubiconBidAdapter.d.ts', null))
      .to.equal(`export type * from '../modules/rubiconBidAdapter.d.ts'`);
  });

  it('brings in the parent module declarations without re-exporting them', () => {
    expect(renderPublicModule('d.ts', '../modules/sharedIdSystem.d.ts', 'userId'))
      .to.equal(`export type {} from './userId.d.ts';\nexport type * from '../modules/sharedIdSystem.d.ts'`);
  });

  it('can bring in only the parent module declarations', () => {
    expect(renderPublicModule('d.ts', null, 'userId'))
      .to.equal(`export type {} from './userId.d.ts';`);
  });
});

/**
 * Directory with empty `files`, for the duration of the enclosing suite
 */
function useFiles(files) {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publicModules-'));
    files.forEach(file => {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), '');
    });
  });
  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return () => dir;
}

describe('getPublicParent', () => {
  const PARENTS = {
    indexSub: 'indexParent',
    fileSub: 'fileParent',
    overrideSub: 'overrideParent',
  };
  const getParentModule = (module) => PARENTS[module];
  const dir = useFiles([
    'modules/indexParent/index.js',
    'modules/indexParent/index.d.ts',
    'modules/fileParent.js',
    'public/overrideParent.d.ts',
  ]);

  it('is null for modules that are not submodules', () => {
    expect(getPublicParent('other', 'js', dir(), getParentModule)).to.equal(null);
  });

  Object.entries({
    'directory parents': ['indexSub', 'indexParent', 'js'],
    'directory parents with declarations': ['indexSub', 'indexParent', 'd.ts'],
    'single file parents': ['fileSub', 'fileParent', 'js'],
  }).forEach(([t, [sub, parent, ext]]) => {
    it(`finds ${t}`, () => {
      expect(getPublicParent(sub, ext, dir(), getParentModule)).to.equal(parent);
    });
  });

  it('finds parents with a public override', () => {
    expect(getPublicParent('overrideSub', 'd.ts', dir(), getParentModule)).to.equal('overrideParent');
  });

  it('is null when the parent has no version for the extension', () => {
    expect(getPublicParent('fileSub', 'd.ts', dir(), getParentModule)).to.equal(null);
  });
});

describe('getPublicModule', () => {
  const getParentModule = (module) => ({ tsSub: 'parent', jsSub: 'parent', jsOrphanSub: 'jsParent' })[module];
  const dir = useFiles([
    'modules/parent.js',
    'modules/parent.d.ts',
    'modules/jsParent.js',
    'modules/tsSub.js',
    'modules/tsSub.d.ts',
    'modules/jsSub.js',
    'modules/jsOrphanSub.js',
    'modules/other.js',
  ]);

  function publicModule(ext, file) {
    const moduleName = path.basename(file).replace(/\..*$/, '');
    return getPublicModule(ext, path.join(dir(), file), moduleName, `../${file}`, dir(), getParentModule);
  }

  it('renders the version for the same extension', () => {
    expect(publicModule('js', 'modules/jsSub.js')).to.equal(`import './parent.js';\nimport '../modules/jsSub.js';`);
    expect(publicModule('d.ts', 'modules/tsSub.d.ts')).to.equal(`export type {} from './parent.d.ts';\nexport type * from '../modules/tsSub.d.ts'`);
  });

  it('brings in only the parent declarations for JS-only submodules', () => {
    expect(publicModule('d.ts', 'modules/jsSub.js')).to.equal(`export type {} from './parent.d.ts';`);
  });

  Object.entries({
    'modules that have declarations of their own': 'modules/tsSub.js',
    'JS-only modules that are not submodules': 'modules/other.js',
    'JS-only submodules whose parent has no declarations': 'modules/jsOrphanSub.js',
  }).forEach(([t, file]) => {
    it(`gives no declarations from the JS of ${t}`, () => {
      expect(publicModule('d.ts', file)).to.equal(null);
    });
  });
});

describe('isOverridden', () => {
  const dir = useFiles([
    'jsOverride.js',
    'tsOverride.ts',
    'declarationOverride.d.ts',
  ]);

  Object.entries({
    'jsOverride': { 'js': true, 'd.ts': false },
    'tsOverride': { 'js': true, 'd.ts': true },
    'declarationOverride': { 'js': false, 'd.ts': true },
    'other': { 'js': false, 'd.ts': false },
  }).forEach(([moduleName, expected]) => {
    Object.entries(expected).forEach(([ext, overridden]) => {
      it(`is ${overridden} for the ${ext} version of ${moduleName}`, () => {
        expect(isOverridden(moduleName, ext, dir())).to.equal(overridden);
      });
    });
  });
});
