// These stubs are here to help transition away from core-js polyfills for browsers we are no longer supporting.
// You should not need these for new code; use stock JS instead!

export function find(arr, pred, thisArg) {
  return arr && arr.find(pred, thisArg);
}
