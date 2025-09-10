const TerserPlugin = require('terser-webpack-plugin');
var prebid = require('./package.json');
var path = require('path');
const cacheDir = path.resolve(__dirname, '.cache/babel-loader');
var webpack = require('webpack');
var helpers = require('./gulpHelpers.js');
var { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
var argv = require('yargs').argv;
const fs = require('fs');
const {WebpackManifestPlugin} = require('webpack-manifest-plugin')

// Check if ES5 mode is requested
const isES5Mode = argv.ES5;

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
  target: isES5Mode ? ['web', 'es5'] : 'web',
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.cache/webpack')
  },
  context: helpers.getPrecompiledPath(),
  resolve: {
    modules: [
      helpers.getPrecompiledPath(),
      'node_modules'
    ],
    alias: {
      // alias package.json instead of including it as part of precompilation output;
      // a simple copy does not work as it contains relative paths (e.g. sideEffects)
      'package.json': path.resolve(__dirname, 'package.json')
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: path.resolve('./node_modules'),
        enforce: "pre",
        use: ["source-map-loader"],
      },
      ...(() => {
        if (!isES5Mode) {
          return [];
        } else {
          const babelConfig = require('./babelConfig.js')({disableFeatures: helpers.getDisabledFeatures(), prebidDistUrlBase: argv.distUrlBase, ES5: true});
          return [
            {
              test: /\.node_modules\/.*\.js$/,
              use: [
                {
                  loader: 'babel-loader',
                  options: Object.assign(
                    {cacheDirectory: cacheDir, cacheCompression: false},
                    babelConfig,
                    helpers.getAnalyticsOptions()
                  ),
                }
              ]
            },
          ]
        }
      })()
    ],
  },
  entry: (() => {
    const entry = {
      'prebid-core': {
        import: './src/prebid.js'
      },
      'prebid-core.metadata': {
        import: './metadata/modules/prebid-core.js',
        dependOn: 'prebid-core'
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
        const metadataModule = helpers.getMetadataEntry(mod);
        if (metadataModule != null) {
          entry[metadataModule] = {
            import: `./metadata/modules/${mod}.js`,
            dependOn: 'prebid-core'
          }
        }
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
          module: isES5Mode ? false : true, // Force ES5 output if ES5 mode is enabled
          ...(isES5Mode && {
            ecma: 5, // Target ES5
            compress: {
              ecma: 5 // Ensure compression targets ES5
            },
            mangle: {
              safari10: true // Ensure compatibility with older browsers
            }
          })        }
      })
    ],
    splitChunks: {
      chunks: 'initial',
      minChunks: 1,
      minSize: 0,
      cacheGroups: (() => {
        function directoriesIn(relPath) {
          const root = path.resolve(__dirname, relPath);
          return fs.readdirSync(root).filter(f => fs.lstatSync(path.resolve(root, f)).isDirectory())
        }

        const libraries = Object.fromEntries(
          directoriesIn('libraries')
            .map(lib => {
              const dir = helpers.getPrecompiledPath(path.join('libraries', lib))
              const def = {
                name: lib,
                test: (module) => {
                  return module.resource && module.resource.startsWith(dir)
                }
              }
              return [lib, def];
            })
        );
        const renderers = Object.fromEntries(
          directoriesIn('creative/renderers')
            .map(renderer => {
              const file = helpers.getCreativeRendererPath(renderer);
              const name = `creative-renderer-${renderer}`;
              return [name, {
                name,
                test: (module) => module.resource === file
              }]
            })
        )
        const core = helpers.getPrecompiledPath('./src');
        const nodeMods = path.resolve(__dirname, 'node_modules')
        const precompiled = helpers.getPrecompiledPath();

        return Object.assign(libraries, renderers,{
          core: {
            name: 'chunk-core',
            test: (module) => {
              let resource = module.resource;
              if (resource) {
                if (resource.startsWith(__dirname) &&
                  !(resource.startsWith(precompiled) || resource.startsWith(nodeMods))) {
                  throw new Error(`Un-precompiled module: ${resource}`)
                }
                return resource.startsWith(core);
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
