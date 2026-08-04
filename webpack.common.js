const path = require('path');
const { argv } = require('yargs');
const TerserPlugin = require('terser-webpack-plugin');
const isES5Mode = argv.ES5;

const browsers = [
  'ie >= 11',
  'chrome >= 50',
  'firefox >= 50',
  'safari >= 10'
];

module.exports = function (config) {
  config.target = isES5Mode ? ['web', 'es5'] : 'web';
  if (isES5Mode) {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.[cm]?js$/,
      exclude: path.resolve('./node_modules/core-js-pure'),
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
      use: [
        {
          loader: 'babel-loader',
          options: {
            presets: [
              // syntax only - polyfills are handled below
              ['@babel/preset-env', {
                useBuiltIns: false,
                modules: 'commonjs',
                targets: { browsers }
              }]
            ],
            plugins: [
              // `usage-pure` rewrites call sites to reference an imported implementation
              // (`str.replaceAll(..)` -> `_replaceAll(str).call(str, ..)`) instead of emitting
              // a bare `core-js/modules/..` import for its side effect. That matters here:
              // side-effect-only imports land in files that package.json's `sideEffects`
              // allowlist declares pure, so webpack is free to drop them and the polyfill
              // silently never installs. A referenced value cannot be dropped.
              // It also leaves the publisher's globals untouched.
              ['polyfill-corejs3', {
                method: 'usage-pure',
                version: require('core-js-pure/package.json').version,
                targets: { browsers }
              }],
              ['@babel/plugin-transform-runtime', {
                absoluteRuntime: true
              }]
            ]
          }
        }
      ]
    });

  }
  config.optimization = config.optimization || {};
  config.optimization.minimizer = [
    new TerserPlugin({
      extractComments: false, // do not generate unhelpful LICENSE comment
      terserOptions: {
        module: !isES5Mode, // Force ES5 output if ES5 mode is enabled
        ...(isES5Mode && {
          ecma: 5, // Target ES5
          compress: {
            ecma: 5 // Ensure compression targets ES5
          },
          mangle: {
            safari10: true // Ensure compatibility with older browsers
          }
        })
      }
    })
  ];

  return config;
};
