
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
        "targets": {
          "browsers": [
            "chrome >= 61",
            "safari >=8",
            "edge >= 14",
            "ff >= 57",
            "ie >= 10",
            "ios >= 8"
          ]
        },
        modules: 'commonjs' //This causes Babel to transpile ES modules into CJS modules before Webpack sees them, which prevents Webpack from creating getters, which fixes Sinon.(Ref: https://github.com/webpack/webpack/issues/6979)
      }
    ]
  ],
  "plugins": [
    path.resolve(__dirname, './plugins/pbjsGlobals.js'),
    useLocal('babel-plugin-transform-object-assign')
  ]
};
