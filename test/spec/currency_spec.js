import {
  getCurrencyRates
} from 'test/fixtures/fixtures';

var assert = require('chai').assert;
var expect = require('chai').expect;

var prebid = require('src/prebid');
var currency = require('src/currency');

describe('currency', function () {

  describe('$$PREBID_GLOBAL$$.setConfig', () => {

    it('results in currencySupportEnabled = false when currency not configured', () => {
      $$PREBID_GLOBAL$$.setConfig({});
      expect($$PREBID_GLOBAL$$.currency.currencySupportEnabled).to.equal(false);
    });

    it('results in currencySupportEnabled = true and currencyRates being loaded when configured', () => {
      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'JPY' } });
      fakeCurrencyFileServer.respond();
      expect($$PREBID_GLOBAL$$.currency.currencyRates.dataAsOf).to.equal('2017-04-25');
      expect($$PREBID_GLOBAL$$.currency.currencySupportEnabled).to.equal(true);
    });
  });

  describe('currency.addBidResponseDecorator bidResponseQueue', () => {

    it('not run until currency rates file is loaded', () => {
      $$PREBID_GLOBAL$$.setConfig({});

      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));

      var marker = false;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
        marker = true;
      });
      var bid = { 'cpm': 1, 'currency': 'USD' };

      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'JPY' } });
      wrappedAddBidResponseFn('elementId', bid);
      expect(marker).to.equal(false);

      fakeCurrencyFileServer.respond();
      expect(marker).to.equal(true);
    });
  });

  describe('currency.addBidResponseDecorator', () => {

    it('should leave bid at 1 when currency support is not enabled and fromCurrency is USD', () => {
      $$PREBID_GLOBAL$$.setConfig({});
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.cpm).to.equal(1);
    });

    it('should result in NO_BID when currency support is not enabled and fromCurrency is not USD', () => {
      $$PREBID_GLOBAL$$.setConfig({});
      var bid = { 'cpm': 1, 'currency': 'GBP' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should result in NO_BID when fromCurrency is not supported in file', () => {
      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'JPY' } });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'ABC' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should result in NO_BID when adServerCurrency is not supported in file', () => {
      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'ABC' } });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'GBP' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.statusMessage).to.equal('Bid returned empty or error response');
    });

    it('should return 1 when currency support is enabled and same currency code is requested as is set to adServerCurrency', () => {
      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'JPY' } });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'JPY' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.cpm).to.equal(1);
      expect(innerBid.currency).to.equal('JPY');
    });

    it('should return direct conversion rate when fromCurrency is one of the configured bases', () => {
      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'GBP' } });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'USD' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.cpm).to.equal('0.7798');
      expect(innerBid.currency).to.equal('GBP');
    });

    it('should return reciprocal conversion rate when adServerCurrency is one of the configured bases, but fromCurrency is not', () => {
      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'GBP' } });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'CNY' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.cpm).to.equal('0.1133');
      expect(innerBid.currency).to.equal('GBP');
    });

    it('should return intermediate conversion rate when neither fromCurrency nor adServerCurrency is one of the configured bases', () => {
      var fakeCurrencyFileServer = sinon.fakeServer.create();
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      $$PREBID_GLOBAL$$.setConfig({ 'currency' : { 'adServerCurrency': 'CNY' } });
      fakeCurrencyFileServer.respond();
      var bid = { 'cpm': 1, 'currency': 'JPY' };
      var innerBid;
      var wrappedAddBidResponseFn = $$PREBID_GLOBAL$$.currency.addBidResponseDecorator(function(adCodeId, bid) {
      	innerBid = bid;
      });
      wrappedAddBidResponseFn('elementId', bid);
      expect(innerBid.cpm).to.equal('0.0623');
      expect(innerBid.currency).to.equal('CNY');
    });

  });

});
