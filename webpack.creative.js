const path = require('path');
const helpers = require('./gulpHelpers.js');

module.exports = {
  mode: 'production',
  context: helpers.getPrecompiledPath(),
  devtool: false,
  resolve: {
    modules: [
      helpers.getPrecompiledPath(),
      'node_modules'
    ],
  },
  entry: {
    'creative': {
      import: './creative/crossDomain.js',
    },
    'renderers/display': {
      import: './creative/renderers/display/renderer.js'
    },
    'renderers/native': {
      import: './creative/renderers/native/renderer.js'
    }
  },
  output: {
    path: path.resolve('./build/creative'),
  },
  module: {
    rules: [{
      use: 'source-map-loader'
    }]
  }
}
