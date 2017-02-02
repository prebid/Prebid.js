/** adapterLoader
 * Webpack loader to insert dynamic javascript into `./src/adaptermanager.js`
 * This is used in `./webpack.conf.js`
 * */

'use strict';
const fs = require('fs');
const blockLoader = require('block-loader');
const getAdapters = require('./getAdapters');

const adapters = getAdapters();
const files = fs.readdirSync('src/adapters').map((file) => file.replace(/\.[^/.]+$/, ''));
const adapterNames = adapters.filter(getStandardAdapters).filter(getUniques);
//adapters loaded from `srcPath`
const customAdapters = adapters.map(getCustomAdapters).filter(adapter => {
  //filter undefined
  return !!adapter;
});
const aliases = adapters.filter(getAliases);
const videoAdapters = adapters.filter(getVideoAdapters).map(getNames);

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
    console.log('Prebid Warning: adapters config not found in adapters.json, no adapters will' +
      ' be loaded');
    return '';
  }

  let inserts = adapterNames.map(name => {
    if (files.includes(name)) {
      return name;
    } else {
      console.log(`Prebid Warning: no adapter found for ${name}, continuing.`);
    }
  });

  inserts = inserts.map(name => {
    return `var ${adapterName(name)} = require('./adapters/${name}.js');
    exports.registerBidAdapter(new ${adapterName(name)}(), '${name}');\n`;
  })
    .concat(customAdapters.map(adapter => {
      return `let ${adapter.name} = require('${adapter.srcPath}');
      exports.registerBidAdapter(new ${adapter.name}, '${adapter.name}');\n`;
    }))
    .concat(aliases.map(adapter => {
      const name = getNameStr(adapter);
      return `exports.aliasBidAdapter('${name}','${adapter[name].alias}');\n`;
    }))
    .concat(`exports.videoAdapters = ${JSON.stringify(videoAdapters)};`)
    .join('');

  if (!inserts.length) {
    console.log('No matching adapters found for config, no adapters will be loaded.');
    return '';
  }
  return inserts;
}

/**
 * Derive the variable name to use for the adapter
 * @param adapter
 * @returns {string}
 */
function adapterName(adapter) {
  if (adapter) {
    const result = adapter.split('');
    return result[0].toUpperCase() + result.join('').substr(1) + 'Adapter';
  }
  return '';
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
  return adapter.length ? adapter : getNameStr(adapter);
}

/**
 * Return adapter objects that have an alias field
 * @param adapter
 * @returns {*}
 */
function getAliases(adapter) {
  const name = getNameStr(adapter);
  return adapter && name && adapter[name].alias;
}

/**
 * Returns adapter objects that support video
 */
function getVideoAdapters(adapter) {
  const name = getNameStr(adapter);
  return adapter && name && adapter[name].supportedMediaTypes &&
    adapter[name].supportedMediaTypes.includes('video');
}

function getNameStr(adapter) {
  return Object.keys(adapter)[0];
}

function getStandardAdapters(adapter) {
  if (typeof adapter === 'string') {
    return adapter;
  }
}

function getCustomAdapters(adapter) {
  const srcPath = getSrcPath(adapter);
  if (srcPath === '') {
    return;
  }
  if (!fileExists(srcPath)) {
    console.warn(`Not able to locate adapter at: ${srcPath} continuing`);
    return;
  }
  return {
    name: getNames(adapter),
    srcPath: srcPath
  };
}

function getSrcPath(adapter) {
  const name = getNameStr(adapter);
  return name && adapter[name].srcPath ? adapter[name].srcPath : '';
}

function fileExists(path) {
  return fs.existsSync(path);
}

module.exports = blockLoader(options);
