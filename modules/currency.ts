import {deepSetValue, logError, logInfo, logMessage, logWarn} from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.js';
import { EVENTS, REJECTION_REASON } from '../src/constants.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {getHook} from '../src/hook.js';
import {defer} from '../src/utils/promise.js';
import {registerOrtbProcessor, REQUEST} from '../src/pbjsORTB.js';
import {timedAuctionHook, timedBidResponseHook} from '../src/utils/perfMetrics.js';
import {on as onEvent, off as offEvent} from '../src/events.js';
import { enrichFPD } from '../src/fpd/enrichment.js';
import { timeoutQueue } from '../libraries/timeoutQueue/timeoutQueue.js';
import type {Currency, BidderCode} from "../src/types/common.d.ts";
import {addApiMethod} from "../src/prebid.ts";

const DEFAULT_CURRENCY_RATE_URL = 'https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json?date=$$TODAY$$';
const CURRENCY_RATE_PRECISION = 4;
const MODULE_NAME = 'currency';

let ratesURL;
let bidResponseQueue = [];
let conversionCache = {};
let currencyRatesLoaded = false;
let needToCallForCurrencyFile = true;
let adServerCurrency = 'USD';

export var currencySupportEnabled = false;
export var currencyRates = {} as any;
let bidderCurrencyDefault = {};
let defaultRates;

export let responseReady = defer<void>();

const delayedAuctions = timeoutQueue();
let auctionDelay = 0;

export interface CurrencyConfig {
  /**
   *  ISO 4217 3-letter currency code that represents the target currency. (e.g. 'EUR').  If this value is present,
   *  the currency conversion feature is activated.
   */
  adServerCurrency: Currency;
  /**
   *  Optional URL to a file containing currency conversion data.  Prebid.org hosts a file that is used as the default,
   *  if not specified.
   */
  conversionRateFile?: string;
  /**
   * Time (in milliseconds) that auctions should be delayed to wait for conversion rates to load. Default is 0.
   */
  auctionDelay?: number;
  /**
   * A decimal value representing how much to scale the price granularity calculations.
   */
  granularityMultiplier?: number;
  /**
   *  This optional argument allows you to specify the rates with a JSON object, subverting the need for a external
   *  config.conversionRateFile parameter.  If this argument is specified, the conversion rate file will not be loaded.
   *
   *  example:
   *  {
   *    'GBP': { 'CNY': 8.8282, 'JPY': 141.7, 'USD': 1.2824 },
   *    'USD': { 'CNY': 6.8842, 'GBP': 0.7798, 'JPY': 110.49 }
   *  }
   */
  rates?: { [from: Currency]: { [to: Currency]: number } };
  /**
   *  This optional currency rates definition follows the same format as config.rates, however it is only utilized if
   *  there is an error loading the config.conversionRateFile.
   */
  defaultRates?: CurrencyConfig['rates'];
  /**
   *  An optional argument to specify bid currencies for bid adapters.  This option is provided for the transitional phase
   *  before every bid adapter will specify its own bid currency.  If the adapter specifies a bid currency, this value is
   *  ignored for that bidder.
   *
   *  example:
   *  {
   *    rubicon: 'USD'
   *  }
   */
  bidderCurrencyDefault?: { [bidder: BidderCode]: Currency };
}

declare module '../src/config' {
  interface Config {
    currency?: CurrencyConfig;
  }
}

export function setConfig(config: CurrencyConfig) {
  ratesURL = DEFAULT_CURRENCY_RATE_URL;

  if (config.rates !== null && typeof config.rates === 'object') {
    currencyRates.conversions = config.rates;
    currencyRatesLoaded = true;
    needToCallForCurrencyFile = false; // don't call if rates are already specified
  }

  if (config.defaultRates !== null && typeof config.defaultRates === 'object') {
    defaultRates = config.defaultRates;

    // set up the default rates to be used if the rate file doesn't get loaded in time
    currencyRates.conversions = defaultRates;
    currencyRatesLoaded = true;
  }

  if (typeof config.adServerCurrency === 'string') {
    auctionDelay = config.auctionDelay;
    logInfo('enabling currency support', config);

    adServerCurrency = config.adServerCurrency;
    if (config.conversionRateFile) {
      logInfo('currency using override conversionRateFile:', config.conversionRateFile);
      ratesURL = config.conversionRateFile;
    }

    // see if the url contains a date macro
    // this is a workaround to the fact that jsdelivr doesn't currently support setting a 24-hour HTTP cache header
    // So this is an approach to let the browser cache a copy of the file each day
    // We should remove the macro once the CDN support a day-level HTTP cache setting
    const macroLocation = ratesURL.indexOf('$$TODAY$$');
    if (macroLocation !== -1) {
      // get the date to resolve the macro
      const d = new Date();
      let month = `${d.getMonth() + 1}`;
      let day = `${d.getDate()}`;
      if (month.length < 2) month = `0${month}`;
      if (day.length < 2) day = `0${day}`;
      const todaysDate = `${d.getFullYear()}${month}${day}`;

      // replace $$TODAY$$ with todaysDate
      ratesURL = `${ratesURL.substring(0, macroLocation)}${todaysDate}${ratesURL.substring(macroLocation + 9, ratesURL.length)}`;
    }

    initCurrency();
  } else {
    // currency support is disabled, setting defaults
    auctionDelay = 0;
    logInfo('disabling currency support');
    resetCurrency();
  }
  if (typeof config.bidderCurrencyDefault === 'object') {
    bidderCurrencyDefault = config.bidderCurrencyDefault;
  }
}
config.getConfig('currency', config => setConfig(config.currency));

