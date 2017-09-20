pbjsChunk([73],{

/***/ 100:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(101);


/***/ }),

/***/ 101:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.currencyRates = exports.currencySupportEnabled = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.setConfig = setConfig;
exports.addBidResponseDecorator = addBidResponseDecorator;

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _constants = __webpack_require__(4);

var _ajax = __webpack_require__(6);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _config = __webpack_require__(8);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var DEFAULT_CURRENCY_RATE_URL = 'http://currency.prebid.org/latest.json';
var CURRENCY_RATE_PRECISION = 4;

var bidResponseQueue = [];
var conversionCache = {};
var currencyRatesLoaded = false;
var adServerCurrency = 'USD';

// Used as reference to the original bidmanager.addBidResponse
var originalBidResponse;

var currencySupportEnabled = exports.currencySupportEnabled = false;
var currencyRates = exports.currencyRates = {};
var bidderCurrencyDefault = {};

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
 * @param  {string} [config.conversionRateFile = 'http://currency.prebid.org/latest.json']
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
 */
function setConfig(config) {
  var url = DEFAULT_CURRENCY_RATE_URL;

  if (_typeof(config.rates) === 'object') {
    currencyRates.conversions = config.rates;
    currencyRatesLoaded = true;
  }

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
  if (_typeof(config.bidderCurrencyDefault) === 'object') {
    bidderCurrencyDefault = config.bidderCurrencyDefault;
  }
}
_config.config.getConfig('currency', (function (config) {
  return setConfig(config.currency);
}));

function initCurrency(url) {
  conversionCache = {};
  exports.currencySupportEnabled = currencySupportEnabled = true;

  if (!originalBidResponse) {
    utils.logInfo('Installing addBidResponse decorator for currency module', arguments);

    originalBidResponse = _bidmanager2['default'].addBidResponse;
    _bidmanager2['default'].addBidResponse = addBidResponseDecorator(_bidmanager2['default'].addBidResponse);
  }

  if (!currencyRates.conversions) {
    (0, _ajax.ajax)(url, (function (response) {
      try {
        exports.currencyRates = currencyRates = JSON.parse(response);
        utils.logInfo('currencyRates set to ' + JSON.stringify(currencyRates));
        currencyRatesLoaded = true;
        processBidResponseQueue();
      } catch (e) {
        utils.logError('failed to parse currencyRates response: ' + response);
      }
    }));
  }
}

function resetCurrency() {
  if (originalBidResponse) {
    utils.logInfo('Uninstalling addBidResponse decorator for currency module', arguments);

    _bidmanager2['default'].addBidResponse = originalBidResponse;
    originalBidResponse = undefined;
  }

  adServerCurrency = 'USD';
  conversionCache = {};
  exports.currencySupportEnabled = currencySupportEnabled = false;
  currencyRatesLoaded = false;
  exports.currencyRates = currencyRates = {};
  bidderCurrencyDefault = {};
}

function addBidResponseDecorator(fn) {
  return function (adUnitCode, bid) {
    if (!bid) {
      return fn.apply(this, arguments); // if no bid, call original and let it display warnings
    }

    var bidder = bid.bidderCode || bid.bidder;
    if (bidderCurrencyDefault[bidder]) {
      var currencyDefault = bidderCurrencyDefault[bidder];
      if (bid.currency && currencyDefault !== bid.currency) {
        utils.logWarn('Currency default \'' + bidder + ': ' + currencyDefault + '\' ignored. adapter specified \'' + bid.currency + '\'');
      } else {
        bid.currency = currencyDefault;
      }
    }

    // default to USD if currency not set
    if (!bid.currency) {
      utils.logWarn('Currency not specified on bid.  Defaulted to "USD"');
      bid.currency = 'USD';
    }

    // execute immediately if the bid is already in the desired currency
    if (bid.currency === adServerCurrency) {
      return fn.apply(this, arguments);
    }

    bidResponseQueue.push(wrapFunction(fn, this, arguments));
    if (!currencySupportEnabled || currencyRatesLoaded) {
      processBidResponseQueue();
    }
  };
}

function processBidResponseQueue() {
  while (bidResponseQueue.length > 0) {
    bidResponseQueue.shift()();
  }
}

function wrapFunction(fn, context, params) {
  return function () {
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
        params[1] = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, {
          bidder: bid.bidderCode || bid.bidder,
          bidId: bid.adId
        });
      }
    }
    return fn.apply(context, params);
  };
}

function getCurrencyConversion(fromCurrency) {
  var conversionRate = null;
  var rates;

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
  if (!(fromCurrency in conversionCache)) {
    utils.logMessage('Adding conversionCache value ' + conversionRate + ' for fromCurrency ' + fromCurrency);
    conversionCache[fromCurrency] = conversionRate;
  }
  return conversionRate;
}

function roundFloat(num, dec) {
  var d = 1;
  for (var i = 0; i < dec; i++) {
    d += '0';
  }
  return Math.round(num * d) / d;
}

/***/ })

},[100]);