const path = require('path');
const { argv } = require('yargs');
const TerserPlugin = require('terser-webpack-plugin');
const helpers = require('./gulpHelpers.js');
const isES5Mode = argv.ES5;

// Browsers the ES5 bundle aims to support. This list drives *polyfill* selection
// only; syntax is forced down to ES5 unconditionally (see forceAllTransforms
// below), because every browser listed here already supports ES2015.
//
// IE is deliberately absent. No IE version ever shipped Proxy - it is not in
// caniuse for any release, and it cannot be polyfilled (core-js has no module
// for it) - while prebid uses `new Proxy` in adapter and consent-guard code
// paths, including src/adapters/bidderFactory.ts. So IE support was never
// achievable here; listing it only inflated the polyfill set.
const browsers = [
  'chrome >= 50',
  // Note this is the *polyfill* floor, not what the e2e suite can exercise. GPT does
  // not render a creative on Firefox before 65: on 50 it never reaches apiReady, and
  // from 52 to 64 it reports ready and defines slots but no creative iframe ever
  // appears. Prebid itself is fine there (the auction and targeting tests pass on 50),
  // so the target stays at 50 while browsers-es5.json tests on 65.
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
                // Emit ES5 regardless of the support list. Deriving syntax from
                // `browsers` would stop producing ES5 the moment the oldest target
                // supports ES2015 - and without any targets at all, package.json's
                // `browserslist` ("> 0.25%") would apply instead.
                forceAllTransforms: true
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
              // Same idea as above, for the fetch family - which core-js does not
              // cover at all, so `polyfill-corejs3` cannot supply it. Also
              // `usage-pure`, so `window.fetch` is left alone, and also target
              // driven, so it vanishes once the targets all support AbortController.
              [path.resolve(__dirname, './plugins/polyfillFetch.js'), {
                method: 'usage-pure',
                targets: { browsers },
                // this pass runs over precompiled sources, so import from there
                ponyfill: helpers.getPrecompiledPath('libraries/fetchPonyfill/index.js')
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
