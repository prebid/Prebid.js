var prebid = require('./package.json');
var StringReplacePlugin = require('string-replace-webpack-plugin');
var path = require('path');
var webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  resolve: {
    modulesDirectories: ['', 'node_modules', 'src']
  },
  resolveLoader: {
    modulesDirectories: ['loaders', 'node_modules']
  },
  output: {
    jsonpFunction: 'pbjsSeg'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: /(src|modules|test)/,
        exclude: path.resolve(__dirname, 'node_modules'),
        loader: 'babel', // 'babel-loader' is also a legal name to reference
        query: {
          presets: ['es2015']
        }
      },
      {
        test: /\.json$/,
        loader: 'json'
      },
      {
        test: /adaptermanager.js/,
        include: /(src)/,
        loader: 'analyticsLoader'
      },
      {
        test: /adaptermanager.js/,
        include: /(src)/,
        loader: 'adapterLoader'
      },
      {
        test: /native.js/,
        include: /(src)/,
        loader: 'nativeLoader'
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
    new webpack.optimize.CommonsChunkPlugin('prebid.js')
  ]
};
