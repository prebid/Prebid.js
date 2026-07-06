const helpers = require('./gulpHelpers.js');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  context: helpers.getPrecompiledPath(),
  resolve: {
    modules: [
      helpers.getPrecompiledPath(),
      'node_modules'
    ],
  },
  module: {
    rules: require('./webpack.babel.js')
  },
  entry: {
    'debugging-standalone': {
      import: './modules/debugging/standalone.js',
    }
  },
};
