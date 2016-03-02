module.exports = {
  output: {
    filename: 'prebid.js'
  },
  devtool: 'source-map',
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
