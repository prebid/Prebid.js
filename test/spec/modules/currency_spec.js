
import {
  getCurrencyRates
} from 'test/fixtures/fixtures';

import {
  setConfig,
  addBidResponseHook,
  currencySupportEnabled,
  currencyRates
} from 'modules/currency';

var assert = require('chai').assert;
var expect = require('chai').expect;

describe('currency', function () {
  let fakeCurrencyFileServer;
  let sandbox;
  let clock;

  let fn = sinon.spy();

  beforeEach(function () {
    fakeCurrencyFileServer = sinon.fakeServer.create();
  });

  afterEach(function () {
    fakeCurrencyFileServer.restore();
    setConfig({});
  });

  describe('setConfig', function () {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      clock = sinon.useFakeTimers(1046952000000); // 2003-03-06T12:00:00Z
    });

    afterEach(function () {
      sandbox.restore();
      clock.restore();
    });

    it('results in currencySupportEnabled = false when currency not configured', function () {
      setConfig({});
      expect(currencySupportEnabled).to.equal(false);
    });

    it('results in currencySupportEnabled = true and currencyRates being loaded when configured', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      expect(currencyRates.dataAsOf).to.equal('2017-04-25');
      expect(currencySupportEnabled).to.equal(true);
    });

    it('currency file is called even when default rates are specified', function() {
      // RESET to request currency file (specifically url value for this test)
      setConfig({ 'adServerCurrency': undefined });

      // DO NOT SET DEFAULT RATES, currency file should be requested
      setConfig({
        'adServerCurrency': 'JPY'
      });
      fakeCurrencyFileServer.respond();
      expect(fakeCurrencyFileServer.requests.length).to.equal(1);
      expect(fakeCurrencyFileServer.requests[0].url).to.equal('https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json?date=20030306');

      // RESET to request currency file (specifically url value for this test)
      setConfig({ 'adServerCurrency': undefined });

      // SET DEFAULT RATES, currency file should STILL be requested
      setConfig({
        'adServerCurrency': 'JPY',
        'defaultRates': {
          'GBP': { 'CNY': 66, 'JPY': 132, 'USD': 264 },
          'USD': { 'CNY': 60, 'GBP': 120, 'JPY': 240 }
        } });
      fakeCurrencyFileServer.respond();
      expect(fakeCurrencyFileServer.requests.length).to.equal(2);
      expect(fakeCurrencyFileServer.requests[1].url).to.equal('https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json?date=20030306');
    });

    it('date macro token $$TODAY$$ is replaced by current date (formatted as yyyymmdd)', function () {
      // RESET to request currency file (specifically url value for this test)
      setConfig({ 'adServerCurrency': undefined });

      // date macro should replace $$TODAY$$ with date when DEFAULT_CURRENCY_RATE_URL is used
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      expect(fakeCurrencyFileServer.requests[0].url).to.equal('https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json?date=20030306');

      // RESET to request currency file (specifically url value for this test)
      setConfig({ 'adServerCurrency': undefined });

      // date macro should not modify 'conversionRateFile' if TOKEN is not found
      setConfig({
        'adServerCurrency': 'JPY',
        'conversionRateFile': 'http://test.net/currency.json?date=foobar'
      });
      fakeCurrencyFileServer.respond();
      expect(fakeCurrencyFileServer.requests[1].url).to.equal('http://test.net/currency.json?date=foobar');

      // RESET to request currency file (specifically url value for this test)
      setConfig({ 'adServerCurrency': undefined });

      // date macro should replace $$TODAY$$ with date for 'conversionRateFile' is configured
      setConfig({
        'adServerCurrency': 'JPY',
        'conversionRateFile': 'http://test.net/currency.json?date=$$TODAY$$'
      });
      fakeCurrencyFileServer.respond();
      expect(fakeCurrencyFileServer.requests[2].url).to.equal('http://test.net/currency.json?date=20030306');

      // RESET to request currency file (specifically url value for this test)
      setConfig({ 'adServerCurrency': undefined });

      // MULTIPLE TOKENS used in a url is not supported. Only the TOKEN at left-most position is REPLACED
      setConfig({
        'adServerCurrency': 'JPY',
        'conversionRateFile': 'http://test.net/$$TODAY$$/currency.json?date=$$TODAY$$'
      });
      fakeCurrencyFileServer.respond();
      expect(fakeCurrencyFileServer.requests[3].url).to.equal('http://test.net/20030306/currency.json?date=$$TODAY$$');
    });
  });

  describe('bidder override', function () {
    it('allows setConfig to set bidder currency', function () {
      setConfig({});

      var bid = { cpm: 1, bidder: 'rubicon' };
      var innerBid;

      setConfig({
        adServerCurrency: 'GBP',
        bidderCurrencyDefault: {
          rubicon: 'GBP'
        }
      });

      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);

      expect(innerBid.currency).to.equal('GBP');
      expect(typeof innerBid.getCpmInNewCurrency).to.equal('function');
      expect(innerBid.getCpmInNewCurrency('GBP')).to.equal('1.000');
    });

    it('uses adapter currency over currency override if specified', function () {
      setConfig({});

      var bid = { cpm: 1, currency: 'JPY', bidder: 'rubicon' };
      var innerBid;

      setConfig({
        adServerCurrency: 'JPY',
        bidderCurrencyDefault: {
          rubicon: 'GBP'
        }
      });

      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);

      expect(innerBid.currency).to.equal('JPY');
      expect(typeof innerBid.getCpmInNewCurrency).to.equal('function');
      expect(innerBid.getCpmInNewCurrency('JPY')).to.equal('1.000');
    });

    it('uses rates specified in json when provided', function () {
      setConfig({
        adServerCurrency: 'USD',
        rates: {
          USD: {
            JPY: 100
          }
        }
      });

      var bid = { cpm: 100, currency: 'JPY', bidder: 'rubicon' };
      var innerBid;

      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);

      expect(innerBid.cpm).to.equal('1.0000');
      expect(typeof innerBid.getCpmInNewCurrency).to.equal('function');
      expect(innerBid.getCpmInNewCurrency('JPY')).to.equal('100.000');
    });

    it('uses rates specified in json when provided and consider boosted bid', function () {
      setConfig({
        adServerCurrency: 'USD',
        rates: {
          USD: {
            JPY: 100
          }
        }
      });

      var bid = { cpm: 100, currency: 'JPY', bidder: 'rubicon' };
      var innerBid;

      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);

      expect(innerBid.cpm).to.equal('1.0000');
      expect(typeof innerBid.getCpmInNewCurrency).to.equal('function');
      expect(innerBid.getCpmInNewCurrency('JPY')).to.equal('100.000');

      // Boosting the bid now
      innerBid.cpm *= 10;
      expect(innerBid.cpm).to.equal(10.0000);
      expect(typeof innerBid.getCpmInNewCurrency).to.equal('function');
      expect(innerBid.getCpmInNewCurrency('JPY')).to.equal('1000.000');
    });

    it('uses default rates when currency file fails to load', function () {
      setConfig({});

      setConfig({
        adServerCurrency: 'USD',
        defaultRates: {
          USD: {
            JPY: 100
          }
        }
      });

      // default response is 404
      fakeCurrencyFileServer.respond();

      var bid = { cpm: 100, currency: 'JPY', bidder: 'rubicon' };
      var innerBid;

      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);

      expect(innerBid.cpm).to.equal('1.0000');
      expect(typeof innerBid.getCpmInNewCurrency).to.equal('function');
      expect(innerBid.getCpmInNewCurrency('JPY')).to.equal('100.000');
    });
  });

  describe('currency.addBidResponseDecorator bidResponseQueue', function () {
    it('not run until currency rates file is loaded', function () {
      setConfig({});

      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));

      var bid = { 'cpm': 1, 'currency': 'USD' };

      setConfig({ 'adServerCurrency': 'JPY' });

      var marker = false;
      addBidResponseHook(function() {
        marker = true;
      }, 'elementId', bid);

      expect(marker).to.equal(false);

      fakeCurrencyFileServer.respond();
      expect(marker).to.equal(true);
    });
  });

  describe('currency.addBidResponseDecorator', function () {
    it('should leave bid at 1 when currency support is not enabled and fromCurrency is USD', function () {
      setConfig({});
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.cpm).to.equal(1);
    });

    it('should result in NO_BID when currency support is not enabled and fromCurrency is not USD', function () {
      setConfig({});

      var bid = { 'cpm': 1, 'currency': 'GBP' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should not buffer bid when currency is already in desired currency', function () {
      setConfig({
        'adServerCurrency': 'USD'
      });
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(bid).to.equal(innerBid);
    });

    it('should result in NO_BID when fromCurrency is not supported in file', function () {
      // RESET to request currency file
      setConfig({ 'adServerCurrency': undefined });

      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'ABC' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should result in NO_BID when adServerCurrency is not supported in file', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'ABC' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'GBP' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should return 1 when currency support is enabled and same currency code is requested as is set to adServerCurrency', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'JPY' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.cpm).to.equal(1);
      expect(innerBid.currency).to.equal('JPY');
    });

    it('should return direct conversion rate when fromCurrency is one of the configured bases', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'GBP' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.cpm).to.equal('0.7798');
      expect(innerBid.currency).to.equal('GBP');
    });

    it('should return reciprocal conversion rate when adServerCurrency is one of the configured bases, but fromCurrency is not', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'GBP' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'CNY' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.cpm).to.equal('0.1133');
      expect(innerBid.currency).to.equal('GBP');
    });

    it('should return intermediate conversion rate when neither fromCurrency nor adServerCurrency is one of the configured bases', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'CNY' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'JPY' };
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.cpm).to.equal('0.0623');
      expect(innerBid.currency).to.equal('CNY');
    });
  });
});
