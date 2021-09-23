
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
            "edge >= 70",
            "ff >= 70",
            "ie >= 11",
            "ios >= 11"
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
