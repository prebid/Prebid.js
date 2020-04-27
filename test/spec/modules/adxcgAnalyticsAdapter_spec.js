import adxcgAnalyticsAdapter from 'modules/adxcgAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';

let events = require('src/events');
let constants = require('src/constants.json');

describe('adxcg analytics adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    events.getEvents.restore();
  });

  describe('track', function () {
    let initOptions = {
      publisherId: '42'
    };

    let auctionTimestamp = 1496510254313;

    // prepare general auction - request and response
    let bidRequest = {
      'bidderCode': 'appnexus',
      'bids': [{
        'params': {
          'placementId': '10433394'
        },
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'transactionId': '2f481ff1-8d20-4c28-8e36-e384e9e3eec6',
        'sizes': '300x250,300x600',
        'bidId': '2eddfdc0c791dc',
        'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
      }
      ]
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

    // what we expect after general auction
    let expectedAfterBid = {
      'bidRequests': [
        {
          'bidderCode': 'appnexus',
          'bids': [
            {
              'transactionId': '2f481ff1-8d20-4c28-8e36-e384e9e3eec6',
              'adUnitCode': 'div-gpt-ad-1438287399331-0',
              'bidId': '2eddfdc0c791dc',
              'sizes': '300x250,300x600',
              'params': {
                'placementId': '10433394'
              }
            }
          ]
        }
      ],
      'bidResponses': [
        {
          'adUnitCode': 'div-gpt-ad-1438287399331-0',
          'bidderCode': 'appnexus',
          'statusMessage': 'Bid available',
          'mediaType': 'banner',
          'renderedSize': '300x250',
          'cpm': 0.5,
          'currency': 'USD',
          'netRevenue': true,
          'timeToRespond': 2510,
          'bidId': '2eddfdc0c791dc',
          'creativeId': '29681110'
        }
      ],
      'auctionInit': {},
      'bidTimeout': [
        'bidderOne',
        'bidderTwo'
      ]
    };

    // lets simulate that some bidders timeout
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

    // now simulate some WIN and RENDERING
    let wonRequest = {
      'adId': '4587fec4900b81',
      'mediaType': 'banner',
      'requestId': '4587fec4900b81',
      'cpm': 1.962,
      'creativeId': 2126,
      'currency': 'EUR',
      'netRevenue': true,
      'ttl': 302,
      'auctionId': '914bedad-b145-4e46-ba58-51365faea6cb',
      'statusMessage': 'Bid available',
      'responseTimestamp': 1530628534437,
      'requestTimestamp': 1530628534219,
      'bidder': 'testbidder4',
      'adUnitCode': 'div-gpt-ad-1438287399331-0',
      'timeToRespond': 218,
      'size': '300x250',
      'status': 'rendered'
    };

    let wonExpect = {
      'bidWons': [{
        'bidderCode': 'testbidder4',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'mediaType': 'banner',
        'renderedSize': '300x250',
        'cpm': 1.962,
        'currency': 'EUR',
        'netRevenue': true,
        'timeToRespond': 218,
        'bidId': '4587fec4900b81',
        'statusMessage': 'Bid available',
        'status': 'rendered',
        'creativeId': '2126'
      }]
    };

    adapterManager.registerAnalyticsAdapter({
      code: 'adxcg',
      adapter: adxcgAnalyticsAdapter
    });

    beforeEach(function () {
      adapterManager.enableAnalytics({
        provider: 'adxcg',
        options: initOptions
      });
    });

    afterEach(function () {
      adxcgAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', function () {
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
      events.emit(constants.EVENTS.AUCTION_END, {});

      expect(server.requests.length).to.equal(1);

      let realAfterBid = JSON.parse(server.requests[0].requestBody);

      expect(realAfterBid).to.deep.equal(expectedAfterBid);

      expect(realAfterBid.bidTimeout).to.deep.equal(['bidderOne', 'bidderTwo']);

      // Step 6: Send auction bid won event
      events.emit(constants.EVENTS.BID_WON, wonRequest);

      expect(server.requests.length).to.equal(2);
      let winEventData = JSON.parse(server.requests[1].requestBody);

      expect(winEventData).to.deep.equal(wonExpect);
    });
  });
});
