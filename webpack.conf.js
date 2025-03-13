const TerserPlugin = require('terser-webpack-plugin');
var prebid = require('./package.json');
var path = require('path');
var webpack = require('webpack');
var helpers = require('./gulpHelpers.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;
const fs = require('fs');
const {WebpackManifestPlugin} = require('webpack-manifest-plugin')

var plugins = [
  new webpack.EnvironmentPlugin({'LiveConnectMode': null}),
  new WebpackManifestPlugin({
    fileName: 'dependencies.json',
    generate: (seed, files) => {
      const entries = new Set();
      const addEntry = entries.add.bind(entries);

      files.forEach(file => file.chunk && file.chunk._groups && file.chunk._groups.forEach(addEntry));

      return Array.from(entries).reduce((acc, entry) => {
        const name = (entry.options || {}).name || (entry.runtimeChunk || {}).name
        const files = (entry.chunks || [])
          .filter(chunk => chunk.name !== name)
          .flatMap(chunk => [...chunk.files])
          .filter(Boolean);
        return name && files.length ? {...acc, [`${name}.js`]: files} : acc
      }, seed)
    }
  })
];

if (argv.analyze) {
  plugins.push(
    new BundleAnalyzerPlugin()
  )
}

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  context: helpers.getPrecompiledPath(),
  resolve: {
    modules: [
      helpers.getPrecompiledPath(),
      'node_modules'
    ],
  },
  entry: (() => {
    const entry = {
      'prebid-core': {
        import: './src/prebid.js'
      },
    };
    const selectedModules = new Set(helpers.getArgModules());

    Object.entries(helpers.getModules()).forEach(([fn, mod]) => {
      if (selectedModules.size === 0 || selectedModules.has(mod)) {
        const moduleEntry = {
          import: fn,
          dependOn: 'prebid-core'
        };

        entry[mod] = moduleEntry;
      }
    });
    return entry;
  })(),
  output: {
    chunkLoadingGlobal: prebid.globalVarName + 'Chunk',
    chunkLoading: 'jsonp',
  },
  optimization: {
    usedExports: true,
    sideEffects: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false, // do not generate unhelpful LICENSE comment
        terserOptions: {
          module: true, // do not prepend every module with 'use strict'; allow mangling of top-level locals
        }
      })
    ],
    splitChunks: {
      chunks: 'initial',
      minChunks: 1,
      minSize: 0,
      cacheGroups: (() => {
        const libRoot = helpers.getPrecompiledPath('libraries');
        const libraries = Object.fromEntries(
          fs.readdirSync(libRoot)
            .filter((f) => fs.lstatSync(path.resolve(libRoot, f)).isDirectory())
            .map(lib => {
              const dir = path.resolve(libRoot, lib)
              const def = {
                name: lib,
                test: (module) => {
                  return module.resource && module.resource.startsWith(dir)
                }
              }
              return [lib, def];
            })
        );
        const core = helpers.getPrecompiledPath('./src');
        const nodeMods = path.resolve(__dirname, 'node_modules')
        const precompiled = helpers.getPrecompiledPath();

        return Object.assign(libraries, {
          core: {
            name: 'chunk-core',
            test: (module) => {
              if (module.resource) {
                if (module.resource.startsWith(__dirname) &&
                  !(module.resource.startsWith(precompiled) || module.resource.startsWith(nodeMods))) {
                  throw new Error(`Un-precompiled module: ${module.resource}`)
                }
                return module.resource.startsWith(core);
              }
            }
          },
        }, {
          default: false,
          defaultVendors: false
        });
      })()
    }
  },
  plugins
};
