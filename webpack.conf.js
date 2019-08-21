var prebid = require('./package.json');
var path = require('path');
var webpack = require('webpack');
var helpers = require('./gulpHelpers');
var RequireEnsureWithoutJsonp = require('./plugins/RequireEnsureWithoutJsonp.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;

// list of module names to never include in the common bundle chunk
var neverBundle = [
  'AnalyticsAdapter.js'
];

var plugins = [
  new RequireEnsureWithoutJsonp()
];
console.log('argv::::', JSON.stringify(argv._));
console.log('yargs:::', JSON.stringify(argv._) === JSON.stringify(['build']));
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
    jsonpFunction: prebid.globalVarName + "Chunk",
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
    moduleIds: 'hashed',
    runtimeChunk: 'single',
    splitChunks: {
      minSize: 0,
      chunks: 'all',
      cacheGroups: {
        default: {
          minChunks: 2,
          minSize: 0,
          reuseExistingChunk: true
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          reuseExistingChunk: true
        },
        commons: {
          chunks: 'all',
          name: 'prebid',
          filename: 'prebid-core.js',
          priority:1,
          minSize: 0,
          test: function(module, chunks) {
            console.log('mode::::',this.mode);
            if(module.resource && module.resource.includes('bidderFactory.js')) {
              console.log(module.name, module.resource, module.context, 'context:::', module.context && (module.context.indexOf(path.resolve('./src'))>-1));
            }
            console.log(module.name, module.resource, module.context, 'context:::', module.context && (module.context.indexOf(path.resolve('./src'))>-1));
            return (
              (
                module.context && (module.context.indexOf(path.resolve('./src'))>-1) &&
                !(module.resource && neverBundle.some(name => module.resource.includes(name)))
              ) ||
              module.resource && module.resource.includes(path.resolve('./node_modules/core-js'))
            );
          }
        }
      }
    }
  },
  plugins
};
