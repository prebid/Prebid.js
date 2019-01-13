import CONSTANTS from 'src/constants.json';
import liveyield from 'modules/liveyieldAnalyticsAdapter';
import { expect } from 'chai';
const events = require('src/events');

const {
  EVENTS: { BID_REQUESTED, BID_TIMEOUT, BID_RESPONSE, BID_WON }
} = CONSTANTS;

describe('liveyield analytics adapter', function() {
  const rtaCalls = [];

  window.rta = function() {
    rtaCalls.push({ callArgs: arguments });
  };

  beforeEach(function() {
    sinon.stub(events, 'getEvents').returns([]);
  });
  afterEach(function() {
    events.getEvents.restore();
  });
  describe('initialization', function() {
    afterEach(function() {
      rtaCalls.length = 0;
    });
    it('it should require provider', function() {
      liveyield.enableAnalytics({});
      expect(rtaCalls).to.be.empty;
    });
    it('should require config.options', function() {
      liveyield.enableAnalytics({ provider: 'liveyield' });
      expect(rtaCalls).to.be.empty;
    });
    it('should require options.customerId', function() {
      liveyield.enableAnalytics({ provider: 'liveyield', options: {} });
      expect(rtaCalls).to.be.empty;
    });
    it('should require options.customerName', function() {
      liveyield.enableAnalytics({
        provider: 'liveyield',
        options: {
          customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa'
        }
      })
      expect(rtaCalls).to.be.empty;
    });
    it('should require options.customerSite', function() {
      liveyield.enableAnalytics({
        provider: 'liveyield',
        options: {
          customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa',
          customerName: 'pubocean'
        }
      });
      expect(rtaCalls).to.be.empty;
    });
    it('should require options.sessionTimezoneOffset', function() {
      liveyield.enableAnalytics({
        provider: 'liveyield',
        options: {
          customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa',
          customerName: 'pubocean',
          customerSite: 'scribol.com'
        }
      });
      expect(rtaCalls).to.be.empty;
    });
    it("should throw error, when 'rta' function is not defined ", function() {
      const keepMe = window.rta;

      delete window.rta;

      liveyield.enableAnalytics({
        provider: 'liveyield',
        options: {
          customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa',
          customerName: 'pubocean',
          customerSite: 'scribol.com',
          sessionTimezoneOffset: 12
        }
      });
      expect(rtaCalls).to.be.empty;

      window.rta = keepMe;
    });
    it('should initialize when all required parameters are passed', function() {
      liveyield.enableAnalytics({
        provider: 'liveyield',
        options: {
          customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa',
          customerName: 'pubocean',
          customerSite: 'scribol.com',
          sessionTimezoneOffset: 12
        }
      });
      expect(rtaCalls[0].callArgs['0']).to.match(/create/);
      expect(rtaCalls[0].callArgs['1']).to.match(
        /d6a6f8da-190f-47d6-ae11-f1a4469083fa/
      );
      expect(rtaCalls[0].callArgs['2']).to.match(/pubocean/);
      expect(rtaCalls[0].callArgs['4']).to.match(/12/);
      liveyield.disableAnalytics();
    });
    it('should allow to redefine rta function name', function() {
      const keepMe = window.rta;
      window.abc = keepMe;
      delete window.rta;
      liveyield.enableAnalytics({
        provider: 'liveyield',
        options: {
          rtaFunctionName: 'abc',
          customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa',
          customerName: 'test',
          customerSite: 'scribol.com',
          sessionTimezoneOffset: 25
        }
      });

      liveyield.disableAnalytics();
      expect(rtaCalls[0].callArgs['0']).to.match(/create/);
      expect(rtaCalls[0].callArgs['1']).to.match(
        /d6a6f8da-190f-47d6-ae11-f1a4469083fa/
      );
      expect(rtaCalls[0].callArgs['2']).to.match(/test/);
      expect(rtaCalls[0].callArgs['4']).to.match(/25/);

      window.rta = keepMe;
      liveyield.disableAnalytics();
    });
    it('should handle custom parameters', function() {
      liveyield.enableAnalytics({
        provider: 'liveyield',
        options: {
          customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa',
          customerName: 'test2',
          customerSite: 'scribol.com',
          sessionTimezoneOffset: 38,
          contentTitle: 'testTitle',
          contentAuthor: 'testAuthor',
          contentCategory: 'testCategory'
        }
      });

      liveyield.disableAnalytics();
      expect(rtaCalls[0].callArgs['0']).to.match(/create/);
      expect(rtaCalls[0].callArgs['2']).to.match(/test2/);
      expect(rtaCalls[0].callArgs['4']).to.match(/38/);
      expect(rtaCalls[0].callArgs['5'].contentTitle).to.match(/testTitle/);
      expect(rtaCalls[0].callArgs['5'].contentAuthor).to.match(/testAuthor/);
      expect(rtaCalls[0].callArgs['5'].contentCategory).to.match(
        /testCategory/
      );
      liveyield.disableAnalytics();
    });
  });

  describe('handling events', function() {
    const options = {
      provider: 'liveyield',
      options: {
        customerId: 'd6a6f8da-190f-47d6-ae11-f1a4469083fa',
        customerName: 'pubocean',
        customerSite: 'scribol.com',
        sessionTimezoneOffset: 12
      }
    };
    beforeEach(function() {
      rtaCalls.length = 0;
      liveyield.enableAnalytics(options);
    });
    afterEach(function() {
      liveyield.disableAnalytics();
    });
    it('should handle BID_REQUESTED event', function() {
      const bidRequest = {
        bidderCode: 'appnexus',
        bids: [
          {
            params: {
              placementId: '10433394'
            },
            adUnitCode: 'div-gpt-ad-1438287399331-0',
            transactionId: '2f481ff1-8d20-4c28-8e36-e384e9e3eec6',
            sizes: '300x250,300x600',
            bidId: '2eddfdc0c791dc',
            auctionId: 'a5b849e5-87d7-4205-8300-d063084fcfb7'
          }
        ]
      };

      events.emit(BID_REQUESTED, bidRequest);
      expect(rtaCalls[1].callArgs['0']).to.equal('bidRequested');
      expect(rtaCalls[1].callArgs['1']).to.equal('div-gpt-ad-1438287399331-0');
      expect(rtaCalls[1].callArgs['2']).to.equal('appnexus');
    });
    it('should handle BID_REQUESTED event with invalid args', function() {
      const bidRequest = {
        bids: [
          {
            params: {
              placementId: '10433394'
            },
            transactionId: '2f481ff1-8d20-4c28-8e36-e384e9e3eec6',
            sizes: '300x250,300x600',
            bidId: '2eddfdc0c791dc',
            auctionId: 'a5b849e5-87d7-4205-8300-d063084fcf'
          },
          {
            params: {
              placementId: '31034023'
            },
            transactionId: '2f481ff1-8d20-4c28-8e36-e384e9e3eec6',
            sizes: '300x250,300x600',
            bidId: '3dkg0404fmd0',
            auctionId: 'a5b849e5-87d7-4205-8300-d063084fcf'
          }
        ]
      };
      events.emit(BID_REQUESTED, bidRequest);
      expect(rtaCalls[1].callArgs['0']).to.equal('bidRequested');
      expect(rtaCalls[1].callArgs['1']).to.equal(undefined);
      expect(rtaCalls[1].callArgs['2']).to.equal(undefined);
      expect(rtaCalls[1].callArgs['0']).to.equal('bidRequested');
    });
    it('should handle BID_RESPONSE event', function() {
      const bidResponse = {
        height: 250,
        statusMessage: 'Bid available',
        adId: '2eddfdc0c791dc',
        mediaType: 'banner',
        source: 'client',
        requestId: '2eddfdc0c791dc',
        cpm: 0.5,
        creativeId: 29681110,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        auctionId: 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        responseTimestamp: 1522265866110,
        requestTimestamp: 1522265863600,
        bidder: 'appnexus',
        adUnitCode: 'div-gpt-ad-1438287399331-0',
        timeToRespond: 2510,
        size: '300x250'
      };

      events.emit(BID_RESPONSE, bidResponse);
      expect(rtaCalls[1].callArgs['0']).to.equal('addBid');
      expect(rtaCalls[1].callArgs['1']).to.equal('div-gpt-ad-1438287399331-0');
      expect(rtaCalls[1].callArgs['2']).to.equal('appnexus');
      expect(rtaCalls[1].callArgs['3']).to.equal(500);
      expect(rtaCalls[1].callArgs['4']).to.equal(false);
      expect(rtaCalls[1].callArgs['5']).to.equal(false);
    });
    it('should handle BID_RESPONSE event with undefined bidder and cpm', function() {
      const bidResponse = {
        height: 250,
        statusMessage: 'Bid available',
        adId: '2eddfdc0c791dc',
        mediaType: 'banner',
        source: 'client',
        requestId: '2eddfdc0c791dc',
        creativeId: 29681110,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        auctionId: 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        responseTimestamp: 1522265866110,
        requestTimestamp: 1522265863600,
        adUnitCode: 'div-gpt-ad-1438287399331-0',
        timeToRespond: 2510,
        size: '300x250'
      };
      events.emit(BID_RESPONSE, bidResponse);
      expect(rtaCalls[1].callArgs['0']).to.equal('addBid');
      expect(rtaCalls[1].callArgs['2']).to.equal('unknown');
      expect(rtaCalls[1].callArgs['3']).to.equal(0);
      expect(rtaCalls[1].callArgs['4']).to.equal(true);
    });
    it('should handle BID_RESPONSE event with undefined status message and adUnitCode', function() {
      const bidResponse = {
        height: 250,
        adId: '2eddfdc0c791dc',
        mediaType: 'banner',
        source: 'client',
        requestId: '2eddfdc0c791dc',
        cpm: 0.5,
        creativeId: 29681110,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        auctionId: 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        responseTimestamp: 1522265866110,
        requestTimestamp: 1522265863600,
        bidder: 'appnexus',
        timeToRespond: 2510,
        size: '300x250'
      };
      events.emit(BID_RESPONSE, bidResponse);
      expect(rtaCalls[1].callArgs['0']).to.equal('addBid');
      expect(rtaCalls[1].callArgs['1']).to.equal(undefined);
      expect(rtaCalls[1].callArgs['3']).to.equal(0);
      expect(rtaCalls[1].callArgs['5']).to.equal(true);
    });
    it('should handle BID_TIMEOUT', function() {
      const bidTimeout = [
        {
          bidId: '2baa51527bd015',
          bidder: 'bidderOne',
          adUnitCode: '/19968336/header-bid-tag-0',
          auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f'
        },
        {
          bidId: '6fe3b4c2c23092',
          bidder: 'bidderTwo',
          adUnitCode: '/19968336/header-bid-tag-0',
          auctionId: '66529d4c-8998-47c2-ab3e-5b953490b98f'
        }
      ];
      events.emit(BID_TIMEOUT, bidTimeout);
      expect(rtaCalls[1].callArgs['0']).to.equal('biddersTimeout');
      expect(rtaCalls[1].callArgs['1'].length).to.equal(2);
    });
    it('should handle BID_WON event', function() {
      const bidWon = {
        adId: '4587fec4900b81',
        mediaType: 'banner',
        requestId: '4587fec4900b81',
        cpm: 1.962,
        creativeId: 2126,
        currency: 'EUR',
        netRevenue: true,
        ttl: 302,
        auctionId: '914bedad-b145-4e46-ba58-51365faea6cb',
        statusMessage: 'Bid available',
        responseTimestamp: 1530628534437,
        requestTimestamp: 1530628534219,
        bidderCode: 'testbidder4',
        adUnitCode: 'div-gpt-ad-1438287399331-0',
        timeToRespond: 218,
        size: '300x250',
        status: 'rendered'
      };
      events.emit(BID_WON, bidWon);
      expect(rtaCalls[1].callArgs['0']).to.equal('resolveSlot');
      expect(rtaCalls[1].callArgs['1']).to.equal(
        'div-gpt-ad-1438287399331-0'
      );
      expect(rtaCalls[1].callArgs['2'].prebidWon).to.equal(true);
      expect(rtaCalls[1].callArgs['2'].prebidPartner).to.equal('testbidder4');
      expect(rtaCalls[1].callArgs['2'].prebidValue).to.equal(1962);
    });
    it('should throw error, invoking BID_WON event without adUnitCode', function() {
      const bidWon = {
        adId: '4587fec4900b81',
        mediaType: 'banner',
        requestId: '4587fec4900b81',
        cpm: 1.962,
        creativeId: 2126,
        currency: 'EUR',
        netRevenue: true,
        ttl: 302,
        auctionId: '914bedad-b145-4e46-ba58-51365faea6cb',
        statusMessage: 'Bid available',
        responseTimestamp: 1530628534437,
        requestTimestamp: 1530628534219,
        timeToRespond: 218,
        bidderCode: 'testbidder4',
        size: '300x250',
        status: 'rendered'
      };
      events.emit(BID_WON, bidWon);
      expect(rtaCalls[1]).to.be.undefined;
    });
    it('should throw error, invoking BID_WON event without bidderCode', function() {
      const bidWon = {
        adId: '4587fec4900b81',
        mediaType: 'banner',
        requestId: '4587fec4900b81',
        cpm: 1.962,
        creativeId: 2126,
        currency: 'EUR',
        netRevenue: true,
        ttl: 302,
        auctionId: '914bedad-b145-4e46-ba58-51365faea6cb',
        statusMessage: 'Bid available',
        responseTimestamp: 1530628534437,
        requestTimestamp: 1530628534219,
        adUnitCode: 'div-gpt-ad-1438287399331-0',
        timeToRespond: 218,
        size: '300x250',
        status: 'rendered'
      };
      events.emit(BID_WON, bidWon);
      expect(rtaCalls[1]).to.be.undefined;
    });
  });
});
