const path = require('path');

function useLocal(module) {
  return require.resolve(module, {
    paths: [
      __dirname
    ]
  })
}

module.exports = function (options = {}) {

  return {
    'presets': [
      useLocal('@babel/preset-typescript'),
      [
        useLocal('@babel/preset-env'),
        {
          'useBuiltIns': 'entry',
          'corejs': '3.42.0',
          'modules': false,
        }
      ]
    ],
    'plugins': (() => {
      const plugins = [
        [path.resolve(__dirname, './plugins/pbjsGlobals.js'), options],
        [path.resolve(__dirname, './plugins/callerContext.js'), options],
        [path.resolve(__dirname, './plugins/gvlPurposes.js'), options],
        [useLocal('@babel/plugin-transform-runtime')],
      ];
      if (options.polyfills) {
        plugins.push([path.resolve(__dirname, './plugins/polyfills.js'), {
          ...options,
          output: path.resolve(__dirname, './build/dist/polyfills.json'),
        }])
      }
      return plugins;
    })(),
  }
}
