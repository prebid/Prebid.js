import { createBid } from '../src/bidfactory';
import { STATUS } from '../src/constants';
import { ajax } from '../src/ajax';
import * as utils from '../src/utils';
import { config } from '../src/config';
import { getHook } from '../src/hook.js';

const DEFAULT_CURRENCY_RATE_URL = 'https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json?date=$$TODAY$$';
const CURRENCY_RATE_PRECISION = 4;

var bidResponseQueue = [];
var conversionCache = {};
var currencyRatesLoaded = false;
var needToCallForCurrencyFile = true;
var adServerCurrency = 'USD';

export var currencySupportEnabled = false;
export var currencyRates = {};
var bidderCurrencyDefault = {};
var defaultRates;

/**
 * Configuration function for currency
 * @param  {string} [config.adServerCurrency = 'USD']
 *  ISO 4217 3-letter currency code that represents the target currency. (e.g. 'EUR').  If this value is present,
 *  the currency conversion feature is activated.
 * @param  {number} [config.granularityMultiplier = 1]
 *  A decimal value representing how mcuh to scale the price granularity calculations.
 * @param  {object} config.bidderCurrencyDefault
 *  An optional argument to specify bid currencies for bid adapters.  This option is provided for the transitional phase
 *  before every bid adapter will specify its own bid currency.  If the adapter specifies a bid currency, this value is
 *  ignored for that bidder.
 *
 *  example:
 *  {
 *    rubicon: 'USD'
 *  }
 * @param  {string} [config.conversionRateFile = 'URL pointing to conversion file']
 *  Optional path to a file containing currency conversion data.  Prebid.org hosts a file that is used as the default,
 *  if not specified.
 * @param  {object} [config.rates]
 *  This optional argument allows you to specify the rates with a JSON object, subverting the need for a external
 *  config.conversionRateFile parameter.  If this argument is specified, the conversion rate file will not be loaded.
 *
 *  example:
 *  {
 *    'GBP': { 'CNY': 8.8282, 'JPY': 141.7, 'USD': 1.2824 },
 *    'USD': { 'CNY': 6.8842, 'GBP': 0.7798, 'JPY': 110.49 }
 *  }
 *  @param {object} [config.defaultRates]
 *  This optional currency rates definition follows the same format as config.rates, however it is only utilized if
 *  there is an error loading the config.conversionRateFile.
 */
export function setConfig(config) {
  let url = DEFAULT_CURRENCY_RATE_URL;

  if (typeof config.rates === 'object') {
    currencyRates.conversions = config.rates;
    currencyRatesLoaded = true;
    needToCallForCurrencyFile = false; // don't call if rates are already specified
  }

  if (typeof config.defaultRates === 'object') {
    defaultRates = config.defaultRates;

    // set up the default rates to be used if the rate file doesn't get loaded in time
    currencyRates.conversions = defaultRates;
    currencyRatesLoaded = true;
  }

  if (typeof config.adServerCurrency === 'string') {
    utils.logInfo('enabling currency support', arguments);

    adServerCurrency = config.adServerCurrency;
    if (config.conversionRateFile) {
      utils.logInfo('currency using override conversionRateFile:', config.conversionRateFile);
      url = config.conversionRateFile;
    }

    // see if the url contains a date macro
    // this is a workaround to the fact that jsdelivr doesn't currently support setting a 24-hour HTTP cache header
    // So this is an approach to let the browser cache a copy of the file each day
    // We should remove the macro once the CDN support a day-level HTTP cache setting
    const macroLocation = url.indexOf('$$TODAY$$');
    if (macroLocation !== -1) {
      // get the date to resolve the macro
      const d = new Date();
      let month = `${d.getMonth() + 1}`;
      let day = `${d.getDate()}`;
      if (month.length < 2) month = `0${month}`;
      if (day.length < 2) day = `0${day}`;
      const todaysDate = `${d.getFullYear()}${month}${day}`;

      // replace $$TODAY$$ with todaysDate
      url = `${url.substring(0, macroLocation)}${todaysDate}${url.substring(macroLocation + 9, url.length)}`;
    }

    initCurrency(url);
  } else {
    // currency support is disabled, setting defaults
    utils.logInfo('disabling currency support');
    resetCurrency();
  }
  if (typeof config.bidderCurrencyDefault === 'object') {
    bidderCurrencyDefault = config.bidderCurrencyDefault;
  }
}
config.getConfig('currency', config => setConfig(config.currency));

function errorSettingsRates(msg) {
  if (defaultRates) {
    utils.logWarn(msg);
    utils.logWarn('Currency failed loading rates, falling back to currency.defaultRates');
  } else {
    utils.logError(msg);
  }
}

function initCurrency(url) {
  conversionCache = {};
  currencySupportEnabled = true;

  utils.logInfo('Installing addBidResponse decorator for currency module', arguments);

  getHook('addBidResponse').before(addBidResponseHook, 100);

  // call for the file if we haven't already
  if (needToCallForCurrencyFile) {
    needToCallForCurrencyFile = false;
    ajax(url,
      {
        success: function (response) {
          try {
            currencyRates = JSON.parse(response);
            utils.logInfo('currencyRates set to ' + JSON.stringify(currencyRates));
            currencyRatesLoaded = true;
            processBidResponseQueue();
          } catch (e) {
            errorSettingsRates('Failed to parse currencyRates response: ' + response);
          }
        },
        error: errorSettingsRates
      }
    );
  }
}

function resetCurrency() {
  utils.logInfo('Uninstalling addBidResponse decorator for currency module', arguments);

  getHook('addBidResponse').getHooks({hook: addBidResponseHook}).remove();

  adServerCurrency = 'USD';
  conversionCache = {};
  currencySupportEnabled = false;
  currencyRatesLoaded = false;
  needToCallForCurrencyFile = true;
  currencyRates = {};
  bidderCurrencyDefault = {};
}

