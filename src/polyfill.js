/** @module polyfill
Misc polyfills
*/
/*jshint -W121 */
require('core-js/fn/array/find');
require('core-js/fn/array/includes');

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
Number.isInteger = Number.isInteger || function(value) {
  return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value;
};
