var prebid = require('./package.json');
var path = require('path');
var helpers = require('./gulpHelpers');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;
var allowedModules = require('./allowedModules');

// list of module names to never include in the common bundle chunk
var neverBundle = [
  'AnalyticsAdapter.js'
];

var plugins = [];

if (argv.analyze) {
  plugins.push(
    new BundleAnalyzerPlugin()
  )
}

module.exports = {
  devtool: 'inline-source-map',
  mode: 'development',
  resolve: {
    modules: [
      path.resolve('.'),
      'node_modules'
    ],
  },
  output: {
    jsonpFunction: prebid.globalVarName + "Chunk"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: path.resolve('./node_modules'), // required to prevent loader from choking non-Prebid.js node_modules
        use: [
          {
            loader: 'babel-loader',
            options: helpers.getAnalyticsOptions(),
          }
        ]
      },
      { // This makes sure babel-loader is ran on our intended Prebid.js modules that happen to be in node_modules
        test: /\.js$/,
        include: helpers.getArgModules().map(module => new RegExp('node_modules/' + module + '/')),
        use: [
          {
            loader: 'babel-loader',
          }
        ],
      }
    ]
  },
  optimization: {
    // we generate a runtime entry chunk, prebid-core, and separate prebid-shared cacheGroup chunk and then
    // concatenate them together in gulp (as prebid-core) to get around splitChunks bug with having entry chunks
    // share a name with cacheGroups: https://github.com/webpack/webpack/issues/7230
    runtimeChunk: {
      name: 'prebid-core'
    },
    minimize: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: false,
        prebidShared: {
          chunks: 'all',
          name: 'prebid-shared',
          filename: 'prebid-shared.js',
          enforce: true,
          reuseExistingChunk: true,
          test: function(module, chunks) {
            return (
              (
                module.context && module.context.startsWith(path.resolve('./src')) &&
                !(module.resource && neverBundle.some(name => module.resource.includes(name)))
              ) || (
                module.resource && (allowedModules.src.concat(['core-js'])).some(
                  name => module.resource.includes(path.resolve('./node_modules/' + name))
                )
              )
            )
          }
        }
      }
    }
  },
  plugins
};
