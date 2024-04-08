const TerserPlugin = require('terser-webpack-plugin');
var prebid = require('./package.json');
var path = require('path');
var webpack = require('webpack');
var helpers = require('./gulpHelpers.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;
const fs = require('fs');
const babelConfig = require('./babelConfig.js')({disableFeatures: helpers.getDisabledFeatures(), prebidDistUrlBase: argv.distUrlBase});
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
  resolve: {
    modules: [
      path.resolve('.'),
      'node_modules'
    ],
  },
  entry: (() => {
    const entry = {
      'prebid-core': {
        import: './src/prebid.js'
      },
      'debugging-standalone': {
        import: './modules/debugging/standalone.js'
      }
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
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: path.resolve('./node_modules'), // required to prevent loader from choking non-Prebid.js node_modules
        use: [
          {
            loader: 'babel-loader',
            options: Object.assign({}, babelConfig, helpers.getAnalyticsOptions()),
          }
        ]
      },
      { // This makes sure babel-loader is ran on our intended Prebid.js modules that happen to be in node_modules
        test: /\.js$/,
        include: helpers.getArgModules().map(module => new RegExp('node_modules/' + module + '/')),
        use: [
          {
            loader: 'babel-loader',
            options: babelConfig
          }
        ],
      }
    ]
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
        const libRoot = path.resolve(__dirname, 'libraries');
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
        const core = path.resolve('./src');
        const paapiMod = path.resolve('./modules/paapi.js');
        const nodeModules = path.resolve('./node_modules');

        return Object.assign(libraries, {
          common_deps: {
            name: 'common_deps',
            test(module) {
              return module.resource && module.resource.startsWith(nodeModules);
            }
          },
          core: {
            name: 'chunk-core',
            test: (module) => {
              return module.resource && module.resource.startsWith(core);
            }
          },
          paapi: {
            // fledgeForGpt imports paapi to keep backwards compat for NPM consumers
            // this makes the paapi module its own chunk, pulled in by both paapi and fledgeForGpt entry points,
            // to avoid duplication
            // TODO: remove this in prebid 9
            name: 'chunk-paapi',
            test: (module) => {
              return module.resource === paapiMod;
            }
          }
        }, {
          default: false,
          defaultVendors: false
        });
      })()
    }
  },
  plugins
};
