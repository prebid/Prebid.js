const path = require('path');
const helpers = require('./gulpHelpers.js');
const { argv } = require('yargs');

const isES5Mode = argv.ES5;

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
    },
    'renderers/safe': {
      import: './creative/renderers/safe/renderer.js'
    }
  },
  output: {
    path: path.resolve('./build/creative'),
  },
  module: {
    rules: [{
      extractSourceMap: true
    }, isES5Mode && {
      test: /\.[cm]?js$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  'useBuiltIns': 'usage',
                  'corejs': '3.42.0',
                  'modules': 'commonjs',
                  'targets': {
                    'browsers': require('./package.json').es5browserslist
                  }
                }
              ]
            ],
            plugins: [
              '@babel/plugin-transform-runtime'
            ]
          }
        }
      ]
    }]
  }
};
