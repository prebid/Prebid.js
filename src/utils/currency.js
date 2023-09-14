import {getGlobal} from '../prebidGlobal.js';

/**
 * "best effort" wrapper around currency conversion; always returns an amount that may or may not be correct.
 */
export function beConvertCurrency(amount, from, to) {
  if (from === to) return amount;
  let result = amount;
  if (typeof getGlobal().convertCurrency === 'function') {
    try {
      result = getGlobal().convertCurrency(amount, from, to);
    } catch (e) {
    }
  }
  return result;
}
