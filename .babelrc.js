
let path = require('path');

function useLocal(module) {
  return require.resolve(module, {
    paths: [
      __dirname
    ]
  })
}

module.exports = {
  "presets": [
    [
      useLocal('@babel/preset-env'),
      {
        "useBuiltIns": "entry"
      }
    ]
  ],
  "plugins": [
    path.resolve(__dirname, './plugins/pbjsGlobals.js'),
    useLocal('babel-plugin-transform-object-assign')
  ]
};
