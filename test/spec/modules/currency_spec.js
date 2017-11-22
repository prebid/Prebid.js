
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
  beforeEach(() => {
    fakeCurrencyFileServer = sinon.fakeServer.create();
  });

  afterEach(() => {
    fakeCurrencyFileServer.restore();
  });

  describe('setConfig', () => {
    it('results in currencySupportEnabled = false when currency not configured', () => {
      setConfig({});
      expect(currencySupportEnabled).to.equal(false);
    });

    it('results in currencySupportEnabled = true and currencyRates being loaded when configured', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      expect(currencyRates.dataAsOf).to.equal('2017-04-25');
      expect(currencySupportEnabled).to.equal(true);
    });
  });

  describe('bidder override', () => {
    it('allows setConfig to set bidder currency', () => {
      setConfig({});

      var bid = { cpm: 1, bidder: 'rubicon' };
      var innerBid;

      setConfig({
        adServerCurrency: 'GBP',
        bidderCurrencyDefault: {
          rubicon: 'GBP'
        }
      });

      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });

      expect(innerBid.currency).to.equal('GBP')
    });

    it('uses adapter currency over currency override if specified', () => {
      setConfig({});

      var bid = { cpm: 1, currency: 'JPY', bidder: 'rubicon' };
      var innerBid;

      setConfig({
        adServerCurrency: 'JPY',
        bidderCurrencyDefault: {
          rubicon: 'GBP'
        }
      });

      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });

      expect(innerBid.currency).to.equal('JPY')
    });

    it('uses rates specified in json when provided', () => {
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

      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });

      expect(innerBid.cpm).to.equal('1.0000');
    });
  });

  describe('currency.addBidResponseDecorator bidResponseQueue', () => {
    it('not run until currency rates file is loaded', () => {
      setConfig({});

      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));

      var bid = { 'cpm': 1, 'currency': 'USD' };

      setConfig({ 'adServerCurrency': 'JPY' });

      var marker = false;
      addBidResponseHook('elementId', bid, function() {
      	marker = true;
      });

      expect(marker).to.equal(false);

      fakeCurrencyFileServer.respond();
      expect(marker).to.equal(true);
    });
  });

  describe('currency.addBidResponseDecorator', () => {
    it('should leave bid at 1 when currency support is not enabled and fromCurrency is USD', () => {
      setConfig({});
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.cpm).to.equal(1);
    });

    it('should result in NO_BID when currency support is not enabled and fromCurrency is not USD', () => {
      setConfig({});
      var bid = { 'cpm': 1, 'currency': 'GBP' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should not buffer bid when currency is already in desired currency', () => {
      setConfig({
        'adServerCurrency': 'USD'
      });
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(bid).to.equal(innerBid);
    });

    it('should result in NO_BID when fromCurrency is not supported in file', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'ABC' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should result in NO_BID when adServerCurrency is not supported in file', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'ABC' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'GBP' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should return 1 when currency support is enabled and same currency code is requested as is set to adServerCurrency', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'JPY' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.cpm).to.equal(1);
      expect(innerBid.currency).to.equal('JPY');
    });

    it('should return direct conversion rate when fromCurrency is one of the configured bases', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'GBP' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.cpm).to.equal('0.7798');
      expect(innerBid.currency).to.equal('GBP');
    });

    it('should return reciprocal conversion rate when adServerCurrency is one of the configured bases, but fromCurrency is not', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'GBP' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'CNY' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.cpm).to.equal('0.1133');
      expect(innerBid.currency).to.equal('GBP');
    });

    it('should return intermediate conversion rate when neither fromCurrency nor adServerCurrency is one of the configured bases', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'CNY' });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'JPY' };
      var innerBid;
      addBidResponseHook('elementId', bid, function(adCodeId, bid) {
      	innerBid = bid;
      });
      expect(innerBid.cpm).to.equal('0.0623');
      expect(innerBid.currency).to.equal('CNY');
    });
  });
});
