// var prebid = require('./package.json');
// var path = require('path');
var webpack = require('webpack');
var helpers = require('./gulpHelpers.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;

var plugins = [
  new webpack.EnvironmentPlugin({ 'LiveConnectMode': null })
];

if (argv.analyze) {
  plugins.push(
    new BundleAnalyzerPlugin()
  )
}

// Get Webpack config and ovverride entry point for IDHUB related profiles.
var webpackConfig = require('./webpack.conf.js');

webpackConfig['entry'] = (() => {
  const entry = {
    'prebid-core-idhub': {
      import: './src/prebidIdhub.js'
    }
  };
  const selectedModules = new Set(helpers.getArgModules());
  Object.entries(helpers.getModules()).forEach(([fn, mod]) => {
    if (selectedModules.size === 0 || selectedModules.has(mod)) {
      entry[mod] = {
        import: fn,
        dependOn: 'prebid-core-idhub'
      }
    }
  });
  return entry;
})();

module.exports = webpackConfig;
