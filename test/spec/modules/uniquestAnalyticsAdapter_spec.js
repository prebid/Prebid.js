import uniquestAnalyticsAdapter from 'modules/uniquestAnalyticsAdapter.js';
import {config} from 'src/config';
import {EVENTS} from 'src/constants.js';
import {server} from '../../mocks/xhr.js';

const events = require('src/events');

const SAMPLE_EVENTS = {
  AUCTION_END: {
    'auctionId': 'uniq1234',
    'timestamp': 1733709113000,
    'auctionEnd': 1733709113500,
    'auctionStatus': 'completed',
    'metrics': {
      'someMetric': 1
    },
    'adUnits': [
      {
        'code': '/12345678910/uniquest_1',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                1,
                1
              ],
              [
                300,
                300
              ],
              [
                300,
                250
              ]
            ]
          }
        },
        'bids': [
          {
            'bidder': 'uniquest',
            'params': {
              'sid': '3pwnAHWX'
            }
          },
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 12345678
            }
          }
        ],
        'sizes': [
          [
            1,
            1
          ],
          [
            300,
            300
          ],
          [
            300,
            250
          ]
        ],
        'transactionId': '12345678'
      }
    ],
    'adUnitCodes': [
      '/12345678910/uniquest_1'
    ],
    'bidderRequests': [
      {
        'auctionId': '75e394d9',
        'auctionStart': 1733709113010,
        'bidderCode': 'uniquest',
        'bidderRequestId': '1207cb49191887',
        'bids': [
          {
            'adUnitCode': '/12345678910/uniquest_1',
            'auctionId': '75e394d9',
            'bidId': '206be9a13236af',
            'bidderRequestId': '1207cb49191887',
            'bidder': 'uniquest',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0,
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    1,
                    1
                  ],
                  [
                    300,
                    300
                  ],
                  [
                    300,
                    250
                  ]
                ]
              }
            },

            'transactionId': '6b29369c',
            'sizes': [
              [
                1,
                1
              ],
              [
                300,
                300
              ],
              [
                300,
                250
              ]
            ],
            'src': 'client',
          }
        ],
        'timeout': 400,
        'refererInfo': {
          'page': 'http://test-pb.ust-ad.com/banner.html',
          'domain': 'test-pb.ust-ad.com',
          'referer': 'http://test-pb.ust-ad.com/banner.html',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'http://test-pb.ust-ad.com/banner.html'
          ],
          'canonicalUrl': null
        },
        'start': 1733709113020
      },
      {
        'bidderCode': 'appnexus',
        'auctionId': '75e394d9',
        'bidderRequestId': '32b97f0a935422',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 12345678
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    1,
                    1
                  ],
                  [
                    300,
                    300
                  ],
                  [
                    300,
                    250
                  ]
                ]
              }
            },
            'adUnitCode': '/12345678910/uniquest_1',
            'transactionId': '6b29369c',
            'sizes': [
              [
                1,
                1
              ],
              [
                300,
                300
              ],
              [
                300,
                250
              ]
            ],
            'bidId': '41badc0e164c758',
            'bidderRequestId': '32b97f0a935422',
            'auctionId': '75e394d9',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0,
            'ortb2': {
              'device': {
                'mobile': 1
              }
            }
          }
        ],
        'auctionStart': 1733709113010,
        'timeout': 400,
        'refererInfo': {
          'page': 'http://test-pb.ust-ad.com/banner.html',
          'domain': 'test-memo.wakaue.info',
          'referer': 'http://test-pb.ust-ad.com/banner.html',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'http://test-pb.ust-ad.com/banner.html'
          ],
          'canonicalUrl': null
        },
        'start': 1733709113020
      }
    ],
    'noBids': [
      {
        'bidder': 'appnexus',
        'params': {
          'placementId': 12345678
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                1,
                1
              ],
              [
                300,
                300
              ],
              [
                300,
                250
              ]
            ]
          }
        },
        'adUnitCode': '/12345678910/uniquest_1',
        'transactionId': '6b29369c',
        'sizes': [
          [
            1,
            1
          ],
          [
            300,
            300
          ],
          [
            300,
            250
          ]
        ],
        'bidId': '41badc0e164c758',
        'bidderRequestId': '32b97f0a935422',
        'auctionId': '75e394d9',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }
    ],
    'bidsReceived': [
      {
        'bidderCode': 'uniquest',
        'width': 300,
        'height': 300,
        'statusMessage': 'Bid available',
        'adId': '53c5a9c1947c57',
        'requestId': '4d9eec3fe27a43',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 2.73,
        'currency': 'JPY',
        'ad': '<script async src="https://ad.stg.ust-ad.com/scripts/pbad.js?sid=3pwnAHWX" id="uniquest"></script> <div class="uniquest-slot-pb" data-id="3pwnAHWX" bid-id="7806bcbb-a156-4ec4-872b-bd0d8e8bff34" style="display:none"></div>',
        'ttl': 300,
        'creativeId': '7806bcbb-a156-4ec4-872b-bd0d8e8bff34',
        'netRevenue': true,
        'meta': {
          'advertiserDomains': [
            'test-pb.ust-ad.com'
          ]
        },
        'originalCpm': 2.73,
        'originalCurrency': 'JPY',
        'auctionId': '75e394d9',
        'responseTimestamp': 1733709113100,
        'requestTimestamp': 1733709113000,
        'bidder': 'uniquest',
        'adUnitCode': '/12345678910/uniquest_1',
        'timeToRespond': 100,
        'pbLg': '2.50',
        'pbMg': '2.70',
        'pbHg': '2.73',
        'pbAg': '2.70',
        'pbDg': '2.73',
        'pbCg': '',
        'size': '300x250',
        'adserverTargeting': {
          'hb_bidder': 'uniquest',
          'hb_adid': '53c5a9c1947c57',
          'hb_pb': '2.70',
          'hb_size': '300x300',
          'hb_source': 'client',
          'hb_format': 'banner',
          'hb_adomain': 'test-pb.ust-ad.com'
        }
      }
    ],
    'winningBids': [],
    'timeout': 400
  },
  AD_RENDER_SUCCEEDED: {
    'doc': {
      'location': {
        'href': 'http://test-pb.ust-ad.com/banner.html',
        'protocol': 'http:',
        'host': 'test-pb.ust-ad.com',
        'hostname': 'localhost',
        'port': '80',
        'pathname': '/page_banner.html',
        'hash': '',
        'origin': 'http://test-pb.ust-ad.com',
        'ancestorOrigins': {
          '0': 'http://test-pb.ust-ad.com'
        }
      }
    },
    'bid': {
      'bidderCode': 'uniquest',
      'width': 300,
      'height': 300,
      'statusMessage': 'Bid available',
      'adId': '53c5a9c1947c57',
      'requestId': '4d9eec3fe27a43',
      'mediaType': 'banner',
      'source': 'client',
      'cpm': '2.73',
      'currency': 'JPY',
      'ad': 'test_ad',
      'metrics': {
        'someMetric': 0
      },
      'ttl': 300,
      'creativeId': '7806bcbb-a156-4ec4-872b-bd0d8e8bff34',
      'netRevenue': true,
      'meta': {
        'advertiserDomains': [
          'test-pb.ust-ad.com'
        ]
      },
      'originalCpm': 2.73,
      'originalCurrency': 'JPY',
      'auctionId': '75e394d9',
      'responseTimestamp': 1733709113100,
      'requestTimestamp': 1733709113000,
      'bidder': 'uniquest',
      'adUnitCode': '12345678910/uniquest_1',
      'timeToRespond': 100,
      'size': '300x300',
      'adserverTargeting': {
        'hb_bidder': 'uniquest',
        'hb_adid': '53c5a9c1947c57',
        'hb_pb': '2.70',
        'hb_size': '300x300',
        'hb_source': 'client',
        'hb_format': 'banner',
        'hb_adomain': 'test-pb.ust-ad.com'
      },
      'status': 'rendered',
      'params': [
        {
          'nonZetaParam': 'nonZetaValue'
        }
      ]
    }
  }
}

