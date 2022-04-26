// These stubs are here to help transition away from core-js polyfills for browsers we are no longer supporting.
// You should not need these for new code; use stock JS instead!

export function includes(target, elem, start) {
  return (target && target.includes(elem, start)) || false;
}

export function arrayFrom() {
  return Array.from.apply(Array, arguments);
}

export function find(arr, pred, thisArg) {
  return arr && arr.find(pred, thisArg);
}

export function findIndex(arr, pred, thisArg) {
  return arr && arr.findIndex(pred, thisArg);
}
