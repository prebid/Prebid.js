var prebid = require('./package.json');

var StringReplacePlugin = require("string-replace-webpack-plugin");

module.exports = {
  output: {
    filename: 'prebid.js'
  },
  devtool: 'source-map',
  resolve: {
    modulesDirectories: ['', 'node_modules', 'src']
  },
  resolveLoader: {
    modulesDirectories: ['loaders', 'node_modules']
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: /(src|test)/,
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
        loader: 'adapterLoader'
      },
      {
        test: /\.js$/,
        include: /(src|test)/,
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /PrebidGlobal/g,
              replacement: function (match, p1, offset, string) {
                  return prebid.globalVarName;
              }
            }
          ]})
        }
    ]
  },
  plugins: [
    // an instance of the plugin must be present
    new StringReplacePlugin()
  ]
};