function errorSettingsRates(msg) {
  if (defaultRates) {
    logWarn(msg);
    logWarn('Currency failed loading rates, falling back to currency.defaultRates');
  } else {
    logError(msg);
  }
}

function loadRates() {
  if (needToCallForCurrencyFile) {
    needToCallForCurrencyFile = false;
    currencyRatesLoaded = false;
    ajax(ratesURL,
      {
        success: function (response) {
          try {
            currencyRates = JSON.parse(response);
            logInfo('currencyRates set to ' + JSON.stringify(currencyRates));
            conversionCache = {};
            currencyRatesLoaded = true;
            processBidResponseQueue();
            delayedAuctions.resume();
          } catch (e) {
            errorSettingsRates('Failed to parse currencyRates response: ' + response);
          }
        },
        error: function (err) {
          errorSettingsRates(err);
          currencyRatesLoaded = true;
          processBidResponseQueue();
          delayedAuctions.resume();
          needToCallForCurrencyFile = true;
        }
      }
    );
  } else {
    processBidResponseQueue();
  }
}

declare module '../src/prebidGlobal' {
  interface PrebidJS {
    convertCurrency: typeof convertCurrency
  }
}

/**
 * Convert `amount` in currency `fromCurrency` to `toCurrency`.
 */
function convertCurrency(cpm, fromCurrency, toCurrency) {
  return parseFloat(cpm) * getCurrencyConversion(fromCurrency, toCurrency)
}

function initCurrency() {
  conversionCache = {};
  if (!currencySupportEnabled) {
    currencySupportEnabled = true;
    addApiMethod('convertCurrency', convertCurrency, false);
    // Adding conversion function to prebid global for external module and on page use
    getHook('addBidResponse').before(addBidResponseHook, 100);
    getHook('responsesReady').before(responsesReadyHook);
    enrichFPD.before(enrichFPDHook);
    getHook('requestBids').before(requestBidsHook, 50);
    onEvent(EVENTS.AUCTION_TIMEOUT, rejectOnAuctionTimeout);
    onEvent(EVENTS.AUCTION_INIT, loadRates);
    loadRates();
  }
}

export function resetCurrency() {
  if (currencySupportEnabled) {
    getHook('addBidResponse').getHooks({hook: addBidResponseHook}).remove();
    getHook('responsesReady').getHooks({hook: responsesReadyHook}).remove();
    enrichFPD.getHooks({hook: enrichFPDHook}).remove();
    getHook('requestBids').getHooks({hook: requestBidsHook}).remove();
    offEvent(EVENTS.AUCTION_TIMEOUT, rejectOnAuctionTimeout);
    offEvent(EVENTS.AUCTION_INIT, loadRates);
    delete getGlobal().convertCurrency;

    adServerCurrency = 'USD';
    conversionCache = {};
    currencySupportEnabled = false;
    currencyRatesLoaded = false;
    needToCallForCurrencyFile = true;
    currencyRates = {};
    bidderCurrencyDefault = {};
    responseReady = defer();
  }
}

function responsesReadyHook(next, ready) {
  next(ready.then(() => responseReady.promise));
}

declare module '../src/bidfactory' {
  interface BaseBid {
    /**
     * Convert this bid's CPM into the given currency.
     * @return the converted CPM as a string with 3 digit precision.
     */
    getCpmInNewCurrency(toCurrency: Currency): string
  }
}

