/** adapterLoader
 * Webpack loader to insert dynamic javascript into `./src/adaptermanager.js`
 * This is used in `./webpack.conf.js`
 * */

'use strict';

const fs = require('fs');
const blockLoader = require('block-loader');
const adapters = require('../package.json').adapters;

const files = fs.readdirSync('src/adapters').map((file) => file.replace(/\.[^/.]+$/, ''));
const adapterNames = adapters.map(getNames).filter(getUniques);
const aliases = adapters.filter(getAliases);

var options = {
  start: '/** INSERT ADAPTERS - DO NOT EDIT OR REMOVE */',
  end: '/** END INSERT ADAPTERS */',
  process: insertAdapters
};

/**
 * Returns a block of javascript statements to load adapter modules, register the adapters and
 * set adapter aliases
 * @returns {*}
 */
function insertAdapters() {

  if (!adapters) {
    console.log('Prebid Warning: adapters config not found in package.json, no adapters will' +
      ' be loaded');
    return '';
  }

  const inserts = adapterNames.map(name => {
    if (files.includes(name)) {
      return name;
    } else {
      console.log(`Prebid Warning: no adapter found for ${name}, continuing.`);
    }
  });

  if (!inserts.length) {
    console.log('Prebid Warning: no matching adapters found for config, no adapters will be' +
      ' loaded.');
    return '';
  }

  return inserts.map(name => {
    if (name === 'appnexusAst') {
      return `import { AppnexusAst } from './adapters/appnexusAst';
        exports.registerBidAdapter(new AppnexusAst('appnexus'), 'appnexus');\n`;
    } else {
      return `var ${adapterName(name)} = require('./adapters/${name}.js');
        exports.registerBidAdapter(new ${adapterName(name)}${useCreateNew(name)}(), '${name}');\n`;
    }
  })
    .concat(aliases.map(adapter => {
      const name = Object.keys(adapter)[0];
      return `exports.aliasBidAdapter('${name}','${adapter[name].alias}');\n`;
    }))
    .join('');
}

/**
 * Derive the variable name to use for the adapter
 * @param adapter
 * @returns {string}
 */
function adapterName(adapter) {
  const result = adapter.split('');
  return result[0].toUpperCase() + result.join('').substr(1) + 'Adapter';
}

/**
 * Some adapters export an object with a `createNew` constructor so accommodate this pattern
 * @param adapter
 * @returns {string}
 */
function useCreateNew(adapter) {
  return adapter === 'appnexus' ? '.createNew' : '';
}

/**
 * Filter an array to return unique values
 * @param value current array element value
 * @param index current array element index
 * @param self current array
 * @returns {boolean} if true the current array element is returned
 *
 * http://stackoverflow.com/questions/1960473/unique-values-in-an-array
 */
function getUniques(value, index, self) {
  return self.indexOf(value) === index;
}

/**
 * Filter to derive the adapter name from array elements as strings or objects
 * @param adapter
 * @returns {*}
 */
function getNames(adapter) {
  // if `length` then `adapter` is a string, otherwise an object
  return adapter.length ? adapter : Object.keys(adapter)[0];
}

/**
 * Return adapter objects that have an alias field
 * @param adapter
 * @returns {*}
 */
function getAliases(adapter) {
  const name = Object.keys(adapter)[0];
  return adapter && name && adapter[name].alias;
}

module.exports = blockLoader(options);
