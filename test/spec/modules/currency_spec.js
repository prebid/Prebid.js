
import {
  getCurrencyRates
} from 'test/fixtures/fixtures.js';

import { getGlobal } from 'src/prebidGlobal.js';

import {
  setConfig,
  addBidResponseHook,
  currencySupportEnabled,
  currencyRates,
  responseReady
} from 'modules/currency.js';
import {createBid} from '../../../src/bidfactory.js';
import { EVENTS, STATUS, REJECTION_REASON } from '../../../src/constants.js';
import {server} from '../../mocks/xhr.js';
import * as events from 'src/events.js';

var assert = require('chai').assert;
var expect = require('chai').expect;

describe('currency', function () {
  let fakeCurrencyFileServer;
  let sandbox;
  let clock;

  let fn = sinon.spy();

  function makeBid(bidProps) {
    return Object.assign(createBid(STATUS.GOOD), bidProps);
  }

  beforeEach(function () {
    fakeCurrencyFileServer = server;
  });

  afterEach(function () {
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
      expect(getGlobal().convertCurrency).to.be.undefined;
    });
    it('adds conversion function onto pbjs global var once initiated', function () {
      setConfig({ 'adServerCurrency': 'JPY' });
      expect(getGlobal().convertCurrency).to.be.a('function');
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

  describe('global currency function', function () {
    it('still returns conversion if default rates present with fetch not returned yet', function () {
      setConfig({
        'adServerCurrency': 'USD',
        'defaultRates': {
          'USD': { EUR: 2, JPY: 100 }
        }
      });
      // first conversion should use default rates
      expect(getGlobal().convertCurrency(1.0, 'USD', 'EUR')).to.equal(2);
      expect(getGlobal().convertCurrency(1.0, 'USD', 'JPY')).to.equal(100);
      fakeCurrencyFileServer.respond();
    });
    it('uses fetch rates if returned', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify({
        'dataAsOf': '2017-04-25',
        'conversions': {
          'USD': { EUR: 4, JPY: 200 }
        }
      }));
      setConfig({
        'adServerCurrency': 'USD',
        'defaultRates': {
          'USD': { EUR: 2, JPY: 100 }
        }
      });
      // now respond and should use updates rates
      fakeCurrencyFileServer.respond();
      expect(getGlobal().convertCurrency(1.0, 'USD', 'EUR')).to.equal(4);
      expect(getGlobal().convertCurrency(1.0, 'USD', 'JPY')).to.equal(200);
    });
    it('uses default rates until currency file is loaded', function () {
      setConfig({
        adServerCurrency: 'USD',
        defaultRates: {
          USD: {
            JPY: 100
          }
        }
      });

      // Race condition where a bid is converted before the file has been loaded
      expect(getGlobal().convertCurrency(1.0, 'USD', 'JPY')).to.equal(100);

      fakeCurrencyFileServer.respondWith(JSON.stringify({
        'dataAsOf': '2017-04-25',
        'conversions': {
          'USD': { JPY: 200 }
        }
      }));
      fakeCurrencyFileServer.respond();
      expect(getGlobal().convertCurrency(1.0, 'USD', 'JPY')).to.equal(200);
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

    it('does not block auctions if rates do not need to be fetched', () => {
      sandbox.stub(responseReady, 'resolve');
      setConfig({
        adServerCurrency: 'USD',
        rates: {
          USD: {
            JPY: 100
          }
        }
      });
      sinon.assert.called(responseReady.resolve);
    })

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

    describe('when rates fail to load', () => {
      let bid, addBidResponse, reject;
      beforeEach(() => {
        bid = makeBid({cpm: 100, currency: 'JPY', bidder: 'rubicoin'});
        addBidResponse = sinon.spy();
        reject = sinon.spy();
      })
      it('uses default rates if specified', function () {
        setConfig({
          adServerCurrency: 'USD',
          defaultRates: {
            USD: {
              JPY: 100
            }
          }
        });

        // default response is 404
        addBidResponseHook(addBidResponse, 'au', bid);
        fakeCurrencyFileServer.respond();
        sinon.assert.calledWith(addBidResponse, 'au', sinon.match(innerBid => {
          expect(innerBid.cpm).to.equal('1.0000');
          expect(typeof innerBid.getCpmInNewCurrency).to.equal('function');
          expect(innerBid.getCpmInNewCurrency('JPY')).to.equal('100.000');
          return true;
        }));
      });

      it('rejects bids if no default rates are specified', () => {
        setConfig({
          adServerCurrency: 'USD',
        });
        addBidResponseHook(addBidResponse, 'au', bid, reject);
        fakeCurrencyFileServer.respond();
        sinon.assert.notCalled(addBidResponse);
        sinon.assert.calledWith(reject, REJECTION_REASON.CANNOT_CONVERT_CURRENCY);
      });

      it('attempts to load rates again on the next auction', () => {
        setConfig({
          adServerCurrency: 'USD',
        });
        fakeCurrencyFileServer.respond();
        fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
        events.emit(EVENTS.AUCTION_INIT, {});
        addBidResponseHook(addBidResponse, 'au', bid, reject);
        fakeCurrencyFileServer.respond();
        sinon.assert.calledWith(addBidResponse, 'au', bid, reject);
      })
    })
  });

  describe('currency.addBidResponseDecorator bidResponseQueue', function () {
    it('not run until currency rates file is loaded', function (done) {
      setConfig({});

      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));

      const bid = { 'cpm': 1, 'currency': 'USD' };

      setConfig({ 'adServerCurrency': 'JPY' });

      let responseAdded = false;
      let isReady = false;
      responseReady.promise.then(() => { isReady = true });

      addBidResponseHook(Object.assign(function() {
        responseAdded = true;
      }), 'elementId', bid);

      setTimeout(() => {
        expect(responseAdded).to.equal(false);
        expect(isReady).to.equal(false);
        fakeCurrencyFileServer.respond();

        setTimeout(() => {
          expect(responseAdded).to.equal(true);
          expect(isReady).to.equal(true);
          done();
        });
      });
    });
  });

  describe('currency.addBidResponseDecorator', function () {
    let reject;
    beforeEach(() => {
      reject = sinon.stub().returns({status: 'rejected'});
    });

    it('should leave bid at 1 when currency support is not enabled and fromCurrency is USD', function () {
      setConfig({});
      var bid = makeBid({ 'cpm': 1, 'currency': 'USD' });
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.cpm).to.equal(1);
    });

    it('should reject bid when currency support is not enabled and fromCurrency is not USD', function () {
      setConfig({});

      var bid = makeBid({ 'cpm': 1, 'currency': 'GBP' });
      let bidAdded = false;
      addBidResponseHook(function(adCodeId, bid) {
        bidAdded = true;
      }, 'elementId', bid, reject);
      expect(bidAdded).to.be.false;
      expect(reject.calledOnce).to.be.true;
    });

    it('should not buffer bid when currency is already in desired currency', function () {
      setConfig({
        'adServerCurrency': 'USD'
      });
      var bid = makeBid({ 'cpm': 1, 'currency': 'USD' });
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(bid).to.equal(innerBid);
    });

    it('should reject bid when fromCurrency is not supported in file', function () {
      // RESET to request currency file
      setConfig({ 'adServerCurrency': undefined });

      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      var bid = makeBid({ 'cpm': 1, 'currency': 'ABC' });
      let bidAdded = false;
      addBidResponseHook(function(adCodeId, bid) {
        bidAdded = true;
      }, 'elementId', bid, reject);
      expect(bidAdded).to.be.false;
      expect(reject.calledOnce).to.be.true;
    });

    it('should reject bid when adServerCurrency is not supported in file', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'ABC' });
      fakeCurrencyFileServer.respond();
      var bid = makeBid({ 'cpm': 1, 'currency': 'GBP' });
      let bidAdded = false;
      addBidResponseHook(function(adCodeId, bid) {
        bidAdded = true;
      }, 'elementId', bid, reject);
      expect(bidAdded).to.be.false;
      expect(reject.calledOnce).to.be.true;
    });

    it('should reject bid when rates have not loaded when the auction times out', () => {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({'adServerCurrency': 'JPY'});
      const bid = makeBid({cpm: 1, currency: 'USD', auctionId: 'aid'});
      const noConversionBid = makeBid({cpm: 1, currency: 'JPY', auctionId: 'aid'});
      const reject = sinon.spy();
      const addBidResponse = sinon.spy();
      addBidResponseHook(addBidResponse, 'au', bid, reject);
      addBidResponseHook(addBidResponse, 'au', noConversionBid, reject);
      events.emit(EVENTS.AUCTION_TIMEOUT, { auctionId: 'aid' });
      fakeCurrencyFileServer.respond();
      sinon.assert.calledOnce(addBidResponse);
      sinon.assert.calledWith(addBidResponse, 'au', noConversionBid, reject);
      sinon.assert.calledOnce(reject);
      sinon.assert.calledWith(reject, REJECTION_REASON.CANNOT_CONVERT_CURRENCY);
    })

    it('should return 1 when currency support is enabled and same currency code is requested as is set to adServerCurrency', function () {
      fakeCurrencyFileServer.respondWith(JSON.stringify(getCurrencyRates()));
      setConfig({ 'adServerCurrency': 'JPY' });
      fakeCurrencyFileServer.respond();
      var bid = makeBid({ 'cpm': 1, 'currency': 'JPY' });
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
      var bid = makeBid({ 'cpm': 1, 'currency': 'USD' });
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
      var bid = makeBid({ 'cpm': 1, 'currency': 'CNY' });
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
      var bid = makeBid({ 'cpm': 1, 'currency': 'JPY' });
      var innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bid);
      expect(innerBid.cpm).to.equal('0.0623');
      expect(innerBid.currency).to.equal('CNY');
    });
  });
});