describe('Uniquest Analytics Adapter', function () {
  let sandbox;
  let requests;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    requests = server.requests;
    sandbox.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('handle events', function () {
    beforeEach(function () {
      uniquestAnalyticsAdapter.enableAnalytics({
        options: {
          sid: 'ABCDE123',
        }
      });
    });

    afterEach(function () {
      uniquestAnalyticsAdapter.disableAnalytics();
    });

    it('Handle events', function () {
      this.timeout(1000);

      events.emit(EVENTS.AUCTION_END, SAMPLE_EVENTS.AUCTION_END);
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, SAMPLE_EVENTS.AD_RENDER_SUCCEEDED);

      // bids count
      expect(requests.length).to.equal(2);
      const auctionEnd = JSON.parse(requests[0].requestBody);
      // event_type
      expect(auctionEnd.event_type).to.eql(EVENTS.AUCTION_END);
      // URL
      expect(auctionEnd.url).to.eql(window.top.location.href);
      // bid
      expect(auctionEnd.bids).to.be.deep.equal([{
        auction_id: '75e394d9',
        creative_id: '7806bcbb-a156-4ec4-872b-bd0d8e8bff34',
        bidder: 'uniquest',
        media_type: 'banner',
        size: '300x250',
        cpm: '2.73',
        currency: 'JPY',
        original_cpm: '2.73',
        original_currency: 'JPY',
        hb_pb: '2.70',
        bidding_time: 100,
        ad_unit_code: '/12345678910/uniquest_1',
      }]
      );

      const auctionSucceeded = JSON.parse(requests[1].requestBody);
      // event_type
      expect(auctionSucceeded.event_type).to.eql(EVENTS.AD_RENDER_SUCCEEDED);
      // URL
      expect(auctionSucceeded.url).to.eql(window.top.location.href);
      // bid
      expect(auctionSucceeded.bid).to.be.deep.equal({
        auction_id: '75e394d9',
        creative_id: '7806bcbb-a156-4ec4-872b-bd0d8e8bff34',
        bidder: 'uniquest',
        media_type: 'banner',
        size: '300x300',
        cpm: '2.73',
        currency: 'JPY',
        original_cpm: '2.73',
        original_currency: 'JPY',
        hb_pb: '2.70',
        bidding_time: 100,
        ad_unit_code: '12345678910/uniquest_1'
      });
    });
  });
});
