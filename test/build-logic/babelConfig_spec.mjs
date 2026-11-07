import { createRequire } from 'node:module';
import { expect } from 'chai';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const babelConfig = require('../../babelConfig.js');

describe('Babel configuration', function () {
  it('elides ordinary imports that are only used as types', async function () {
    const source = `
      import { RuntimeDependency, TypeDependency } from './dependency.ts';
      const value: TypeDependency = new RuntimeDependency();
    `;

    const { code } = await babel.transformAsync(source, {
      ...babelConfig(),
      filename: 'example.ts',
    });

    expect(code).to.include('import { RuntimeDependency }');
    expect(code).not.to.include('TypeDependency');
  });

  it('keeps runtime specifiers in mixed type imports and exports', async function () {
    // Codex checks that inline type specifiers do not become runtime dependencies.
    const source = `
      import { RuntimeDependency, type TypeDependency } from './dependency.ts';
      export { RuntimeExport, type TypeExport } from './exports.ts';
      const value: TypeDependency = new RuntimeDependency();
    `;

    const { code } = await babel.transformAsync(source, {
      ...babelConfig(),
      filename: 'example.ts',
    });

    expect(code).to.include('import { RuntimeDependency }');
    expect(code).to.include('export { RuntimeExport }');
    expect(code).not.to.include('TypeDependency');
    expect(code).not.to.include('TypeExport');
  });
});
