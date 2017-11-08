/** @module polyfill
Misc polyfills
*/
require('core-js/fn/array/find');
require('core-js/fn/array/find-index');
require('core-js/fn/array/includes');
require('core-js/fn/object/assign');

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
Number.isInteger = Number.isInteger || function(value) {
  return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value;
};

// IE10 does not have this propery. https://gist.github.com/hbogs/7908703
if (!window.location.origin) {
  window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
}