export const addBidResponseHook = timedBidResponseHook('currency', function addBidResponseHook(fn, adUnitCode, bid, reject) {
  if (!bid) {
    return fn.call(this, adUnitCode, bid, reject); // if no bid, call original and let it display warnings
  }

  const bidder = bid.bidderCode || bid.bidder;
  if (bidderCurrencyDefault[bidder]) {
    const currencyDefault = bidderCurrencyDefault[bidder];
    if (bid.currency && currencyDefault !== bid.currency) {
      logWarn(`Currency default '${bidder}: ${currencyDefault}' ignored. adapter specified '${bid.currency}'`);
    } else {
      bid.currency = currencyDefault;
    }
  }

  // default to USD if currency not set
  if (!bid.currency) {
    logWarn('Currency not specified on bid.  Defaulted to "USD"');
    bid.currency = 'USD';
  }

  // used for analytics
  bid.getCpmInNewCurrency = function(toCurrency) {
    return (parseFloat(this.cpm) * getCurrencyConversion(this.currency, toCurrency)).toFixed(3);
  };

  // execute immediately if the bid is already in the desired currency
  if (bid.currency === adServerCurrency) {
    return fn.call(this, adUnitCode, bid, reject);
  }
  bidResponseQueue.push([fn, this, adUnitCode, bid, reject]);
  if (!currencySupportEnabled || currencyRatesLoaded) {
    processBidResponseQueue();
  }
});

function rejectOnAuctionTimeout({auctionId}) {
  bidResponseQueue = bidResponseQueue.filter(([fn, ctx, adUnitCode, bid, reject]) => {
    if (bid.auctionId === auctionId) {
      reject(REJECTION_REASON.CANNOT_CONVERT_CURRENCY)
      return false;
    } else {
      return true;
    }
  });
}

function processBidResponseQueue() {
  while (bidResponseQueue.length > 0) {
    const [fn, ctx, adUnitCode, bid, reject] = bidResponseQueue.shift();
    if (bid !== undefined && 'currency' in bid && 'cpm' in bid) {
      const fromCurrency = bid.currency;
      try {
        const conversion = getCurrencyConversion(fromCurrency);
        if (conversion !== 1) {
          bid.cpm = (parseFloat(bid.cpm) * conversion).toFixed(4);
          bid.currency = adServerCurrency;
        }
      } catch (e) {
        logWarn('getCurrencyConversion threw error: ', e);
        reject(REJECTION_REASON.CANNOT_CONVERT_CURRENCY);
        continue;
      }
    }
    fn.call(ctx, adUnitCode, bid, reject);
  }
  responseReady.resolve();
}

function getCurrencyConversion(fromCurrency, toCurrency = adServerCurrency) {
  var conversionRate = null;
  var rates;
  const cacheKey = `${fromCurrency}->${toCurrency}`;
  if (cacheKey in conversionCache) {
    conversionRate = conversionCache[cacheKey];
    logMessage('Using conversionCache value ' + conversionRate + ' for ' + cacheKey);
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
      logInfo('getCurrencyConversion using direct ' + fromCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
    } else if (toCurrency in currencyRates.conversions) {
      // using reciprocal of conversion rate from toCurrency to fromCurrency
      rates = currencyRates.conversions[toCurrency];
      if (!(fromCurrency in rates)) {
        // bid should fail, currency is not supported
        throw new Error('Specified fromCurrency \'' + fromCurrency + '\' not found in the currency rates file');
      }
      conversionRate = roundFloat(1 / rates[fromCurrency], CURRENCY_RATE_PRECISION);
      logInfo('getCurrencyConversion using reciprocal ' + fromCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
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
      logInfo('getCurrencyConversion using intermediate ' + fromCurrency + ' thru ' + anyBaseCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
    }
  }
  if (!(cacheKey in conversionCache)) {
    logMessage('Adding conversionCache value ' + conversionRate + ' for ' + cacheKey);
    conversionCache[cacheKey] = conversionRate;
  }
  return conversionRate;
}

function roundFloat(num, dec) {
  var d: any = 1;
  for (let i = 0; i < dec; i++) {
    d += '0';
  }
  return Math.round(num * d) / d;
}

export function setOrtbCurrency(ortbRequest, bidderRequest, context) {
  if (currencySupportEnabled) {
    ortbRequest.cur = ortbRequest.cur || [context.currency || adServerCurrency];
  }
}

registerOrtbProcessor({type: REQUEST, name: 'currency', fn: setOrtbCurrency});

function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    deepSetValue(ortb2, 'ext.prebid.adServerCurrency', adServerCurrency);
    return ortb2;
  }))
}

export const requestBidsHook = timedAuctionHook('currency', function requestBidsHook(fn, reqBidsConfigObj) {
  const continueAuction = ((that) => () => fn.call(that, reqBidsConfigObj))(this);

  if (!currencyRatesLoaded && auctionDelay > 0) {
    delayedAuctions.submit(auctionDelay, continueAuction, () => {
      logWarn(`${MODULE_NAME}: Fetch attempt did not return in time for auction ${reqBidsConfigObj.auctionId}`)
      continueAuction();
    });
  } else {
    continueAuction();
  }
});
