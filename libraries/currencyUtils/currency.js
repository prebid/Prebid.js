import {getGlobal} from '../../src/prebidGlobal.js';
import {keyCompare} from '../../src/utils/reducers.js';

/**
 * Attempt to convert `amount` from the currency `fromCur` to the currency `toCur`.
 *
 * By default, when the conversion is not possible (currency module not present or
 * throwing errors), the amount is returned unchanged. This behavior can be
 * toggled off with bestEffort = false.
 */
export function convertCurrency(amount, fromCur, toCur, bestEffort = true) {
  if (fromCur === toCur) return amount;
  let result = amount;
  try {
    result = getGlobal().convertCurrency(amount, fromCur, toCur);
  } catch (e) {
    if (!bestEffort) throw e;
  }
  return result;
}

export function currencyNormalizer(toCurrency = null, bestEffort = true, convert = convertCurrency) {
  return function (amount, currency) {
    if (toCurrency == null) toCurrency = currency;
    return convert(amount, currency, toCurrency, bestEffort);
  }
}

export function currencyCompare(get = (obj) => [obj.cpm, obj.currency], normalize = currencyNormalizer()) {
  return keyCompare(obj => normalize.apply(null, get(obj)))
}
