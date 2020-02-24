import atsAnalyticsAdapter from '../../../modules/atsAnalyticsAdapter';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
let events = require('src/events');
let constants = require('src/constants.json');

describe('ats analytics adapter', function () {
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
      pid: '10433394',
      host: 'https://example.com/dev',
    };
    let auctionTimestamp = 1496510254326;

    // prepare general auction - request
    let bidRequest = {
      'bidderCode': 'appnexus',
      'auctionStart': 1580739265161,
      'bids': [{
        'bidder': 'appnexus',
        'params': {
          'placementId': '10433394'
        },
        'userId': {
          'idl_env': 'AmThEbO1ssIWjrNdU4noT4ZFBILSVBBYHbipOYt_JP40e5nZdXns2g'
        },
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'transactionId': '2f481ff1-8d20-4c28-8e36-e384e9e3eec6',
        'sizes': '300x250,300x600',
        'bidId': '30c77d079cdf17'
      }],
      'refererInfo': {
        'referer': 'https://example.com/dev'
      },
      'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
    };
    // prepare general auction - response
    let bidResponse = {
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '2eddfdc0c791dc',
      'mediaType': 'banner',
      'source': 'client',
      'requestId': '30c77d079cdf17',
      'cpm': 0.5,
      'creativeId': 29681110,
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 300,
      'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
      'responseTimestamp': 1580739791978,
      'requestTimestamp': 1580739265164,
      'bidder': 'appnexus',
      'adUnitCode': 'div-gpt-ad-1438287399331-0',
      'timeToRespond': 2510,
      'size': '300x250'
    };

    // what we expect after general auction
    let expectedAfterBid = {
      'Data': [{
        'has_envelope': true,
        'bidder': 'appnexus',
        'bid_id': '30c77d079cdf17',
        'auction_id': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        'user_browser': false,
        'user_platform': 'Linux x86_64',
        'auction_start': '2020-02-03T14:14:25.161Z',
        'domain': 'https://example.com/dev',
        'pid': '10433394',
        'response_time_stamp': '2020-02-03T14:23:11.978Z',
        'cpm': 0.5,
        'currency': 'USD',
        'net_revenue': true
      }]
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

    adapterManager.registerAnalyticsAdapter({
      code: 'atsAnalytics',
      adapter: atsAnalyticsAdapter
    });

    beforeEach(function () {
      adapterManager.enableAnalytics({
        provider: 'atsAnalytics',
        options: initOptions
      });
      requests = [];
    });

    afterEach(function () {
      atsAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends request and response data', function () {
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

      expect(requests.length).to.equal(1);

      let realAfterBid = JSON.parse(requests[0].requestBody);

      expect(realAfterBid).to.deep.equal(expectedAfterBid);

      // check that the host and publisher ID is configured via options
      expect(atsAnalyticsAdapter.context.host).to.equal(initOptions.host);
      expect(atsAnalyticsAdapter.context.pid).to.equal(initOptions.pid);
    })
  })
})
