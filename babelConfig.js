let path = require('path');

function useLocal(module) {
  return require.resolve(module, {
    paths: [
      __dirname
    ]
  });
}

module.exports = function (options = {}) {
  return {
    'presets': [
      [
        useLocal('@babel/preset-env'),
        {
          'useBuiltIns': 'entry',
          'corejs': '3.13.0'
        }
      ]
    ],
    'plugins': [
      [path.resolve(__dirname, './plugins/pbjsGlobals.js'), options],
      useLocal('babel-plugin-transform-object-assign')
    ]
  };
};
