// These stubs are here to help transition away from core-js polyfills for browsers we are no longer supporting.
// You should not need these for new code; use stock JS instead!

import { deepAccess } from "./utils.js";

export function includes(target, elem, start) {
  return (target && target.includes(elem, start)) || false;
}

export function arrayFrom() {
  return Array.from.apply(Array, arguments);
}

export function find(arr, pred, thisArg) {
  return arr && arr.find(pred, thisArg);
}

export function findBy(arr, field, values, thisArg, normalizer = (v) => v) {
  const pred = (item) => values.some(value => normalizer(value) === normalizer(deepAccess(item, field)));
  return arr && arr.find(pred, thisArg);
}

export function findIndex(arr, pred, thisArg) {
  return arr && arr.findIndex(pred, thisArg);
}
