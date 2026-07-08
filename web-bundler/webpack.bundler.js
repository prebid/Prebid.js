const helpers = require('../gulpHelpers.js');

const MANIFEST_FILES = ['manifest.json', 'checksums.json', 'manifest.json.checksum', 'manifest.js.checksum'];

function makeConfig(dev, cfg) {
  return {
    mode: 'production',
    devtool: 'source-map',
    resolve: {
      alias: {
        ...Object.fromEntries(MANIFEST_FILES.map(f => [f, helpers.getBuiltPath(dev, f)])),
        'buildOptions.mjs': helpers.getPrecompiledPath('buildOptions.mjs')
      },
    },
    module: {
      rules: [
        {
          test: /\.checksum$/,
          type: 'asset/source'
        }
      ]
    },
    ...cfg
  };
}

module.exports = {
  manifest: (dev) => makeConfig(dev, {
    entry: {
      'manifest': {
        import: './web-bundler/out/manifest.js'
      }
    }
  }),
  bundler: (dev) => makeConfig(dev,{
    entry: {
      'bundle': {
        import: './web-bundler/out/bundle.js',
      },
    },
  }),
};
