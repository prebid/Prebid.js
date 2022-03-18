
let path = require('path');

function useLocal(module) {
  return require.resolve(module, {
    paths: [
      __dirname
    ]
  })
}

module.exports = function (test = false) {
  return {
    'presets': [
      [
        useLocal('@babel/preset-env'),
        {
          'useBuiltIns': 'entry',
          'corejs': '3.13.0',
          // a lot of tests use sinon.stub & others that stopped working on ES6 modules with webpack 5
          'modules': test ? 'commonjs' : 'auto',
        }
      ]
    ],
    'plugins': [
      path.resolve(__dirname, './plugins/pbjsGlobals.js'),
      useLocal('babel-plugin-transform-object-assign'),
    ],
  }
}
