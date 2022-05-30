import pubxaiAnalyticsAdapter from 'modules/pubxaiAnalyticsAdapter.js';
import { getDeviceType, getBrowser, getOS } from 'modules/pubxaiAnalyticsAdapter.js';
import {
  expect
} from 'chai';
import adapterManager from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import {
  server
} from 'test/mocks/xhr.js';

let events = require('src/events');
let constants = require('src/constants.json');

describe('pubxai analytics adapter', function() {
  beforeEach(function() {
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function() {
    events.getEvents.restore();
  });

  describe('track', function() {
    let initOptions = {
      samplingRate: '1',
      pubxId: '6c415fc0-8b0e-4cf5-be73-01526a4db625'
    };

    let location = utils.getWindowLocation();
    let storage = window.top['sessionStorage'];

    let prebidEvent = {
      'auctionInit': {
        'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        'timestamp': 1603865707180,
        'auctionStatus': 'inProgress',
        'adUnits': [{
          'code': '/19968336/header-bid-tag-1',
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  250
                ]
              ]
            }
          },
          'bids': [{
            'bidder': 'appnexus',
            'params': {
              'placementId': 13144370
            },
            'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            'floorData': {
              'skipped': false,
              'skipRate': 0,
              'modelVersion': 'test model 1.0',
              'location': 'fetch',
              'floorProvider': 'PubXFloorProvider',
              'fetchStatus': 'success'
            }
          }],
          'sizes': [
            [
              300,
              250
            ]
          ],
          'transactionId': '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294'
        }],
        'adUnitCodes': [
          '/19968336/header-bid-tag-1'
        ],
        'bidderRequests': [{
          'bidderCode': 'appnexus',
          'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
          'bidderRequestId': '184cbc05bb90ba',
          'bids': [{
            'bidder': 'appnexus',
            'params': {
              'placementId': 13144370
            },
            'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            'floorData': {
              'skipped': false,
              'skipRate': 0,
              'modelVersion': 'test model 1.0',
              'location': 'fetch',
              'floorProvider': 'PubXFloorProvider',
              'fetchStatus': 'success'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    300,
                    250
                  ]
                ]
              }
            },
            'adUnitCode': '/19968336/header-bid-tag-1',
            'transactionId': '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
            'sizes': [
              [
                300,
                250
              ]
            ],
            'bidId': '248f9a4489835e',
            'bidderRequestId': '184cbc05bb90ba',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }],
          'auctionStart': 1603865707180,
          'timeout': 1000,
          'refererInfo': {
            'referer': 'http://local-pnh.net:8080/stream/',
            'reachedTop': true,
            'isAmp': false,
            'numIframes': 0,
            'stack': [
              'http://local-pnh.net:8080/stream/'
            ],
            'canonicalUrl': null
          },
          'start': 1603865707182
        }],
        'noBids': [],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 1000,
        'config': {
          'samplingRate': '1',
          'pubxId': '6c415fc0-8b0e-4cf5-be73-01526a4db625'
        }
      },
      'bidRequested': {
        'bidderCode': 'appnexus',
        'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        'bidderRequestId': '184cbc05bb90ba',
        'bids': [{
          'bidder': 'appnexus',
          'params': {
            'placementId': 13144370
          },
          'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
          'floorData': {
            'skipped': false,
            'skipRate': 0,
            'modelVersion': 'test model 1.0',
            'location': 'fetch',
            'floorProvider': 'PubXFloorProvider',
            'fetchStatus': 'success'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  250
                ]
              ]
            }
          },
          'adUnitCode': '/19968336/header-bid-tag-1',
          'transactionId': '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
          'sizes': [
            [
              300,
              250
            ]
          ],
          'bidId': '248f9a4489835e',
          'bidderRequestId': '184cbc05bb90ba',
          'src': 'client',
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0
        }],
        'auctionStart': 1603865707180,
        'timeout': 1000,
        'refererInfo': {
          'referer': 'http://local-pnh.net:8080/stream/',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'http://local-pnh.net:8080/stream/'
          ],
          'canonicalUrl': null
        },
        'start': 1603865707182
      },
      'bidTimeout': [],
      'bidResponse': {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '32780c4bc382cb',
        'requestId': '248f9a4489835e',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.5,
        'creativeId': 96846035,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': '/19968336/header-bid-tag-1',
        'appnexus': {
          'buyerMemberId': 9325
        },
        'meta': {
          'advertiserId': 2529885
        },
        'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        'originalCpm': 0.5,
        'originalCurrency': 'USD',
        'floorData': {
          'fetchStatus': 'success',
          'floorProvider': 'PubXFloorProvider',
          'location': 'fetch',
          'modelVersion': 'test model 1.0',
          'skipRate': 0,
          'skipped': false,
          'floorValue': 0.4,
          'floorRule': '/19968336/header-bid-tag-1|banner',
          'floorCurrency': 'USD',
          'cpmAfterAdjustments': 0.5,
          'enforcements': {
            'enforceJS': true,
            'enforcePBS': false,
            'floorDeals': true,
            'bidAdjustment': true
          },
          'matchedFields': {
            'gptSlot': '/19968336/header-bid-tag-1',
            'mediaType': 'banner'
          }
        },
        'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        'responseTimestamp': 1616654313071,
        'requestTimestamp': 1616654312804,
        'bidder': 'appnexus',
        'timeToRespond': 267,
        'pbLg': '0.50',
        'pbMg': '0.50',
        'pbHg': '0.50',
        'pbAg': '0.50',
        'pbDg': '0.50',
        'pbCg': '0.50',
        'size': '300x250',
        'adserverTargeting': {
          'hb_bidder': 'appnexus',
          'hb_adid': '32780c4bc382cb',
          'hb_pb': '0.50',
          'hb_size': '300x250',
          'hb_source': 'client',
          'hb_format': 'banner'
        },
      },
      'auctionEnd': {
        'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        'timestamp': 1616654312804,
        'auctionEnd': 1616654313090,
        'auctionStatus': 'completed',
        'adUnits': [{
          'code': '/19968336/header-bid-tag-1',
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  250
                ]
              ]
            }
          },
          'bids': [{
            'bidder': 'appnexus',
            'params': {
              'placementId': 13144370
            },
            'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            'floorData': {
              'skipped': false,
              'skipRate': 0,
              'modelVersion': 'test model 1.0',
              'location': 'fetch',
              'floorProvider': 'PubXFloorProvider',
              'fetchStatus': 'success'
            }
          }],
          'sizes': [
            [
              300,
              250
            ]
          ],
          'transactionId': '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294'
        }],
        'adUnitCodes': [
          '/19968336/header-bid-tag-1'
        ],
        'bidderRequests': [{
          'bidderCode': 'appnexus',
          'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
          'bidderRequestId': '184cbc05bb90ba',
          'bids': [{
            'bidder': 'appnexus',
            'params': {
              'placementId': 13144370
            },
            'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
            'floorData': {
              'skipped': false,
              'skipRate': 0,
              'modelVersion': 'test model 1.0',
              'location': 'fetch',
              'floorProvider': 'PubXFloorProvider',
              'fetchStatus': 'success'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    300,
                    250
                  ]
                ]
              }
            },
            'adUnitCode': '/19968336/header-bid-tag-1',
            'transactionId': '41ec8eaf-3e7c-4a8b-8344-ab796ff6e294',
            'sizes': [
              [
                300,
                250
              ]
            ],
            'bidId': '248f9a4489835e',
            'bidderRequestId': '184cbc05bb90ba',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }],
          'auctionStart': 1603865707180,
          'timeout': 1000,
          'refererInfo': {
            'referer': 'http://local-pnh.net:8080/stream/',
            'reachedTop': true,
            'isAmp': false,
            'numIframes': 0,
            'stack': [
              'http://local-pnh.net:8080/stream/'
            ],
            'canonicalUrl': null
          },
          'start': 1603865707182
        }],
        'noBids': [],
        'bidsReceived': [{
          'bidderCode': 'appnexus',
          'width': 300,
          'height': 250,
          'statusMessage': 'Bid available',
          'adId': '32780c4bc382cb',
          'requestId': '248f9a4489835e',
          'mediaType': 'banner',
          'source': 'client',
          'cpm': 0.5,
          'creativeId': 96846035,
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 300,
          'adUnitCode': '/19968336/header-bid-tag-1',
          'appnexus': {
            'buyerMemberId': 9325
          },
          'meta': {
            'advertiserId': 2529885
          },
          'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
          'originalCpm': 0.5,
          'originalCurrency': 'USD',
          'floorData': {
            'fetchStatus': 'success',
            'floorProvider': 'PubXFloorProvider',
            'location': 'fetch',
            'modelVersion': 'test model 1.0',
            'skipRate': 0,
            'skipped': false,
            'floorValue': 0.4,
            'floorRule': '/19968336/header-bid-tag-1|banner',
            'floorCurrency': 'USD',
            'cpmAfterAdjustments': 0.5,
            'enforcements': {
              'enforceJS': true,
              'enforcePBS': false,
              'floorDeals': true,
              'bidAdjustment': true
            },
            'matchedFields': {
              'gptSlot': '/19968336/header-bid-tag-1',
              'mediaType': 'banner'
            }
          },
          'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
          'responseTimestamp': 1616654313071,
          'requestTimestamp': 1616654312804,
          'bidder': 'appnexus',
          'timeToRespond': 267,
          'pbLg': '0.50',
          'pbMg': '0.50',
          'pbHg': '0.50',
          'pbAg': '0.50',
          'pbDg': '0.50',
          'pbCg': '0.50',
          'size': '300x250',
          'adserverTargeting': {
            'hb_bidder': 'appnexus',
            'hb_adid': '32780c4bc382cb',
            'hb_pb': '0.50',
            'hb_size': '300x250',
            'hb_source': 'client',
            'hb_format': 'banner'
          },
          'status': 'rendered',
          'params': [{
            'placementId': 13144370
          }]
        }],
        'winningBids': [],
        'timeout': 1000
      },
      'bidWon': {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '32780c4bc382cb',
        'requestId': '248f9a4489835e',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.5,
        'creativeId': 96846035,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': '/19968336/header-bid-tag-1',
        'appnexus': {
          'buyerMemberId': 9325
        },
        'meta': {
          'advertiserId': 2529885
        },
        'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        'originalCpm': 0.5,
        'originalCurrency': 'USD',
        'floorData': {
          'fetchStatus': 'success',
          'floorProvider': 'PubXFloorProvider',
          'location': 'fetch',
          'modelVersion': 'test model 1.0',
          'skipRate': 0,
          'skipped': false,
          'floorValue': 0.4,
          'floorRule': '/19968336/header-bid-tag-1|banner',
          'floorCurrency': 'USD',
          'cpmAfterAdjustments': 0.5,
          'enforcements': {
            'enforceJS': true,
            'enforcePBS': false,
            'floorDeals': true,
            'bidAdjustment': true
          },
          'matchedFields': {
            'gptSlot': '/19968336/header-bid-tag-1',
            'mediaType': 'banner'
          }
        },
        'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        'responseTimestamp': 1616654313071,
        'requestTimestamp': 1616654312804,
        'bidder': 'appnexus',
        'timeToRespond': 267,
        'pbLg': '0.50',
        'pbMg': '0.50',
        'pbHg': '0.50',
        'pbAg': '0.50',
        'pbDg': '0.50',
        'pbCg': '0.50',
        'size': '300x250',
        'adserverTargeting': {
          'hb_bidder': 'appnexus',
          'hb_adid': '32780c4bc382cb',
          'hb_pb': '0.50',
          'hb_size': '300x250',
          'hb_source': 'client',
          'hb_format': 'banner'
        },
        'status': 'rendered',
        'params': [{
          'placementId': 13144370
        }]
      },
      'pageDetail': {
        'host': location.host,
        'path': location.pathname,
        'search': location.search
      },
      'pmcDetail': {
        'bidDensity': storage.getItem('pbx:dpbid'),
        'maxBid': storage.getItem('pbx:mxbid'),
        'auctionId': storage.getItem('pbx:aucid')
      }
    };

    let expectedAfterBid = {
      'bids': [{
        'bidderCode': 'appnexus',
        'bidId': '248f9a4489835e',
        'adUnitCode': '/19968336/header-bid-tag-1',
        'gptSlotCode': utils.getGptSlotInfoForAdUnitCode('/19968336/header-bid-tag-1').gptSlot || null,
        'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        'sizes': '300x250',
        'renderStatus': 2,
        'requestTimestamp': 1616654312804,
        'creativeId': 96846035,
        'currency': 'USD',
        'cpm': 0.5,
        'netRevenue': true,
        'mediaType': 'banner',
        'statusMessage': 'Bid available',
        'floorData': {
          'fetchStatus': 'success',
          'floorProvider': 'PubXFloorProvider',
          'location': 'fetch',
          'modelVersion': 'test model 1.0',
          'skipRate': 0,
          'skipped': false,
          'floorValue': 0.4,
          'floorRule': '/19968336/header-bid-tag-1|banner',
          'floorCurrency': 'USD',
          'cpmAfterAdjustments': 0.5,
          'enforcements': {
            'enforceJS': true,
            'enforcePBS': false,
            'floorDeals': true,
            'bidAdjustment': true
          },
          'matchedFields': {
            'gptSlot': '/19968336/header-bid-tag-1',
            'mediaType': 'banner'
          }
        },
        'timeToRespond': 267,
        'responseTimestamp': 1616654313071
      }],
      'pageDetail': {
        'host': location.host,
        'path': location.pathname,
        'search': location.search,
        'adUnitCount': 1
      },
      'floorDetail': {
        'fetchStatus': 'success',
        'floorProvider': 'PubXFloorProvider',
        'location': 'fetch',
        'modelVersion': 'test model 1.0',
        'skipRate': 0,
        'skipped': false
      },
      'deviceDetail': {
        'platform': navigator.platform,
        'deviceType': getDeviceType(),
        'deviceOS': getOS(),
        'browser': getBrowser()
      },
      'pmcDetail': {
        'bidDensity': storage.getItem('pbx:dpbid'),
        'maxBid': storage.getItem('pbx:mxbid'),
        'auctionId': storage.getItem('pbx:aucid')
      },
      'initOptions': initOptions
    };

    let expectedAfterBidWon = {
      'winningBid': {
        'adUnitCode': '/19968336/header-bid-tag-1',
        'gptSlotCode': utils.getGptSlotInfoForAdUnitCode('/19968336/header-bid-tag-1').gptSlot || null,
        'auctionId': 'bc3806e4-873e-453c-8ae5-204f35e923b4',
        'bidderCode': 'appnexus',
        'bidId': '248f9a4489835e',
        'cpm': 0.5,
        'creativeId': 96846035,
        'currency': 'USD',
        'floorData': {
          'fetchStatus': 'success',
          'floorProvider': 'PubXFloorProvider',
          'location': 'fetch',
          'modelVersion': 'test model 1.0',
          'skipRate': 0,
          'skipped': false,
          'floorValue': 0.4,
          'floorRule': '/19968336/header-bid-tag-1|banner',
          'floorCurrency': 'USD',
          'cpmAfterAdjustments': 0.5,
          'enforcements': {
            'enforceJS': true,
            'enforcePBS': false,
            'floorDeals': true,
            'bidAdjustment': true
          },
          'matchedFields': {
            'gptSlot': '/19968336/header-bid-tag-1',
            'mediaType': 'banner'
          }
        },
        'floorProvider': 'PubXFloorProvider',
        'isWinningBid': true,
        'mediaType': 'banner',
        'netRevenue': true,
        'placementId': 13144370,
        'renderedSize': '300x250',
        'renderStatus': 4,
        'responseTimestamp': 1616654313071,
        'requestTimestamp': 1616654312804,
        'status': 'rendered',
        'statusMessage': 'Bid available',
        'timeToRespond': 267
      },
      'pageDetail': {
        'host': location.host,
        'path': location.pathname,
        'search': location.search
      },
      'deviceDetail': {
        'platform': navigator.platform,
        'deviceType': getDeviceType(),
        'deviceOS': getOS(),
        'browser': getBrowser()
      },
      'initOptions': initOptions
    }

    adapterManager.registerAnalyticsAdapter({
      code: 'pubxai',
      adapter: pubxaiAnalyticsAdapter
    });

    beforeEach(function() {
      adapterManager.enableAnalytics({
        provider: 'pubxai',
        options: initOptions
      });
    });

    afterEach(function() {
      pubxaiAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', function() {
      // Step 1: Send auction init event
      events.emit(constants.EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);

      // Step 3: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, prebidEvent['bidResponse']);

      // Step 4: Send bid time out event
      events.emit(constants.EVENTS.BID_TIMEOUT, prebidEvent['bidTimeout']);

      // Step 5: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      expect(server.requests.length).to.equal(1);

      let realAfterBid = JSON.parse(server.requests[0].requestBody);

      expect(realAfterBid).to.deep.equal(expectedAfterBid);

      // Step 6: Send auction bid won event
      events.emit(constants.EVENTS.BID_WON, prebidEvent['bidWon']);

      expect(server.requests.length).to.equal(2);

      let winEventData = JSON.parse(server.requests[1].requestBody);

      expect(winEventData).to.deep.equal(expectedAfterBidWon);
    });
  });
});
