
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
            "chrome >= 75",
            "safari >=10",
            "edge >= 14",
            "ff >= 78",
            "ie >= 11",
            "ios >= 9"
          ]
        }
      }
    ]
  ],
  "plugins": [
    path.resolve(__dirname, './plugins/pbjsGlobals.js'),
    useLocal('babel-plugin-transform-object-assign')
  ]
};
