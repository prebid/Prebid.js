var prebid = require('./package.json');
var path = require('path');
var webpack = require('webpack');
var helpers = require('./gulpHelpers.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;

var plugins = [
  new webpack.EnvironmentPlugin({'LiveConnectMode': null})
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
      }
    };
    const selectedModules = new Set(helpers.getArgModules());
    Object.entries(helpers.getModules()).forEach(([fn, mod]) => {
      if (selectedModules.size === 0 || selectedModules.has(mod)) {
        entry[mod] = {
          import: fn,
          dependOn: 'prebid-core'
        }
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
      /* gu-mod-start */
      {
        // Transform @guardian packages as per the recommendations:
        // https://github.com/guardian/recommendations/blob/main/npm-packages.md#using-guardian-npm-packages
        test: /\.m?(j|t)sx?$/,
        exclude: {
          and: [/node_modules/],
          not: [/@guardian\//],
        },
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [['@babel/preset-env', { targets: 'defaults' }]],
            },
          },
        ],
      },
      /* gu-mod-end */
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
    usedExports: true,
    sideEffects: true,
  },
  plugins,
  /* gu-mod-start */
  // Force webpack to not resolve the dynamic import of this @guardian/libs peer dependency
  externals: {
    'web-vitals': 'web-vitals',
  },
  /* gu-mod-end */
};
