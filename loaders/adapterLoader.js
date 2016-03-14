'use strict';

const fs = require('fs');
const blockLoader = require('block-loader');
let adapters = require('../package.json').adapters;

var options = {
  start: '/** INSERT ADAPTERS - DO NOT EDIT OR REMOVE */',
  end: '/** END INSERT ADAPTERS */',
  process: function insertAdapters() {
    const files = fs.readdirSync('src/adapters').map((file) => file.replace(/\.[^/.]+$/, ''));

    if (!adapters || !adapters.length) {
      console.log('Prebid Warning: adapters config not found in package.json, building with all' +
        ' adapters');
      adapters = files;
    }

    let inserts = adapters.filter((adapter) => {
      if (files.includes(adapter)) {
        return adapter;
      } else {
        console.log(`Prebid Warning: no adapter found for ${adapter}, continuing.`);
      }
    });

    if (!inserts.length) {
      console.log('Prebid Warning: no matching adapters found for config, building with all' +
        ' adapters.');
    }

    inserts = inserts.length ? inserts : files;
    return inserts.map((adapter) => {
      if (adapter === 'appnexusAst') {
        return `import { AppnexusAst } from './adapters/appnexusAst';\n` +
          `exports.registerBidAdapter(new AppnexusAst('appnexus'), 'appnexus');\n`;
      }

      return `var ${adapterName(adapter)} = require('./adapters/${adapter}.js');\n` +
        `exports.registerBidAdapter(new ${adapterName(adapter)}` +
        `${useCreateNew(adapter)}(), '${adapter}');\n`;
    }).join('');
  }
};

function adapterName(adapter) {
  let result = adapter.split('');
  return result[0].toUpperCase() + result.join('').substr(1) + 'Adapter';
}

// some adapters export an object with a `createNew` constructor so accommodate this pattern
function useCreateNew(adapter) {
  return adapter === 'appnexus' ? '.createNew' : '';
}

module.exports = blockLoader(options);
