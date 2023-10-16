import zetaAnalyticsAdapter from 'modules/zeta_global_sspAnalyticsAdapter.js';
import {config} from 'src/config';
import CONSTANTS from 'src/constants.json';
import {logError} from '../../../src/utils';

let utils = require('src/utils');
let events = require('src/events');

const MOCK = {
  STUB: {
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
  },
  AUCTION_END: {
    'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
    'timestamp': 1638441234544,
    'auctionEnd': 1638441234784,
    'auctionStatus': 'completed',
    'adUnits': [
      {
        'code': '/19968336/header-bid-tag-0',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ]
          }
        },
        'bids': [
          {
            'bidder': 'zeta_global_ssp',
            'params': {
              'sid': 111,
              'tags': {
                'shortname': 'prebid_analytics_event_test_shortname',
                'position': 'test_position'
              }
            }
          },
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 13232385
            }
          }
        ],
        'sizes': [
          [
            300,
            250
          ],
          [
            300,
            600
          ]
        ],
        'transactionId': '6b29369c-0c2e-414e-be1f-5867aec18d83'
      }
    ],
    'adUnitCodes': [
      '/19968336/header-bid-tag-0'
    ],
    'bidderRequests': [
      {
        'bidderCode': 'zeta_global_ssp',
        'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
        'bidderRequestId': '1207cb49191887',
        'bids': [
          {
            'bidder': 'zeta_global_ssp',
            'params': {
              'sid': 111,
              'tags': {
                'shortname': 'prebid_analytics_event_test_shortname',
                'position': 'test_position'
              }
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    300,
                    250
                  ],
                  [
                    300,
                    600
                  ]
                ]
              }
            },
            'adUnitCode': '/19968336/header-bid-tag-0',
            'transactionId': '6b29369c-0c2e-414e-be1f-5867aec18d83',
            'sizes': [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ],
            'bidId': '206be9a13236af',
            'bidderRequestId': '1207cb49191887',
            'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1638441234544,
        'timeout': 400,
        'refererInfo': {
          'referer': 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html'
          ],
          'canonicalUrl': null
        },
        'start': 1638441234547
      },
      {
        'bidderCode': 'appnexus',
        'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
        'bidderRequestId': '32b97f0a935422',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 13232385
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    300,
                    250
                  ],
                  [
                    300,
                    600
                  ]
                ]
              }
            },
            'adUnitCode': '/19968336/header-bid-tag-0',
            'transactionId': '6b29369c-0c2e-414e-be1f-5867aec18d83',
            'sizes': [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ],
            'bidId': '41badc0e164c758',
            'bidderRequestId': '32b97f0a935422',
            'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1638441234544,
        'timeout': 400,
        'refererInfo': {
          'referer': 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html'
          ],
          'canonicalUrl': null
        },
        'start': 1638441234550
      }
    ],
    'noBids': [
      {
        'bidder': 'appnexus',
        'params': {
          'placementId': 13232385
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ]
          }
        },
        'adUnitCode': '/19968336/header-bid-tag-0',
        'transactionId': '6b29369c-0c2e-414e-be1f-5867aec18d83',
        'sizes': [
          [
            300,
            250
          ],
          [
            300,
            600
          ]
        ],
        'bidId': '41badc0e164c758',
        'bidderRequestId': '32b97f0a935422',
        'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
        'src': 'client',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      }
    ],
    'bidsReceived': [
      {
        'bidderCode': 'zeta_global_ssp',
        'width': 480,
        'height': 320,
        'statusMessage': 'Bid available',
        'adId': '5759bb3ef7be1e8',
        'requestId': '206be9a13236af',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 2.258302852806723,
        'currency': 'USD',
        'ad': 'test_ad',
        'ttl': 200,
        'creativeId': '456456456',
        'netRevenue': true,
        'meta': {
          'advertiserDomains': [
            'viaplay.fi'
          ]
        },
        'originalCpm': 2.258302852806723,
        'originalCurrency': 'USD',
        'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
        'responseTimestamp': 1638441234670,
        'requestTimestamp': 1638441234547,
        'bidder': 'zeta_global_ssp',
        'adUnitCode': '/19968336/header-bid-tag-0',
        'timeToRespond': 123,
        'pbLg': '2.00',
        'pbMg': '2.20',
        'pbHg': '2.25',
        'pbAg': '2.25',
        'pbDg': '2.25',
        'pbCg': '',
        'size': '480x320',
        'adserverTargeting': {
          'hb_bidder': 'zeta_global_ssp',
          'hb_adid': '5759bb3ef7be1e8',
          'hb_pb': '2.20',
          'hb_size': '480x320',
          'hb_source': 'client',
          'hb_format': 'banner',
          'hb_adomain': 'viaplay.fi'
        }
      }
    ],
    'winningBids': [],
    'timeout': 400
  },
  AD_RENDER_SUCCEEDED: {
    'doc': {
      'location': {
        'href': 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
        'protocol': 'http:',
        'host': 'localhost:63342',
        'hostname': 'localhost',
        'port': '63342',
        'pathname': '/zeta-ssp/ssp/_dev/examples/page_banner.html',
        'hash': '',
        'origin': 'http://test-zeta-ssp.net:63342',
        'ancestorOrigins': {
          '0': 'http://test-zeta-ssp.net:63342'
        }
      }
    },
    'bid': {
      'bidderCode': 'zeta_global_ssp',
      'width': 480,
      'height': 320,
      'statusMessage': 'Bid available',
      'adId': '5759bb3ef7be1e8',
      'requestId': '206be9a13236af',
      'mediaType': 'banner',
      'source': 'client',
      'cpm': 2.258302852806723,
      'currency': 'USD',
      'ad': 'test_ad',
      'ttl': 200,
      'creativeId': '456456456',
      'netRevenue': true,
      'meta': {
        'advertiserDomains': [
          'viaplay.fi'
        ]
      },
      'originalCpm': 2.258302852806723,
      'originalCurrency': 'USD',
      'auctionId': '75e394d9-ccce-4978-9238-91e6a1ac88a1',
      'responseTimestamp': 1638441234670,
      'requestTimestamp': 1638441234547,
      'bidder': 'zeta_global_ssp',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 123,
      'pbLg': '2.00',
      'pbMg': '2.20',
      'pbHg': '2.25',
      'pbAg': '2.25',
      'pbDg': '2.25',
      'pbCg': '',
      'size': '480x320',
      'adserverTargeting': {
        'hb_bidder': 'zeta_global_ssp',
        'hb_adid': '5759bb3ef7be1e8',
        'hb_pb': '2.20',
        'hb_size': '480x320',
        'hb_source': 'client',
        'hb_format': 'banner',
        'hb_adomain': 'viaplay.fi'
      },
      'status': 'rendered',
      'params': [
        {
          'sid': 111,
          'tags': {
            'shortname': 'prebid_analytics_event_test_shortname',
            'position': 'test_position'
          }
        }
      ]
    },
    'adId': '5759bb3ef7be1e8'
  }
}

