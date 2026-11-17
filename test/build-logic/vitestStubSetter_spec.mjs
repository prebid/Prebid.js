import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from 'chai';
import sinon from 'sinon';
import { stubSetter } from '../vitest/plugins.mjs';
import { stubbable } from '../vitest/stubs.mjs';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

const DEP = 'export function helper() { return \'helper\'; }\n';
const MOD = [
  'import { helper } from \'./dep.js\';',
  'export { helper };',
  'export const label = "export const x = 1";',
  'export const tpl = `export const ${label.length}`;',
  'const internal = () => \'internal\';',
  'export { internal, internal as alias };',
  'export let counter = 0;',
  'export const double = (x) => x * 2;',
  'export function quad(x) { return double(double(x)); }',
  'export default function named() { return internal(); }',
  ''
].join('\n');

describe('Vitest stub setters (test/vitest/plugins.mjs)', function () {
  let dir;

  function load(coverage) {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-setter-'));
    fs.writeFileSync(path.join(dir, 'dep.js'), DEP);
    const file = path.join(dir, 'mod.js');
    const plugins = [[stubSetter, { self: pathToFileURL(file).href }]];
    if (coverage) plugins.push(['babel-plugin-istanbul', { cwd: dir, exclude: [] }]);
    const { code } = babel.transformSync(MOD, {
      filename: file, configFile: false, babelrc: false, sourceType: 'module', retainLines: true, plugins
    });
    fs.writeFileSync(file, code);
    return { code, ns: import(pathToFileURL(file).href) };
  }

  afterEach(function () {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  [false, true].forEach(coverage => {
    describe(coverage ? 'with istanbul' : 'without istanbul', function () {
      let code, ns, facade;

      beforeEach(async function () {
        ({ code, ns } = load(coverage));
        ns = await ns;
        facade = stubbable(ns);
      });

      it('keeps the module\'s strings', function () {
        expect(ns.label).to.equal('export const x = 1');
        expect(ns.tpl).to.equal('export const 18');
      });

      it('adds no export', function () {
        expect(Object.keys(ns)).to.have.members(
          ['alias', 'counter', 'default', 'double', 'helper', 'internal', 'label', 'quad', 'tpl']);
        expect(Object.keys(facade)).to.have.members(Object.keys(ns));
      });

      it('lets an exported const be stubbed, also for the module\'s own calls', function () {
        const stub = sinon.stub(facade, 'double').returns(0);
        try {
          expect(ns.double(3)).to.equal(0);
          expect(ns.quad(3)).to.equal(0);
        } finally {
          stub.restore();
        }
        expect(ns.quad(3)).to.equal(12);
      });

      it('lets a const exported by name, and its alias, be stubbed', function () {
        const stub = sinon.stub(facade, 'alias').returns('stub');
        try {
          expect(ns.alias()).to.equal('stub');
          expect(ns.internal()).to.equal('stub');
        } finally {
          stub.restore();
        }
        expect(ns.alias()).to.equal('internal');
      });

      it('refuses to stub a re-exported import', function () {
        expect(() => sinon.stub(facade, 'helper')).to.throw(/Cannot stub 'helper'/);
        expect(ns.helper()).to.equal('helper');
      });

      it('does not make the default export stubbable', function () {
        expect(() => { facade.default = () => 'stub'; }).to.throw(/Cannot stub 'default'/);
      });

      if (!coverage) {
        it('keeps the module\'s lines', function () {
          const lines = code.split('\n');
          expect(lines.length).to.equal(MOD.trimEnd().split('\n').length);
          expect(lines[7]).to.equal('export let double = (x) => x * 2;');
        });
      } else {
        it('makes no setter for istanbul\'s counters', function () {
          expect(code).to.match(/cov_\w+/);
          expect(code).to.not.match(/case "cov_/);
        });
      }
    });
  });
});
