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
      [
        useLocal('@babel/preset-typescript'),
        {
          // Preserve Babel 7's behavior until all type-only imports use
          // TypeScript's explicit `import type` syntax.
          // Preserve Babel 7's behavior until all type-only imports use `import type`.
          'onlyRemoveTypeImports': false,
        }
      ],
      [
        useLocal('@babel/preset-env'),
        {
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
