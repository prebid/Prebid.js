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
      import: './libraries/creativeRender/crossDomain.js',
    },
  },
  output: {
    path: path.resolve('./build/creative'),
  },
}
