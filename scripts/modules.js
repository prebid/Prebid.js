
const path = require('path');
const vm = require('vm');

const webpack = require('webpack');
const MemoryFS = require('memory-fs');
const jsdom = require('jsdom');
const _ = require('lodash');

const config = require('../webpack.conf');
const helper = require('../gulpHelpers');

let argModules = helper.getArgModules();

let entry = {
  prebid: path.resolve('../src/prebid.js'),
  fixtures: path.resolve('../test/fixtures/fixtures.js')
};

let modules = _.reduce(helper.getModules(), (memo, name, path) => {
  if (name.includes('BidAdapter') && (
    !argModules.length || argModules.includes(name)
  )) {
    memo[name] = path;
  }
  return memo;
}, Object.assign({}, entry));

delete config.devtool;
delete config.plugins;
Object.assign(config, {
  entry: modules,
  output: {
    library: 'export',
    libraryTarget: 'window'
  },
  resolve: {
    modules: [
      path.resolve('..'),
      'node_modules'
    ]
  }
});

let fs = new MemoryFS();

let compiler = webpack(config);
compiler.outputFileSystem = fs;

compiler.run((err, stats) => {
  if (err || stats.hasErrors()) {
    console.log('error', err || stats.toJson().errors);
    process.exit(1);
  }
  let sources = _.reduce(stats.compilation.assets, (sources, info, name) => {
    sources[name] = fs.readFileSync(info.existsAt, 'utf-8');
    return sources;
  }, {});

  let fixtures = run(sources['fixtures.js']);

  // remove non-module entry points
  Object.keys(entry).forEach(name => {
    if (sources[name + '.js']) {
      delete sources[name + '.js'];
    }
  });

  _.forEach(sources, (source, name) => {
    let adapter = run(source);
    let bidderRequest = fixtures.getBidRequests()[0];
    console.log(adapter.spec.buildRequests(bidderRequest.bids, bidderRequest));
  })
});

function run(source) {
  let dom = new jsdom.JSDOM(`<!DOCTYPE html>`, {
    url: 'https://www.prebid.org'
  });

  // need this (can't lookup navigator on window for whatever reason)
  dom.navigator = dom.window.navigator;

  vm.createContext(dom);

  vm.runInContext(source, dom);

  return dom.window.export;
}
