const path = require('path');
const { argv } = require('yargs');
const isES5Mode = argv.ES5;

module.exports = isES5Mode ? [{
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
        plugins: [
          ['polyfill-corejs3', {
            'method': 'usage-pure',
            'version': require('core-js-pure/package.json').version,
            targets: {
              browsers: [
                "ie >= 11",
                "chrome >= 50",
                "firefox >= 50",
                "safari >= 10"
              ]
            }
          }],
          '@babel/plugin-transform-runtime',
          '@babel/plugin-transform-modules-commonjs',
        ]
      }
    }
  ]
}] : [];

