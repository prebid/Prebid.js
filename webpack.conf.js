const TerserPlugin = require('terser-webpack-plugin');
var prebid = require('./package.json');
var path = require('path');
var webpack = require('webpack');
var helpers = require('./gulpHelpers.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;
const babelConfig = require('./babelConfig.js')({disableFeatures: helpers.getDisabledFeatures(), prebidDistUrlBase: argv.distUrlBase});

var plugins = [
  new webpack.EnvironmentPlugin({'LiveConnectMode': null}),
];

if (argv.analyze) {
  plugins.push(
    new BundleAnalyzerPlugin()
  )
}

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  resolve: {
    modules: [
      path.resolve('.'),
      'node_modules'
    ],
  },
  entry: (() => {
    const entry = {
      'prebid-core': {
        import: './src/prebid.js'
      },
      'debugging-standalone': {
        import: './modules/debugging/standalone.js'
      }
    };
    const selectedModules = new Set(helpers.getArgModules());

    Object.entries(helpers.getModules()).forEach(([fn, mod]) => {
      if (selectedModules.size === 0 || selectedModules.has(mod)) {
        const moduleEntry = {
          import: fn,
          dependOn: 'prebid-core'
        };

        if (helpers.isLibrary(mod)) {
          const libraryFiles = helpers.getLibraryFiles(mod);
          moduleEntry.import = libraryFiles || moduleEntry.import;
        }

        const libraries = helpers.getParentLibraries(mod);
        if (libraries.length) {
          moduleEntry.dependOn = ['prebid-core'].concat(libraries);
        }

        entry[mod] = moduleEntry;
      }
    });
    return entry;
  })(),
  output: {
    chunkLoadingGlobal: prebid.globalVarName + 'Chunk',
    chunkLoading: 'jsonp',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: path.resolve('./node_modules'), // required to prevent loader from choking non-Prebid.js node_modules
        use: [
          {
            loader: 'babel-loader',
            options: Object.assign({}, babelConfig, helpers.getAnalyticsOptions()),
          }
        ]
      },
      { // This makes sure babel-loader is ran on our intended Prebid.js modules that happen to be in node_modules
        test: /\.js$/,
        include: helpers.getArgModules().map(module => new RegExp('node_modules/' + module + '/')),
        use: [
          {
            loader: 'babel-loader',
            options: babelConfig
          }
        ],
      }
    ]
  },
  optimization: {
    usedExports: true,
    sideEffects: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false, // do not generate unhelpful LICENSE comment
        terserOptions: {
          module: true, // do not prepend every module with 'use strict'; allow mangling of top-level locals
        }
      })
    ]
  },
  plugins
};
