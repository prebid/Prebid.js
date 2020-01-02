import roxotAnalytic from 'modules/roxotAnalyticsAdapter';
import {expect} from 'chai';
import {server} from 'test/mocks/xhr';

let events = require('src/events');
let constants = require('src/constants.json');

describe('Roxot Prebid Analytic', function () {
  let roxotConfigServerUrl = 'config-server';
  let roxotEventServerUrl = 'event-server';
  let publisherId = 'test_roxot_prebid_analytics_publisher_id';

  let auctionId = '0ea14159-2058-4b87-a966-9d7652176a56';
  let timeout = 3000;
  let auctionStartTimestamp = Date.now();
  let bidder = 'rubicon';

  let bidAdUnit = 'div_with_bid';
  let noBidAdUnit = 'div_no_bid';
  let bidAfterTimeoutAdUnit = 'div_after_timeout';

  let auctionInit = {
    timestamp: auctionStartTimestamp,
    auctionId: auctionId,
    timeout: timeout
  };

  let bidRequested = {
    auctionId: auctionId,
    auctionStart: auctionStartTimestamp,
    bidderCode: bidder,
    bidderRequestId: '10340af0c7dc72',
    bids: [
      {
        adUnitCode: bidAdUnit,
        auctionId: auctionId,
        bidId: '298bf14ecbafb',
        bidder: bidder,
        bidderRequestId: '10340af0c7dc72',
        sizes: [[300, 250]],
        startTime: auctionStartTimestamp + 50,
        transactionId: '7aafa3ee-a80a-46d7-a4a0-cbcba463d97a'
      },
      {
        adUnitCode: bidAfterTimeoutAdUnit,
        auctionId: auctionId,
        bidId: '36c6375e2dceba',
        bidder: bidder,
        bidderRequestId: '10340af0c7dc72',
        sizes: [[300, 250]],
        startTime: auctionStartTimestamp + 70,
        transactionId: 'cf627df3-5828-4d3e-9dd0-c1733d328142'
      },
      {
        adUnitCode: noBidAdUnit,
        auctionId: auctionId,
        bidId: '36c6375e2dce21',
        bidder: bidder,
        bidderRequestId: '10340af0c7dc72',
        sizes: [[300, 250]],
        startTime: auctionStartTimestamp + 90,
        transactionId: 'cf627df3-5828-4d3e-9dd0-c1737aafa3ee'
      }
    ],
    doneCbCallCount: 1,
    start: auctionStartTimestamp,
    timeout: timeout
  };

  let bidAdjustmentWithBid = {
    ad: 'html',
    adId: '298bf14ecbafb',
    adUnitCode: bidAdUnit,
    auctionId: auctionId,
    bidder: bidder,
    bidderCode: bidder,
    cpm: 1.01,
    creativeId: '2249:92806132',
    currency: 'USD',
    height: 250,
    mediaType: 'banner',
    requestId: '298bf14ecbafb',
    requestTimestamp: auctionStartTimestamp + 50,
    responseTimestamp: auctionStartTimestamp + 50 + 421,
    size: '300x250',
    source: 'client',
    status: 'rendered',
    statusMessage: 'Bid available',
    timeToRespond: 421,
    ttl: 300,
    width: 300
  };

  let bidAdjustmentAfterTimeout = {
    ad: 'html',
    adId: '36c6375e2dceba',
    adUnitCode: bidAfterTimeoutAdUnit,
    auctionId: auctionId,
    bidder: bidder,
    bidderCode: bidder,
    cpm: 2.02,
    creativeId: '2249:92806132',
    currency: 'USD',
    height: 250,
    mediaType: 'banner',
    requestId: '36c6375e2dceba',
    requestTimestamp: auctionStartTimestamp + 70,
    responseTimestamp: auctionStartTimestamp + 70 + 6141,
    size: '300x250',
    source: 'client',
    status: 'rendered',
    statusMessage: 'Bid available',
    timeToRespond: 6141,
    ttl: 300,
    width: 300
  };

  let bidAdjustmentNoBid = {
    ad: 'html',
    adId: '36c6375e2dce21',
    adUnitCode: noBidAdUnit,
    auctionId: auctionId,
    bidder: bidder,
    bidderCode: bidder,
    cpm: 0,
    creativeId: '2249:92806132',
    currency: 'USD',
    height: 0,
    mediaType: 'banner',
    requestId: '36c6375e2dce21',
    requestTimestamp: auctionStartTimestamp + 90,
    responseTimestamp: auctionStartTimestamp + 90 + 215,
    size: '300x250',
    source: 'client',
    status: 'rendered',
    statusMessage: 'Bid available',
    timeToRespond: 215,
    ttl: 300,
    width: 0
  };

  let auctionEnd = {
    auctionId: auctionId
  };

  let bidTimeout = [
    {
      adUnitCode: bidAfterTimeoutAdUnit,
      auctionId: auctionId,
      bidId: '389444beed7361',
      bidder: bidder,
      timeout: timeout
    }
  ];

  let bidResponseWithBid = bidAdjustmentWithBid;
  let bidResponseAfterTimeout = bidAdjustmentAfterTimeout;
  let bidResponseNoBid = bidAdjustmentNoBid;
  let bidderDone = bidRequested;
  let bidWon = bidAdjustmentWithBid;

  describe('correct build and send events', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });
    afterEach(function () {
      roxotAnalytic.disableAnalytics();
      events.getEvents.restore();
    });
    it('should send prepared events to backend', function () {
      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: {
          publisherId: publisherId,
          configServer: roxotConfigServerUrl,
          server: roxotEventServerUrl
        }
      });

      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://' + roxotConfigServerUrl + '/c?publisherId=' + publisherId + '&host=localhost');
      server.requests[0].respond(200, {'Content-Type': 'application/json'}, '{"a": 1, "i": 1, "bat": 1}');

      events.emit(constants.EVENTS.AUCTION_INIT, auctionInit);
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequested);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentWithBid);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponseWithBid);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentNoBid);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponseNoBid);
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);
      events.emit(constants.EVENTS.AUCTION_END, auctionEnd);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentAfterTimeout);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponseAfterTimeout);
      events.emit(constants.EVENTS.BIDDER_DONE, bidderDone);
      events.emit(constants.EVENTS.BID_WON, bidWon);

      expect(server.requests.length).to.equal(4);

      expect(server.requests[1].url).to.equal('https://' + roxotEventServerUrl + '/a?publisherId=' + publisherId + '&host=localhost');
      expect(server.requests[2].url).to.equal('https://' + roxotEventServerUrl + '/bat?publisherId=' + publisherId + '&host=localhost');
      expect(server.requests[3].url).to.equal('https://' + roxotEventServerUrl + '/i?publisherId=' + publisherId + '&host=localhost');

      let auction = JSON.parse(server.requests[1].requestBody);
      expect(auction).to.include.all.keys('event', 'eventName', 'options', 'data');
      expect(auction.event).to.equal('a');

      expect(auction.data).to.include.all.keys('id', 'start', 'finish', 'timeout', 'adUnits');
      expect(auction.data.id).to.equal(auctionId);
      expect(auction.data.timeout).to.equal(timeout);

      expect(auction.data.adUnits).to.include.all.keys(bidAdUnit, bidAfterTimeoutAdUnit, noBidAdUnit);
      expect(auction.data.adUnits[bidAdUnit].bidders).to.have.property(bidder);
      expect(auction.data.adUnits[bidAfterTimeoutAdUnit].bidders).to.have.property(bidder);
      expect(auction.data.adUnits[noBidAdUnit].bidders).to.have.property(bidder);

      expect(auction.data.adUnits[bidAdUnit].bidders[bidder].status).to.equal('bid');
      expect(auction.data.adUnits[bidAfterTimeoutAdUnit].bidders[bidder].status).to.equal('timeout');
      expect(auction.data.adUnits[noBidAdUnit].bidders[bidder].status).to.equal('noBid');

      let bidAfterTimeout = JSON.parse(server.requests[2].requestBody);
      expect(bidAfterTimeout).to.include.all.keys('event', 'eventName', 'options', 'data');
      expect(bidAfterTimeout.event).to.equal('bat');

      expect(bidAfterTimeout.data).to.include.all.keys('start', 'finish', 'mediaType', 'adUnit', 'bidder', 'cpm', 'size', 'auction');
      expect(bidAfterTimeout.data.adUnit).to.equal(bidAfterTimeoutAdUnit);
      expect(bidAfterTimeout.data.bidder).to.equal(bidder);
      expect(bidAfterTimeout.data.cpm).to.equal(bidAdjustmentAfterTimeout.cpm);

      let impression = JSON.parse(server.requests[3].requestBody);
      expect(impression).to.include.all.keys('event', 'eventName', 'options', 'data');
      expect(impression.event).to.equal('i');

      expect(impression.data).to.include.all.keys('mediaType', 'adUnit', 'bidder', 'cpm', 'size', 'auction', 'isNew');
      expect(impression.data.adUnit).to.equal(bidAdUnit);
      expect(impression.data.bidder).to.equal(bidder);
      expect(impression.data.cpm).to.equal(bidAdjustmentWithBid.cpm);
    });
  });

  describe('support ad unit filter', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });
    afterEach(function () {
      roxotAnalytic.disableAnalytics();
      events.getEvents.restore();
    });
    it('should not send event for blocked ad unit', function () {
      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: {
          publisherId: publisherId,
          configServer: roxotConfigServerUrl,
          server: roxotEventServerUrl,
          adUnits: [noBidAdUnit, bidAfterTimeoutAdUnit]
        }
      });

      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('https://' + roxotConfigServerUrl + '/c?publisherId=' + publisherId + '&host=localhost');
      server.requests[0].respond(200, {'Content-Type': 'application/json'}, '{"a": 1, "i": 1, "bat": 1}');

      events.emit(constants.EVENTS.AUCTION_INIT, auctionInit);
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequested);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentWithBid);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponseWithBid);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentNoBid);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponseNoBid);
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);
      events.emit(constants.EVENTS.AUCTION_END, auctionEnd);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentAfterTimeout);
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponseAfterTimeout);
      events.emit(constants.EVENTS.BIDDER_DONE, bidderDone);
      events.emit(constants.EVENTS.BID_WON, bidWon);

      expect(server.requests.length).to.equal(3);

      expect(server.requests[1].url).to.equal('https://' + roxotEventServerUrl + '/a?publisherId=' + publisherId + '&host=localhost');
      expect(server.requests[2].url).to.equal('https://' + roxotEventServerUrl + '/bat?publisherId=' + publisherId + '&host=localhost');

      let auction = JSON.parse(server.requests[1].requestBody);
      expect(auction.data.adUnits).to.include.all.keys(noBidAdUnit, bidAfterTimeoutAdUnit);
      expect(auction.data.adUnits).to.not.include.all.keys(bidAdUnit);
    });
  });

  describe('should correct parse config', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      roxotAnalytic.disableAnalytics();
      events.getEvents.restore();
    });

    it('correct parse publisher config', function () {
      let publisherOptions = {
        publisherId: publisherId,
        configServer: roxotConfigServerUrl,
        server: roxotEventServerUrl,
        anything: 'else',
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      expect(roxotAnalytic.getOptions().options).to.deep.equal(publisherOptions);
    });

    it('support deprecated options', function () {
      let publisherOptions = {
        publisherIds: [publisherId],
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      expect(roxotAnalytic.getOptions().options).to.deep.equal(publisherOptions);
      expect(roxotAnalytic.getOptions().publisherId).to.equal(publisherId);
    });

    it('support default end-points', function () {
      let publisherOptions = {
        publisherId: publisherId,
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      expect(roxotAnalytic.getOptions().configServer).to.equal('pa.rxthdr.com/v3');
      expect(roxotAnalytic.getOptions().server).to.equal('pa.rxthdr.com/v3');
    });

    it('support custom config end-point', function () {
      let publisherOptions = {
        publisherId: publisherId,
        configServer: roxotConfigServerUrl
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      expect(roxotAnalytic.getOptions().configServer).to.equal(roxotConfigServerUrl);
      expect(roxotAnalytic.getOptions().server).to.equal('pa.rxthdr.com/v3');
    });

    it('support custom config and event end-point', function () {
      let publisherOptions = {
        publisherId: publisherId,
        server: roxotEventServerUrl
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      expect(roxotAnalytic.getOptions().configServer).to.equal(roxotEventServerUrl);
      expect(roxotAnalytic.getOptions().server).to.equal(roxotEventServerUrl);
    });

    it('support different config and event end-points', function () {
      let publisherOptions = {
        publisherId: publisherId,
        configServer: roxotConfigServerUrl,
        server: roxotEventServerUrl
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      expect(roxotAnalytic.getOptions().configServer).to.equal(roxotConfigServerUrl);
      expect(roxotAnalytic.getOptions().server).to.equal(roxotEventServerUrl);
    });

    it('support adUnit filter', function () {
      let publisherOptions = {
        publisherId: publisherId,
        adUnits: ['div1', 'div2']
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      expect(roxotAnalytic.getOptions().adUnits).to.deep.equal(['div1', 'div2']);
    });

    it('support fail loading server config', function () {
      let publisherOptions = {
        publisherId: publisherId
      };

      roxotAnalytic.enableAnalytics({
        provider: 'roxot',
        options: publisherOptions
      });

      server.requests[0].respond(500);

      expect(roxotAnalytic.getOptions().serverConfig).to.deep.equal({a: 1, i: 1, bat: 1, isError: 1});
    });
  });

  describe('build utm tag data', function () {
    beforeEach(function () {
      localStorage.setItem('roxot_analytics_utm_source', 'utm_source');
      localStorage.setItem('roxot_analytics_utm_medium', 'utm_medium');
      localStorage.setItem('roxot_analytics_utm_campaign', '');
      localStorage.setItem('roxot_analytics_utm_term', '');
      localStorage.setItem('roxot_analytics_utm_content', '');
      localStorage.setItem('roxot_analytics_utm_ttl', Date.now());
    });
    afterEach(function () {
      localStorage.removeItem('roxot_analytics_utm_source');
      localStorage.removeItem('roxot_analytics_utm_medium');
      localStorage.removeItem('roxot_analytics_utm_campaign');
      localStorage.removeItem('roxot_analytics_utm_term');
      localStorage.removeItem('roxot_analytics_utm_content');
      localStorage.removeItem('roxot_analytics_utm_ttl');
    });
    it('should build utm data from local storage', function () {
      let utmTagData = roxotAnalytic.buildUtmTagData();
      expect(utmTagData.utm_source).to.equal('utm_source');
      expect(utmTagData.utm_medium).to.equal('utm_medium');
      expect(utmTagData.utm_campaign).to.equal('');
      expect(utmTagData.utm_term).to.equal('');
      expect(utmTagData.utm_content).to.equal('');
    });
  });
});
