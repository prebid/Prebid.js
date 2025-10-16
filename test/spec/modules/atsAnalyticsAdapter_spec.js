import atsAnalyticsAdapter, {parseBrowser, analyticsUrl, bidRequestedHandler} from '../../../modules/atsAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import {server} from '../../mocks/xhr.js';

import {getCoreStorageManager, getStorageManager} from '../../../src/storageManager.js';

import {EVENTS} from 'src/constants.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

const utils = require('src/utils');
const events = require('src/events');

const storage = getCoreStorageManager();
let sandbox;
let clock;
const now = new Date();

describe('ats analytics adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
    storage.setCookie('_lr_env_src_ats', 'true', 'Thu, 01 Jan 1970 00:00:01 GMT');
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers(now.getTime());
  });

  afterEach(function () {
    events.getEvents.restore();
    atsAnalyticsAdapter.getUserAgent.restore();
    atsAnalyticsAdapter.disableAnalytics();
    Math.random.restore();
    sandbox.restore();
    clock.restore();
  });

  describe('track', function () {
    it('builds and sends request and response data', function () {
      sinon.stub(Math, 'random').returns(0.99);
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');

      now.setTime(now.getTime() + 3600000);
      storage.setCookie('_lr_env_src_ats', 'true', now.toUTCString());
      storage.setCookie('_lr_sampling_rate', '10', now.toUTCString());

      this.timeout(2100);

      const initOptions = {
        pid: '10433394'
      };
      const auctionTimestamp = 1496510254326;

      // prepare general auction - request
      const bidRequest = {
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
        'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
      };
      // prepare general auction - response
      const bidResponse = {
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
      const expectedAfterBid = {
        'Data': [{
          'has_envelope': true,
          'adapter_version': 3,
          'bidder': 'appnexus',
          'bid_id': '30c77d079cdf17',
          'auction_id': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
          'user_browser': parseBrowser(),
          'user_platform': navigator.platform,
          'auction_start': '2020-02-03T14:14:25.161Z',
          'domain': window.location.hostname,
          'envelope_source': true,
          'pid': '10433394',
          'response_time_stamp': '2020-02-03T14:23:11.978Z',
          'currency': 'USD',
          'cpm': 0.5,
          'net_revenue': true,
          'bid_won': true
        }]
      };

      const wonRequest = {
        'adId': '2eddfdc0c791dc',
        'mediaType': 'banner',
        'requestId': '30c77d079cdf17',
        'cpm': 0.5,
        'creativeId': 29681110,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7',
        'statusMessage': 'Bid available',
        'responseTimestamp': 1633525319061,
        'requestTimestamp': 1633525319258,
        'bidder': 'appnexus',
        'adUnitCode': 'div-gpt-ad-1438287399331-0',
        'size': '300x250',
        'status': 'rendered'
      };

      // lets simulate that some bidders timeout
      const bidTimeoutArgsV1 = [
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
      events.emit(EVENTS.AUCTION_INIT, {
        timestamp: auctionTimestamp
      });
      // Step 2: Send bid requested event
      events.emit(EVENTS.BID_REQUESTED, bidRequest);

      // Step 3: Send bid response event
      events.emit(EVENTS.BID_RESPONSE, bidResponse);

      // Step 4: Send bid time out event
      events.emit(EVENTS.BID_TIMEOUT, bidTimeoutArgsV1);

      // Step 5: Send auction end event
      events.emit(EVENTS.AUCTION_END, {});
      // Step 6: Send bid won event
      events.emit(EVENTS.BID_WON, wonRequest);

      // Stub getAllWinningBids before auction end processing
      const globalObj = getGlobal();
      if (typeof globalObj.getAllWinningBids !== 'function') {
        globalObj.getAllWinningBids = function() { return []; };
      }
      sandbox.stub(globalObj, 'getAllWinningBids').returns([wonRequest]);

      clock.tick(2000);

      const requests = server.requests.filter(req => {
        return req.url.indexOf(analyticsUrl) > -1;
      });

      expect(requests.length).to.equal(1);

      const realAfterBid = JSON.parse(requests[0].requestBody);

      // Step 7: assert real data after bid and expected data
      expect(realAfterBid['Data']).to.deep.equal(expectedAfterBid['Data']);

      // check that the publisher ID is configured via options
      expect(atsAnalyticsAdapter.context.pid).to.equal(initOptions.pid);
    })
    it('check browser is safari', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
      sinon.stub(Math, 'random').returns(0.99);
      const browser = parseBrowser();
      expect(browser).to.equal('Safari');
    })
    it('check browser is chrome', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/80.0.3987.95 Mobile/15E148 Safari/604.1');
      sinon.stub(Math, 'random').returns(0.99);
      const browser = parseBrowser();
      expect(browser).to.equal('Chrome');
    })
    it('check browser is edge', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.74 Safari/537.36 Edg/79.0.309.43');
      sinon.stub(Math, 'random').returns(0.99);
      const browser = parseBrowser();
      expect(browser).to.equal('Microsoft Edge');
    })
    it('check browser is firefox', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (iPhone; CPU OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/23.0  Mobile/15E148 Safari/605.1.15');
      sinon.stub(Math, 'random').returns(0.99);
      const browser = parseBrowser();
      expect(browser).to.equal('Firefox');
    })
    it('check browser is unknown', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns(undefined);
      sinon.stub(Math, 'random').returns(0.99);
      const browser = parseBrowser();
      expect(browser).to.equal('Unknown');
    })
    it('should not fire analytics request if sampling rate is 0', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
      sinon.stub(Math, 'random').returns(0.99);
      const result = atsAnalyticsAdapter.shouldFireRequest(0);
      expect(result).to.equal(false);
    })
    it('should fire analytics request', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
      sinon.stub(Math, 'random').returns(0.99);
      // publisher can try to pass anything they want but we will set sampling rate to 100, which means we will have 1% of requests
      const result = atsAnalyticsAdapter.shouldFireRequest(8);
      expect(result).to.equal(true);
    })
    it('should not fire analytics request if math random is something other then 0.99', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
      sinon.stub(Math, 'random').returns(0.98);
      // publisher can try to pass anything they want but we will set sampling rate to 100, which means we will have 1% of requests
      const result = atsAnalyticsAdapter.shouldFireRequest(10);
      expect(result).to.equal(false);
    })

    it('should set cookie value to 10 for _lr_sampling_rate', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
      sinon.stub(Math, 'random').returns(0.99);
      atsAnalyticsAdapter.setSamplingCookie(10);
      const samplingRate = storage.getCookie('_lr_sampling_rate');
      expect(samplingRate).to.equal('10');
    })

    it('should set cookie value to 0 for _lr_sampling_rate', function () {
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
      sinon.stub(Math, 'random').returns(0.99);
      atsAnalyticsAdapter.setSamplingCookie(0);
      const samplingRate = storage.getCookie('_lr_sampling_rate');
      expect(samplingRate).to.equal('0');
    })

    it('enable analytics', function () {
      sandbox.stub(utils, 'logError');
      sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
      sinon.stub(Math, 'random').returns(0.99);
      atsAnalyticsAdapter.enableAnalytics({
        options: {}
      });
      expect(utils.logError.called).to.equal(true);
    })

    describe('has_envelope logic for Prebid v10.0+ compatibility', function () {
      beforeEach(function () {
        sinon.stub(atsAnalyticsAdapter, 'getUserAgent').returns('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/536.25 (KHTML, like Gecko) Version/6.0 Safari/536.25');
        sinon.stub(Math, 'random').returns(0.99);
        storage.setCookie('_lr_env_src_ats', 'true', 'Thu, 01 Jan 1970 00:00:01 GMT');

        // Enable analytics for testing
        atsAnalyticsAdapter.enableAnalytics({
          options: { pid: '10433394' }
        });
      });

      it('should return true when userIdAsEids contains liveramp.com source with valid uids', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': [{
              'source': 'liveramp.com',
              'uids': [{'id': 'AmThEbO1ssIWjrNdU4noT4ZFBILSVBBYHbipOYt_JP40e5nZdXns2g'}]
            }]
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(true);
      });

      it('should return false when userIdAsEids contains liveramp source but no uids', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': [{
              'source': 'liveramp.com',
              'uids': []
            }]
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(false);
      });

      it('should return false when userIdAsEids contains non-liveramp sources', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': [{
              'source': 'id5-sync.com',
              'uids': [{'id': 'some-other-id'}]
            }]
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(false);
      });

      it('should return false when userIdAsEids is empty array', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': []
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(false);
      });

      it('should return false when userIdAsEids is not present', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17'
            // No userIdAsEids property
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(false);
      });

      it('should return false when userIdAsEids is not an array', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': 'not-an-array'
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(false);
      });

      it('should return true for legacy userId.idl_env (backward compatibility)', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userId': {
              'idl_env': 'AmThEbO1ssIWjrNdU4noT4ZFBILSVBBYHbipOYt_JP40e5nZdXns2g'
            }
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(true);
      });

      it('should return false when userIdAsEids has liveramp source but uids is null', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': [{
              'source': 'liveramp.com',
              'uids': null
            }]
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(false);
      });

      it('should return false when userIdAsEids has liveramp source but no uids property', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': [{
              'source': 'liveramp.com'
              // No uids property
            }]
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(false);
      });

      it('should handle multiple userIdAsEids entries and find liveramp source', function () {
        const bidRequestArgs = {
          'bidderCode': 'appnexus',
          'auctionStart': 1580739265161,
          'bids': [{
            'bidder': 'appnexus',
            'bidId': '30c77d079cdf17',
            'userIdAsEids': [
              {
                'source': 'id5-sync.com',
                'uids': [{'id': 'id5-value'}]
              },
              {
                'source': 'liveramp.com',
                'uids': [{'id': 'liveramp-value'}]
              },
              {
                'source': 'criteo.com',
                'uids': [{'id': 'criteo-value'}]
              }
            ]
          }],
          'auctionId': 'a5b849e5-87d7-4205-8300-d063084fcfb7'
        };

        const result = bidRequestedHandler(bidRequestArgs);
        expect(result[0].has_envelope).to.equal(true);
      });
    })
  })
})
