const path = require('path');

module.exports = {
  mode: 'production',
  resolve: {
    modules: [
      path.resolve('.'),
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
}
