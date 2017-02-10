/** @module polyfill
Misc polyfills
*/
/*jshint -W121 */
import shimArrayFind from 'array.prototype.find/shim';
import shimArrayIncludes from 'array-includes/shim';

if (!Array.prototype.find) {
  shimArrayFind();
}

if (!Array.prototype.includes) {
  shimArrayIncludes();
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
Number.isInteger = Number.isInteger || function(value) {
  return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value;
};
