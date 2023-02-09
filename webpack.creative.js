const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const InlineConstantExportsPlugin = require( '@automattic/webpack-inline-constant-exports-plugin' );

module.exports = {
  mode: 'production',
  resolve: {
    modules: [
      path.resolve('.'),
      'node_modules'
    ],
  },
  entry: {
    'cross-domain-creative': {
      import: './libraries/creativeRender/crossDomainCreative.js',
    },
    'cross-domain-example': {
      import: './libraries/creativeRender/crossDomainExample.js'
    }
  },
  output: {
    path: path.resolve('./build/creative'),
  },
  plugins: [
    new InlineConstantExportsPlugin( /constants.js/ )
  ],
  optimization: {
    usedExports: true,
    sideEffects: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          module: false,
          mangle: false,
          format: {
            beautify: true
          },
          compress: {
            //defaults: false,
            unused: true,
            negate_iife: false,
          },
        }
      })
    ],
  }
}
