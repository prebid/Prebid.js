import { createRequire } from 'node:module';
import { expect } from 'chai';

const require = createRequire(import.meta.url);
const { webpackTestConfig } = require('../webpackTestConfig.js');

describe('Unit test webpack configuration', function () {
  function babelPlugins(options) {
    const rule = webpackTestConfig(options).module.rules.find(r => r.loader === 'babel-loader' && r.options?.plugins);
    return rule.options.plugins.map(p => Array.isArray(p) ? p[0] : p);
  }

  it('compiles ES modules to CommonJS, so specs can stub a module\'s exports', function () {
    expect(babelPlugins()).to.include('@babel/plugin-transform-modules-commonjs');
  });

  it('instruments for coverage only when asked', function () {
    expect(babelPlugins()).to.not.include('babel-plugin-istanbul');
    expect(babelPlugins({ coverage: true })).to.include('babel-plugin-istanbul');
  });

  it('keeps no filesystem cache for a multi-spec build', function () {
    expect(webpackTestConfig({ singleSpec: false }).cache).to.equal(false);
  });

  it('leaves the entry and optimization to the caller', function () {
    const config = webpackTestConfig();
    expect(config).to.not.have.property('entry');
    expect(config).to.not.have.property('optimization');
  });

  it('does not share its object with other builds', function () {
    const a = webpackTestConfig();
    a.resolve.alias.extra = 'x';
    expect(webpackTestConfig().resolve.alias).to.not.have.property('extra');
  });
});
