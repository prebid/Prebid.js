const helpers = require('./gulpHelpers.js');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  context: helpers.getPrecompiledPath(),
  experiments: {
    typescript: false
  },
  resolve: {
    modules: [
      helpers.getPrecompiledPath(),
      'node_modules'
    ],
  },
  entry: {
    'debugging-standalone': {
      import: './modules/debugging/standalone.js',
    }
  },
};
