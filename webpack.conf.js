var argv = require('yargs').argv;

module.exports = {
  entry: [
    'src/prebid.js'
  ],
  output: {
    path: 'build/dist/',
    filename: 'prebid.js'
  },
  devtool: argv.devtool && argv.devtool.length ?  argv.devtool : 'source-maps',
  resolve: {
    modulesDirectories: ['', 'node_modules', 'src']
  },
  resolveLoader: {
    modulesDirectories: ['node_modules']
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
      }
    ]
  }
};