describe('Zeta Global SSP Analytics Adapter', function() {
  let sandbox;
  let xhr;
  let requests;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    requests = [];
    xhr = sandbox.useFakeXMLHttpRequest();
    xhr.onCreate = request => requests.push(request);
    sandbox.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  it('should require publisherId', function () {
    sandbox.stub(utils, 'logError');
    zetaAnalyticsAdapter.enableAnalytics({
      options: {}
    });
    expect(utils.logError.called).to.equal(true);
  });

  describe('handle events', function() {
    beforeEach(function() {
      zetaAnalyticsAdapter.enableAnalytics({
        options: {
          sid: 111
        }
      });
    });

    afterEach(function () {
      zetaAnalyticsAdapter.disableAnalytics();
    });

    it('events are sent', function() {
      this.timeout(5000);
      events.emit(CONSTANTS.EVENTS.AUCTION_INIT, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.AUCTION_END, MOCK.AUCTION_END);
      events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BID_RESPONSE, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.NO_BID, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BID_WON, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BIDDER_DONE, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BIDDER_ERROR, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.SET_TARGETING, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BEFORE_REQUEST_BIDS, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BEFORE_BIDDER_HTTP, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.REQUEST_BIDS, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.ADD_AD_UNITS, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.AD_RENDER_FAILED, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED, MOCK.AD_RENDER_SUCCEEDED);
      events.emit(CONSTANTS.EVENTS.TCF2_ENFORCEMENT, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.AUCTION_DEBUG, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.BID_VIEWABLE, MOCK.STUB);
      events.emit(CONSTANTS.EVENTS.STALE_RENDER, MOCK.STUB);

      expect(requests.length).to.equal(2);
      expect(JSON.parse(requests[0].requestBody)).to.deep.equal(MOCK.AUCTION_END);
      expect(JSON.parse(requests[1].requestBody)).to.deep.equal(MOCK.AD_RENDER_SUCCEEDED);
    });
  });
});
