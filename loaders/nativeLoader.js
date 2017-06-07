const blockLoader = require('block-loader');
const getAdapters = require('./getAdapters');

const adapters = getAdapters('adapters.json', 'adapters');
const nativeAdapters = adapters.filter(getNativeAdapters).map(getNames);

const options = {
  start: '/** INSERT NATIVE ADAPTERS - DO NOT EDIT OR REMOVE */',
  end: '/** END INSERT NATIVE ADAPTERS */',
  process: insertAdapters
};

/**
 * Returns a block of javascript statements to load adapter modules, register the adapters and
 * set adapter aliases
 * @returns {*}
 */
function insertAdapters() {
  return `const nativeAdapters = ${JSON.stringify(nativeAdapters)};`;
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
 * Returns adapter objects that support native
 */
function getNativeAdapters(adapter) {
  const name = getNameStr(adapter);
  return adapter && name && adapter[name].supportedMediaTypes &&
    adapter[name].supportedMediaTypes.includes('native');
}

function getNameStr(adapter) {
  return Object.keys(adapter)[0];
}

module.exports = blockLoader(options);
