
let path = require('path');
var argv = require('yargs').argv;

function useLocal(module) {
  return require.resolve(module, {
    paths: [
      __dirname
    ]
  })
}

module.exports = function (options = {}) {

  const isES5Mode = argv.ES5 || options.ES5;

  return {
    'presets': [
      useLocal('@babel/preset-typescript'),
      [
        useLocal('@babel/preset-env'),
        {
          'useBuiltIns': isES5Mode ? 'usage' : 'entry',
          'corejs': '3.42.0',
          // Use ES5 mode if requested, otherwise use original logic
          'modules': isES5Mode ? 'commonjs' : false,
          ...(isES5Mode && {
            'targets': {
              'browsers': ['ie >= 11', 'chrome >= 50', 'firefox >= 50', 'safari >= 10']
            }
          })
        }
      ]
    ],
    'plugins': (() => {
      const plugins = [
        [path.resolve(__dirname, './plugins/pbjsGlobals.js'), options],
        [useLocal('@babel/plugin-transform-runtime')],
      ];
      return plugins;
    })(),
  }
}
