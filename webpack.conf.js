var prebid = require('./package.json');
var path = require('path');
var webpack = require('webpack');
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
  new RequireEnsureWithoutJsonp(),
  new webpack.EnvironmentPlugin(['LiveConnectMode'])
];

if (argv.analyze) {
  plugins.push(
    new BundleAnalyzerPlugin()
  )
}

plugins.push(  // this plugin must be last so it can be easily removed for karma unit tests
  new webpack.optimize.CommonsChunkPlugin({
    name: 'prebid',
    filename: 'prebid-core.js',
    minChunks: function(module) {
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
  })
);

module.exports = {
  devtool: 'source-map',
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
      /* gu-mod-start */
      {
        // Transform @guardian packages as per the recommendations https://git.io/J3Pk4
        test: /\.m?(j|t)sx?$/,
        exclude: {
          test: /node_modules/,
          exclude: /@guardian\//,
        },
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }]
              ],
              plugins: ['@babel/plugin-proposal-optional-chaining']
            }
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
  plugins
};
