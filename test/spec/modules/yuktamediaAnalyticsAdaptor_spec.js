import yuktamediaAnalyticsAdapter from 'modules/yuktamediaAnalyticsAdapter';
import { expect } from 'chai';
let adaptermanager = require('src/adaptermanager');
let events = require('src/events');
let constants = require('src/constants.json');

describe('YuktaMedia analytics adapter', function () {
  let xhr;
  let requests;

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    xhr.restore();
    events.getEvents.restore();
  });

  describe('track', function () {
    let initOptions = {
      pubId: '1',
      pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT=='
    };

    adaptermanager.registerAnalyticsAdapter({
      code: 'yuktamedia',
      adapter: yuktamediaAnalyticsAdapter
    });

    beforeEach(function () {
      adaptermanager.enableAnalytics({
        provider: 'yuktamedia',
        options: initOptions
      });
    });

    afterEach(function () {
      yuktamediaAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', function () {
      let auctionTimestamp = 1496510254313;
      let bidRequest = {
        'bidderCode': 'appnexus',
        'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        'bidderRequestId': '173209942f8bdd',
        'bids': [{
          'bidder': 'appnexus',
          'params': {
            'placementId': '10433394'
          },
          'crumbs': {
            'pubcid': '9a2a4e71-f39b-405f-aecc-19efc22b618d'
          },
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'transactionId': '2f481ff1-8d20-4c28-8e36-e384e9e3eec6',
          'sizes': [
            [300, 250],
            [300, 600]
          ],
          'bidId': '2eddfdc0c791dc',
          'bidderRequestId': '173209942f8bdd',
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        }
        ],
        'auctionStart': 1522265863591,
        'timeout': 3000,
        'start': 1522265863600,
        'doneCbCallCount': 1
      };
      let bidResponse = {
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '2eddfdc0c791dc',
        'mediaType': 'banner',
        'source': 'client',
        'requestId': '2eddfdc0c791dc',
        'cpm': 0.5,
        'creativeId': 29681110,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        'responseTimestamp': 1522265866110,
        'requestTimestamp': 1522265863600,
        'bidder': 'appnexus',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'timeToRespond': 2510,
        'size': '300x250'
      };
      let bidTimeoutArgsV1 = [
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
      let bid = {
        'bidderCode': 'appnexus',
        'bidId': '2eddfdc0c791dc',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'requestId': '173209942f8bdd',
        'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        'renderStatus': 2,
        'cpm': 0.5,
        'creativeId': 29681110,
        'currency': 'USD',
        'mediaType': 'banner',
        'netRevenue': true,
        'requestTimestamp': 1522265863600,
        'responseTimestamp': 1522265866110,
        'sizes': '300x250,300x600',
        'statusMessage': 'Bid available',
        'timeToRespond': 2510
      }

      // Step 1: Send auction init event
      events.emit(constants.EVENTS.AUCTION_INIT, {
        timestamp: auctionTimestamp
      });

      // Step 2: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequest);

      // Step 3: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);

      // Step 4: Send bid time out event
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeoutArgsV1);

      // Step 5: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, {}, 'auctionEnd');

      expect(requests.length).to.equal(1);

      let auctionEventData = JSON.parse(requests[0].requestBody);

      expect(auctionEventData.bids.length).to.equal(1);
      expect(auctionEventData.bids[0]).to.deep.equal(bid);

      expect(auctionEventData.initOptions).to.deep.equal(initOptions);

      // Step 6: Send auction bid won event
      events.emit(constants.EVENTS.BID_WON, {
        'bidderCode': 'appnexus',
        'statusMessage': 'Bid available',
        'adId': '108abedd106b669',
        'auctionId': '6355d610-7cdc-4009-a866-f91997fd24bb',
        'responseTimestamp': 1522144433058,
        'requestTimestamp': 1522144432923,
        'bidder': 'appnexus',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'timeToRespond': 135,
        'size': '300x250',
        'status': 'rendered'
      }, 'won');

      expect(requests.length).to.equal(2);

      let winEventData = JSON.parse(requests[1].requestBody);

      expect(winEventData.bidWon.status).to.equal('rendered');
      expect(winEventData.initOptions).to.deep.equal(initOptions);
    });
  });
});
