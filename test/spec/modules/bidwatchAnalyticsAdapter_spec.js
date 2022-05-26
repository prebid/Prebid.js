import bidwatchAnalytics from 'modules/bidwatchAnalyticsAdapter.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
let adapterManager = require('src/adapterManager').default;
let events = require('src/events');
let constants = require('src/constants.json');

describe('BidWatch Analytics', function () {
  let timestamp = new Date() - 256;
  let auctionId = '5018eb39-f900-4370-b71e-3bb5b48d324f';
  let timeout = 1500;

  let bidTimeout = [
    {
      'bidId': '5fe418f2d70364',
      'bidder': 'appnexusAst',
      'adUnitCode': 'tag_200124_banner',
      'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b'
    }
  ];

  const auctionEnd = {
    'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
    'timestamp': 1647424261187,
    'auctionEnd': 1647424261714,
    'auctionStatus': 'completed',
    'adUnits': [
      {
        'code': 'tag_200124_banner',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                600
              ]
            ]
          }
        },
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 123456
            }
          },
          {
            'bidder': 'appnexusAst',
            'params': {
              'placementId': 234567
            }
          }
        ],
        'sizes': [
          [
            300,
            600
          ]
        ],
        'transactionId': 'de664ccb-e18b-4436-aeb0-362382eb1b40'
      }
    ],
    'adUnitCodes': [
      'tag_200124_banner'
    ],
    'bidderRequests': [
      {
        'bidderCode': 'appnexus',
        'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
        'bidderRequestId': '11dc6ff6378de7',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 123456
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    300,
                    600
                  ]
                ]
              }
            },
            'adUnitCode': 'tag_200124_banner',
            'transactionId': 'de664ccb-e18b-4436-aeb0-362382eb1b40',
            'sizes': [
              [
                300,
                600
              ]
            ],
            'bidId': '34a63e5d5378a3',
            'bidderRequestId': '11dc6ff6378de7',
            'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1647424261187,
        'timeout': 1000,
        'gdprConsent': {
          'consentString': 'CONSENT',
          'gdprApplies': true,
          'apiVersion': 2
        },
        'start': 1647424261189
      },
    ],
    'noBids': [
      {
        'bidder': 'appnexusAst',
        'params': {
          'placementId': 10471298
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                600
              ]
            ]
          }
        },
        'adUnitCode': 'tag_200124_banner',
        'transactionId': 'de664ccb-e18b-4436-aeb0-362382eb1b40',
        'sizes': [
          [
            300,
            600
          ]
        ],
        'bidId': '5fe418f2d70364',
        'bidderRequestId': '4229a45ab8ea87',
        'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }
    ],
    'bidsReceived': [
      {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 600,
        'statusMessage': 'Bid available',
        'adId': '7a4ced80f33d33',
        'requestId': '34a63e5d5378a3',
        'transactionId': 'de664ccb-e18b-4436-aeb0-362382eb1b40',
        'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 27.4276,
        'creativeId': '158534630',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 2000,
        'ad': 'some html',
        'meta': {
          'advertiserDomains': [
            'example.com'
          ]
        },
        'originalCpm': 25.02521,
        'originalCurrency': 'EUR',
        'responseTimestamp': 1647424261559,
        'requestTimestamp': 1647424261189,
        'bidder': 'appnexus',
        'adUnitCode': 'tag_200124_banner',
        'timeToRespond': 370,
        'pbLg': '5.00',
        'pbMg': '20.00',
        'pbHg': '20.00',
        'pbAg': '20.00',
        'pbDg': '20.00',
        'pbCg': '20.000000',
        'size': '300x600',
        'adserverTargeting': {
          'hb_bidder': 'appnexus',
          'hb_adid': '7a4ced80f33d33',
          'hb_pb': '20.000000',
          'hb_size': '300x600',
          'hb_source': 'client',
          'hb_format': 'banner',
          'hb_adomain': 'example.com'
        }
      }
    ],
    'winningBids': [

    ],
    'timeout': 1000
  };

  let bidWon = {
    'bidderCode': 'appnexus',
    'width': 970,
    'height': 250,
    'statusMessage': 'Bid available',
    'adId': '65d16ef039a97a',
    'requestId': '2bd3e8ff8a113f',
    'transactionId': '8b2a8629-d1ea-4bb1-aff0-e335b96dd002',
    'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
    'mediaType': 'banner',
    'source': 'client',
    'cpm': 27.4276,
    'creativeId': '158533702',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 2000,
    'ad': 'some html',
    'meta': {
      'advertiserDomains': [
        'example.com'
      ]
    },
    'originalCpm': 25.02521,
    'originalCurrency': 'EUR',
    'responseTimestamp': 1647424261558,
    'requestTimestamp': 1647424261189,
    'bidder': 'appnexus',
    'adUnitCode': 'tag_200123_banner',
    'timeToRespond': 369,
    'originalBidder': 'appnexus',
    'pbLg': '5.00',
    'pbMg': '20.00',
    'pbHg': '20.00',
    'pbAg': '20.00',
    'pbDg': '20.00',
    'pbCg': '20.000000',
    'size': '970x250',
    'adserverTargeting': {
      'hb_bidder': 'appnexus',
      'hb_adid': '65d16ef039a97a',
      'hb_pb': '20.000000',
      'hb_size': '970x250',
      'hb_source': 'client',
      'hb_format': 'banner',
      'hb_adomain': 'example.com'
    },
    'status': 'rendered',
    'params': [
      {
        'placementId': 123456
      }
    ]
  };

  after(function () {
    bidwatchAnalytics.disableAnalytics();
  });

  describe('main test flow', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      events.getEvents.restore();
    });

    it('should catch events of interest', function () {
      sinon.spy(bidwatchAnalytics, 'track');

      adapterManager.registerAnalyticsAdapter({
        code: 'bidwatch',
        adapter: bidwatchAnalytics
      });

      adapterManager.enableAnalytics({
        provider: 'bidwatch',
        options: {
          domain: 'test'
        }
      });
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);
      events.emit(constants.EVENTS.AUCTION_END, auctionEnd);
      events.emit(constants.EVENTS.BID_WON, bidWon);
      sinon.assert.callCount(bidwatchAnalytics.track, 3);
    });
  });
});
