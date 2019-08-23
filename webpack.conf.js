var prebid = require('./package.json');
var path = require('path');
var helpers = require('./gulpHelpers');
var RequireEnsureWithoutJsonp = require('./plugins/RequireEnsureWithoutJsonp.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;
var allowedModules = require('./allowedModules');

// list of module names to never include in the common bundle chunk
var neverBundle = [
  'AnalyticsAdapter.js'
];

var plugins = [
  new RequireEnsureWithoutJsonp()
];

if (argv.analyze) {
  plugins.push(
    new BundleAnalyzerPlugin()
  )
}

module.exports = {
  devtool: 'source-map',
  mode: JSON.stringify(argv._) === JSON.stringify(['build']) ? 'production' : 'development',
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
    runtimeChunk: {
      name: 'prebid'
    },
    minimize: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: false,
        prebid: {
          chunks: 'all',
          name: 'prebid',
          filename: 'prebid-core.js',
          test: function(module, chunks) {
            return (
              (
                module.context && module.context.startsWith(path.resolve('./src')) &&
                !(module.resource && neverBundle.some(name => module.resource.includes(name)))
              ) ||
              module.resource && (allowedModules.src.concat(['core-js'])).some(
                name => module.resource.includes(path.resolve('./node_modules/' + name))
              )
            );
          }
        }
      }
    }
  },
  plugins
};