export function addBidResponseHook(fn, adUnitCode, bid) {
  if (!bid) {
    return fn.call(this, adUnitCode); // if no bid, call original and let it display warnings
  }

  let bidder = bid.bidderCode || bid.bidder;
  if (bidderCurrencyDefault[bidder]) {
    let currencyDefault = bidderCurrencyDefault[bidder];
    if (bid.currency && currencyDefault !== bid.currency) {
      utils.logWarn(`Currency default '${bidder}: ${currencyDefault}' ignored. adapter specified '${bid.currency}'`);
    } else {
      bid.currency = currencyDefault;
    }
  }

  // default to USD if currency not set
  if (!bid.currency) {
    utils.logWarn('Currency not specified on bid.  Defaulted to "USD"');
    bid.currency = 'USD';
  }

  // used for analytics
  bid.getCpmInNewCurrency = function(toCurrency) {
    return (parseFloat(this.cpm) * getCurrencyConversion(this.currency, toCurrency)).toFixed(3);
  };

  bid.originalCpm = bid.cpm;
  bid.originalCurrency = bid.currency;

  // execute immediately if the bid is already in the desired currency
  if (bid.currency === adServerCurrency) {
    return fn.call(this, adUnitCode, bid);
  }

  bidResponseQueue.push(wrapFunction(fn, this, [adUnitCode, bid]));
  if (!currencySupportEnabled || currencyRatesLoaded) {
    processBidResponseQueue();
  }
}

function processBidResponseQueue() {
  while (bidResponseQueue.length > 0) {
    (bidResponseQueue.shift())();
  }
}

function wrapFunction(fn, context, params) {
  return function() {
    let bid = params[1];
    if (bid !== undefined && 'currency' in bid && 'cpm' in bid) {
      let fromCurrency = bid.currency;
      try {
        let conversion = getCurrencyConversion(fromCurrency);
        if (conversion !== 1) {
          bid.cpm = (parseFloat(bid.cpm) * conversion).toFixed(4);
          bid.currency = adServerCurrency;
        }
      } catch (e) {
        utils.logWarn('Returning NO_BID, getCurrencyConversion threw error: ', e);
        params[1] = createBid(STATUS.NO_BID, {
          bidder: bid.bidderCode || bid.bidder,
          bidId: bid.requestId
        });
      }
    }
    return fn.apply(context, params);
  };
}

function getCurrencyConversion(fromCurrency, toCurrency = adServerCurrency) {
  var conversionRate = null;
  var rates;
  let cacheKey = `${fromCurrency}->${toCurrency}`;
  if (cacheKey in conversionCache) {
    conversionRate = conversionCache[cacheKey];
    utils.logMessage('Using conversionCache value ' + conversionRate + ' for ' + cacheKey);
  } else if (currencySupportEnabled === false) {
    if (fromCurrency === 'USD') {
      conversionRate = 1;
    } else {
      throw new Error('Prebid currency support has not been enabled and fromCurrency is not USD');
    }
  } else if (fromCurrency === toCurrency) {
    conversionRate = 1;
  } else {
    if (fromCurrency in currencyRates.conversions) {
      // using direct conversion rate from fromCurrency to toCurrency
      rates = currencyRates.conversions[fromCurrency];
      if (!(toCurrency in rates)) {
        // bid should fail, currency is not supported
        throw new Error('Specified adServerCurrency in config \'' + toCurrency + '\' not found in the currency rates file');
      }
      conversionRate = rates[toCurrency];
      utils.logInfo('getCurrencyConversion using direct ' + fromCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
    } else if (toCurrency in currencyRates.conversions) {
      // using reciprocal of conversion rate from toCurrency to fromCurrency
      rates = currencyRates.conversions[toCurrency];
      if (!(fromCurrency in rates)) {
        // bid should fail, currency is not supported
        throw new Error('Specified fromCurrency \'' + fromCurrency + '\' not found in the currency rates file');
      }
      conversionRate = roundFloat(1 / rates[fromCurrency], CURRENCY_RATE_PRECISION);
      utils.logInfo('getCurrencyConversion using reciprocal ' + fromCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
    } else {
      // first defined currency base used as intermediary
      var anyBaseCurrency = Object.keys(currencyRates.conversions)[0];

      if (!(fromCurrency in currencyRates.conversions[anyBaseCurrency])) {
        // bid should fail, currency is not supported
        throw new Error('Specified fromCurrency \'' + fromCurrency + '\' not found in the currency rates file');
      }
      var toIntermediateConversionRate = 1 / currencyRates.conversions[anyBaseCurrency][fromCurrency];

      if (!(toCurrency in currencyRates.conversions[anyBaseCurrency])) {
        // bid should fail, currency is not supported
        throw new Error('Specified adServerCurrency in config \'' + toCurrency + '\' not found in the currency rates file');
      }
      var fromIntermediateConversionRate = currencyRates.conversions[anyBaseCurrency][toCurrency];

      conversionRate = roundFloat(toIntermediateConversionRate * fromIntermediateConversionRate, CURRENCY_RATE_PRECISION);
      utils.logInfo('getCurrencyConversion using intermediate ' + fromCurrency + ' thru ' + anyBaseCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
    }
  }
  if (!(cacheKey in conversionCache)) {
    utils.logMessage('Adding conversionCache value ' + conversionRate + ' for ' + cacheKey);
    conversionCache[cacheKey] = conversionRate;
  }
  return conversionRate;
}

function roundFloat(num, dec) {
  var d = 1;
  for (let i = 0; i < dec; i++) {
    d += '0';
  }
  return Math.round(num * d) / d;
}
