const helpers = require('./gulpHelpers.js');
const addCommonConfig = require('./webpack.common.js');

module.exports = addCommonConfig({
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
    },
    'devtoolsMcp-standalone': {
      import: './modules/devtoolsMcp/standalone.js',
    }
  },
});
