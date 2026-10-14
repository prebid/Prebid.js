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
});
