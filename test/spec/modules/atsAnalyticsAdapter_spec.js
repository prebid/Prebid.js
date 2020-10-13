import atsAnalyticsAdapter from '../../../modules/atsAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import {server} from '../../mocks/xhr.js';
import {checkUserBrowser, browserIsChrome, browserIsEdge, browserIsSafari, browserIsFirefox} from '../../../modules/atsAnalyticsAdapter.js';
let events = require('src/events');
let constants = require('src/constants.json');

describe('ats analytics adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    events.getEvents.restore();
    atsAnalyticsAdapter.disableAnalytics();
  });

  describe('track', function () {
    it('builds and sends request and response data', function () {
      sinon.spy(atsAnalyticsAdapter, 'track');

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
          'user_browser': checkUserBrowser(),
          'user_platform': navigator.platform,
          'auction_start': '2020-02-03T14:14:25.161Z',
          'domain': window.location.hostname,
          'pid': '10433394',
          'response_time_stamp': '2020-02-03T14:23:11.978Z',
          'currency': 'USD',
          'cpm': 0.5,
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

      adapterManager.enableAnalytics({
        provider: 'atsAnalytics',
        options: initOptions
      });

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

      let requests = server.requests.filter(req => {
        return req.url.indexOf(initOptions.host) > -1;
      });

      expect(requests.length).to.equal(1);

      let realAfterBid = JSON.parse(requests[0].requestBody);

      // Step 6: assert real data after bid and expected data
      expect(realAfterBid['Data']).to.deep.equal(expectedAfterBid['Data']);

      // check that the host and publisher ID is configured via options
      expect(atsAnalyticsAdapter.context.host).to.equal(initOptions.host);
      expect(atsAnalyticsAdapter.context.pid).to.equal(initOptions.pid);
    })
    it('check browser is not safari', function () {
      window.safari = undefined;
      let browser = browserIsSafari();
      expect(browser).to.equal(false);
    })
    it('check browser is safari', function () {
      window.safari = {};
      let browser = browserIsSafari();
      expect(browser).to.equal('Safari');
    })
    it('check browser is not chrome', function () {
      window.chrome = {
        app: undefined,
        webstore: undefined,
        runtime: undefined
      };
      let browser = browserIsChrome();
      expect(browser).to.equal(false);
    })
    it('check browser is chrome', function () {
      window.chrome = {
        app: {},
        webstore: {},
        runtime: {}
      };
      let browser = browserIsChrome();
      expect(browser).to.equal('Chrome');
    })
    it('check browser is edge', function () {
      Object.defineProperty(window, 'StyleMedia', {
        value: {},
        writable: true
      });
      Object.defineProperty(document, 'documentMode', {
        value: undefined,
        writable: true
      });
      let browser = browserIsEdge();
      expect(browser).to.equal('Edge');
    })
    it('check browser is not edge', function () {
      Object.defineProperty(document, 'documentMode', {
        value: {},
        writable: true
      });
      let browser = browserIsEdge();
      expect(browser).to.equal(false);
    })
    it('check browser is firefox', function () {
      global.InstallTrigger = {};
      let browser = browserIsFirefox();
      expect(browser).to.equal('Firefox');
    })
    it('check browser is not firefox', function () {
      global.InstallTrigger = undefined;
      let browser = browserIsFirefox();
      expect(browser).to.equal(false);
    })
  })
})
