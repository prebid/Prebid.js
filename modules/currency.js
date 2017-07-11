
import bidfactory from 'src/bidfactory';
import { STATUS } from 'src/constants';
import { ajax } from 'src/ajax';
import * as utils from 'src/utils';
import bidmanager from 'src/bidmanager';

$$PREBID_GLOBAL$$.currency = setConfig;

const DEFAULT_CURRENCY_RATE_URL = "http://prebid.aws.rubiconproject.com/latest.json";
const CURRENCY_RATE_PRECISION = 4;

var bidResponseQueue = [];
var conversionCache = {};
var currencyRatesLoaded = false;
var adServerCurrency = 'USD';

var oldBidResponse;

export var currencySupportEnabled = false;
export var currencyRates = {};

export function setConfig(config) {
  var url = DEFAULT_CURRENCY_RATE_URL;
  if (typeof config.adServerCurrency === 'string') {
    utils.logInfo('enabling currency support', arguments);

    adServerCurrency = config.adServerCurrency;
    if (config.conversionRateFile) {
      utils.logInfo('currency using override conversionRateFile:', config.conversionRateFile);
      url = config.conversionRateFile;
    }
    initCurrency(url);
  } else {
    // currency support is disabled, setting defaults
    utils.logInfo('disabling currency support');
    resetCurrency();
  }
}

function initCurrency(url) {
  utils.logInfo('Invoking initCurrency', arguments);

  conversionCache = {};
  currencySupportEnabled = true;

  if(!oldBidResponse) {
    utils.logInfo('Installing addBidResponse decorator for currency module', arguments);

    oldBidResponse = bidmanager.addBidResponse;
    bidmanager.addBidResponse = addBidResponseDecorator(bidmanager.addBidResponse);
  }

  ajax(url, function(response) {
    try {
      currencyRates = JSON.parse(response);
      utils.logInfo('currencyRates set to ' + JSON.stringify(currencyRates));
    } catch (e) {
      utils.logError('failed to parse currencyRates response: ' + response);
    }
    currencyRatesLoaded = true;
    processBidResponseQueue();
  });
}

function resetCurrency() {
  if(oldBidResponse) {
    utils.logInfo('Uninstalling addBidResponse decorator for currency module', arguments);

    bidmanager.addBidResponse = oldBidResponse;
    oldBidResponse = undefined;
  }

  adServerCurrency = 'USD';
  conversionCache = {};
  currencySupportEnabled = false;
  currencyRatesLoaded = false;
  currencyRates = {};
}

export function addBidResponseDecorator(fn) {
  return function(adUnitCode, bid) {
    utils.logInfo('Invoking addBidResponseDecorator function', arguments);

    // default to USD if currency not set
    if(bid && !bid.currency) {
      utils.logWarn('Currency not specified on bid.  Defaulted to "USD"');
      bid.currency = 'USD';
    }

    if(bid) {
      // execute immediately if the bid is already in the desired currency
      if(bid.currency === adServerCurrency) {
        return fn.apply(this, arguments);
      }

      bidResponseQueue.push(wrapFunction(fn, this, arguments));
      if (!currencySupportEnabled || currencyRatesLoaded) {
        processBidResponseQueue();
      }
    }
  }
}

function processBidResponseQueue() {
  utils.logInfo('Invoking processBidResponseQueue', arguments);

  while (bidResponseQueue.length > 0) {
    (bidResponseQueue.shift())();
  }
}

function wrapFunction(fn, context, params) {
  return function() {
    utils.logInfo('Invoking wrapped function', arguments);
    var bid = params[1];
    if (bid !== undefined && 'currency' in bid && 'cpm' in bid) {
      var fromCurrency = bid.currency;
      try {
        var conversion = getCurrencyConversion(fromCurrency);
        bid.originalCpm = bid.cpm;
        bid.originalCurrency = bid.currency;
        if (conversion !== 1) {
          bid.cpm = (parseFloat(bid.cpm) * conversion).toFixed(4);
          bid.currency = adServerCurrency;
        }
      } catch (e) {
        utils.logWarn('Returning NO_BID, getCurrencyConversion threw error: ', e);
        params[1] = bidfactory.createBid(STATUS.NO_BID);
      }
    }
    return fn.apply(context, params);
  };
}

function getCurrencyConversion(fromCurrency) {
  utils.logInfo('Invoking getCurrencyConversion', arguments);

  var conversionRate = null;

  if (fromCurrency in conversionCache) {
    conversionRate = conversionCache[fromCurrency];
    utils.logMessage('Using conversionCache value ' + conversionRate + ' for fromCurrency ' + fromCurrency);
  } else if (currencySupportEnabled === false) {
    if (fromCurrency === 'USD') {
      conversionRate = 1;
    } else {
      throw new Error('Prebid currency support has not been enabled and fromCurrency is not USD');
    }
  } else if (fromCurrency === adServerCurrency) {
    conversionRate = 1;
  } else {
    var toCurrency = adServerCurrency;

    if (fromCurrency in currencyRates.conversions) {
      // using direct conversion rate from fromCurrency to toCurrency
      var rates = currencyRates.conversions[fromCurrency];
      if (!(toCurrency in rates)) {
        // bid should fail, currency is not supported
        throw new Error('Specified adServerCurrency in config \'' + toCurrency + '\' not found in the currency rates file');
      }
      conversionRate = rates[toCurrency];
      utils.logInfo('getCurrencyConversion using direct ' + fromCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
    } else if (toCurrency in currencyRates.conversions) {
      // using reciprocal of conversion rate from toCurrency to fromCurrency
      var rates = currencyRates.conversions[toCurrency];
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
  if (!(fromCurrency in conversionCache)) {
    utils.logMessage('Adding conversionCache value ' + conversionRate + ' for fromCurrency ' + fromCurrency);
    conversionCache[fromCurrency] = conversionRate;
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
