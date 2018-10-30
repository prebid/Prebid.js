var prebid = require('./package.json');
var StringReplacePlugin = require('string-replace-webpack-plugin');
var path = require('path');
var webpack = require('webpack');
var helpers = require('./gulpHelpers');
var RequireEnsureWithoutJsonp = require('./plugins/RequireEnsureWithoutJsonp.js');

// list of module names to never include in the common bundle chunk
var neverBundle = [
  'AnalyticsAdapter.js'
];

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
      {
        test: /\.js$/,
        exclude: path.resolve('./node_modules'), // required to prevent loader from choking non-Prebid.js node_modules
        use: [
          {
            loader: 'babel-loader',
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
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.md$/,
        loader: 'ignore-loader'
      },
      {
        test: /constants.json$/,
        include: /(src)/,
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /%%REPO_AND_VERSION%%/g,
              replacement: function (match, p1, offset, string) {
                return `${prebid.repository.url.split('/')[3]}_prebid_${prebid.version}`;
              }
            }
          ]
        })
      },
      {
        test: /\.js$/,
        include: /(src|test|modules|integrationExamples)/,
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /\$\$PREBID_GLOBAL\$\$/g,
              replacement: function (match, p1, offset, string) {
                return prebid.globalVarName;
              }
            }
          ]
        })
      }
    ]
  },
  plugins: [
    new StringReplacePlugin(),
    new RequireEnsureWithoutJsonp(),

    // this plugin must be last so it can be easily removed for karma unit tests
    new webpack.optimize.CommonsChunkPlugin({
      name: 'prebid',
      filename: 'prebid-core.js',
      minChunks: function(module, count) {
        return !(count < 2 || neverBundle.indexOf(path.basename(module.resource)) !== -1)
      }
    })
  ]
};
