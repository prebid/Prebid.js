import bidfactory from 'src/bidfactory';

var CONSTANTS = require('./constants');
var utils = require('./utils.js');
var ajax = require('./ajax.js').ajax;

var currency = exports;

var bidResponseQueue = [];
var conversionCache = {};

currency.currencySupportEnabled = false;
currency.currencyRatesLoaded = false;
currency.currencyRates = {};

currency.initCurrencyRates = function(url) {
  utils.logInfo('Invoking currency.initCurrencyRates', arguments);

  conversionCache = {};
  currency.currencySupportEnabled = true;

  ajax(url, function(response) {
    currency.currencyRates = JSON.parse(response);
    currency.currencyRatesLoaded = true;
    utils.logInfo('currencyRates set to ' + JSON.stringify(currency.currencyRates));

    currency.processBidResponseQueue();
  });
}

currency.resetCurrencyRates = function() {
  conversionCache = {};
  currency.currencySupportEnabled = false;
  currency.currencyRatesLoaded = false;
  currency.currencyRates = {};
}

currency.addBidResponseDecorator = function(fn) {
  return function() {
    utils.logInfo('Invoking addBidResponseDecorator function', arguments);

    bidResponseQueue.push(wrapFunction(fn, this, arguments));
    if (!currency.currencySupportEnabled || (currency.currencySupportEnabled && currency.currencyRatesLoaded)) {
      currency.processBidResponseQueue();
    }
  }
}

currency.processBidResponseQueue = function() {
  utils.logInfo('Invoking processBidResponseQueue', arguments);

  while (bidResponseQueue.length >0) {
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
          bid.currency = $$PREBID_GLOBAL$$.pageConfig.currency.adServerCurrency;
        }
      } catch (e) {
        utils.logWarn('Returning NO_BID, getCurrencyConversion threw error: ', e);
        params[1] = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
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

  } else if (currency.currencySupportEnabled === false) {
  	if (fromCurrency === 'USD') {
      conversionRate = 1;
  	} else {
      throw new Error('Prebid currency support has not been enabled with initCurrencyRates and fromCurrency is not USD');
    }

  } else  if (fromCurrency === $$PREBID_GLOBAL$$.pageConfig.currency.adServerCurrency) {
    conversionRate = 1;

  } else {

    var toCurrency = $$PREBID_GLOBAL$$.pageConfig.currency.adServerCurrency;

    if (fromCurrency in currency.currencyRates.conversions) {

      // using direct conversion rate from fromCurrency to toCurrency
      var rates = currency.currencyRates.conversions[fromCurrency];
      if (!(toCurrency in rates)) {
      	// bid should fail, currency is not supported
      	throw new Error('Specified adServerCurrency in config \'' + toCurrency + '\' not found in the currency rates file');
      }
      conversionRate = rates[toCurrency];
      utils.logInfo('currency.getCurrencyConversion using direct ' + fromCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);

    } else if (toCurrency in currency.currencyRates.conversions) {

      // using reciprocal of conversion rate from toCurrency to fromCurrency
      var rates = currency.currencyRates.conversions[toCurrency];
      if (!(fromCurrency in rates)) {
      	// bid should fail, currency is not supported
      	throw new Error('Specified fromCurrency \'' + fromCurrency + '\' not found in the currency rates file');
      }
      conversionRate = utils.roundFloat(1 / rates[fromCurrency], CONSTANTS.CURRENCY_RATE_PRECISION);
      utils.logInfo('currency.getCurrencyConversion using reciprocal ' + fromCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);

    } else {

      // first defined currency base used as intermediary
      var anyBaseCurrency = Object.keys(currency.currencyRates.conversions)[0];

      if (!(fromCurrency in currency.currencyRates.conversions[anyBaseCurrency])) {
      	// bid should fail, currency is not supported
      	throw new Error('Specified fromCurrency \'' + fromCurrency + '\' not found in the currency rates file');
      }
      var toIntermediateConversionRate = 1 / currency.currencyRates.conversions[anyBaseCurrency][fromCurrency];

      if (!(toCurrency in currency.currencyRates.conversions[anyBaseCurrency])) {
      	// bid should fail, currency is not supported
      	throw new Error('Specified adServerCurrency in config \'' + toCurrency + '\' not found in the currency rates file');
      }
      var fromIntermediateConversionRate = currency.currencyRates.conversions[anyBaseCurrency][toCurrency];

      conversionRate = utils.roundFloat(toIntermediateConversionRate * fromIntermediateConversionRate, CONSTANTS.CURRENCY_RATE_PRECISION);
      utils.logInfo('currency.getCurrencyConversion using intermediate ' + fromCurrency + ' thru ' + anyBaseCurrency + ' to ' + toCurrency + ' conversionRate ' + conversionRate);
    }
  }
  if (!(fromCurrency in conversionCache)) {
    utils.logMessage('Adding conversionCache value ' + conversionRate + ' for fromCurrency ' + fromCurrency);
    conversionCache[fromCurrency] = conversionRate;
  }
  return conversionRate;
}
