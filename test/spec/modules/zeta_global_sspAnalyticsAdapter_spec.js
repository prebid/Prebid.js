import zetaAnalyticsAdapter from 'modules/zeta_global_sspAnalyticsAdapter.js';
import {config} from 'src/config';
import {EVENTS} from 'src/constants.js';
import {server} from '../../mocks/xhr.js';
import {logError} from '../../../src/utils';

let utils = require('src/utils');
let events = require('src/events');

const SAMPLE_EVENTS = {
  AUCTION_END: {
    'auctionId': '75e394d9',
    'timestamp': 1638441234544,
    'auctionEnd': 1638441234784,
    'auctionStatus': 'completed',
    'metrics': {
      'someMetric': 1
    },
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
        'transactionId': '6b29369c'
      }
    ],
    'adUnitCodes': [
      '/19968336/header-bid-tag-0'
    ],
    'bidderRequests': [
      {
        'bidderCode': 'zeta_global_ssp',
        'auctionId': '75e394d9',
        'bidderRequestId': '1207cb49191887',
        'bids': [
          {
            'bidder': 'zeta_global_ssp',
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
            'transactionId': '6b29369c',
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
        'auctionStart': 1638441234544,
        'timeout': 400,
        'refererInfo': {
          'page': 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
          'domain': 'test-zeta-ssp.net:63342',
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
        'auctionId': '75e394d9',
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
            'transactionId': '6b29369c',
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
        'auctionStart': 1638441234544,
        'timeout': 400,
        'refererInfo': {
          'page': 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
          'domain': 'test-zeta-ssp.net:63342',
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
        'transactionId': '6b29369c',
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
        'auctionId': '75e394d9',
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
            'example.adomain'
          ]
        },
        'originalCpm': 2.258302852806723,
        'originalCurrency': 'USD',
        'auctionId': '75e394d9',
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
          'hb_adomain': 'example.adomain'
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
        'host': 'test-zeta-ssp.net',
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
      'metrics': {
        'someMetric': 0
      },
      'ttl': 200,
      'creativeId': '456456456',
      'netRevenue': true,
      'meta': {
        'advertiserDomains': [
          'example.adomain'
        ]
      },
      'originalCpm': 2.258302852806723,
      'originalCurrency': 'USD',
      'auctionId': '75e394d9',
      'responseTimestamp': 1638441234670,
      'requestTimestamp': 1638441234547,
      'bidder': 'zeta_global_ssp',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 123,
      'size': '480x320',
      'adserverTargeting': {
        'hb_bidder': 'zeta_global_ssp',
        'hb_adid': '5759bb3ef7be1e8',
        'hb_pb': '2.20',
        'hb_size': '480x320',
        'hb_source': 'client',
        'hb_format': 'banner',
        'hb_adomain': 'example.adomain'
      },
      'status': 'rendered',
      'params': [
        {
          'nonZetaParam': 'nonZetaValue'
        }
      ]
    },
    'adId': '5759bb3ef7be1e8'
  }
}

describe('Zeta Global SSP Analytics Adapter', function () {
  let sandbox;
  let requests;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    requests = server.requests;
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

  describe('handle events', function () {
    beforeEach(function () {
      zetaAnalyticsAdapter.enableAnalytics({
        options: {
          sid: 111,
          tags: {
            position: 'top',
            shortname: 'name'
          }
        }
      });
    });

    afterEach(function () {
      zetaAnalyticsAdapter.disableAnalytics();
    });

    it('Handle events', function () {
      this.timeout(3000);

      events.emit(EVENTS.AUCTION_END, SAMPLE_EVENTS.AUCTION_END);
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, SAMPLE_EVENTS.AD_RENDER_SUCCEEDED);

      expect(requests.length).to.equal(2);
      const auctionEnd = JSON.parse(requests[0].requestBody);
      expect(auctionEnd).to.be.deep.equal({
        zetaParams: {sid: 111, tags: {position: 'top', shortname: 'name'}},
        bidderRequests: [{
          bidderCode: 'zeta_global_ssp',
          domain: 'test-zeta-ssp.net:63342',
          page: 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
          bids: [{
            bidId: '206be9a13236af',
            auctionId: '75e394d9',
            bidder: 'zeta_global_ssp',
            mediaType: 'BANNER',
            size: '300x250',
            device: {
              mobile: 1
            }
          }]
        }, {
          bidderCode: 'appnexus',
          domain: 'test-zeta-ssp.net:63342',
          page: 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
          bids: [{
            bidId: '41badc0e164c758',
            auctionId: '75e394d9',
            bidder: 'appnexus',
            mediaType: 'BANNER',
            size: '300x250',
            device: {
              mobile: 1
            }
          }]
        }],
        bidsReceived: [{
          adId: '5759bb3ef7be1e8',
          requestId: '206be9a13236af',
          creativeId: '456456456',
          bidder: 'zeta_global_ssp',
          mediaType: 'banner',
          size: '480x320',
          adomain: 'example.adomain',
          timeToRespond: 123,
          cpm: 2.258302852806723
        }]
      });
      const auctionSucceeded = JSON.parse(requests[1].requestBody);
      expect(auctionSucceeded.zetaParams).to.be.deep.equal({
        sid: 111,
        tags: {
          position: 'top',
          shortname: 'name'
        }
      });
      expect(auctionSucceeded.domain).to.eql('test-zeta-ssp.net');
      expect(auctionSucceeded.page).to.eql('test-zeta-ssp.net/zeta-ssp/ssp/_dev/examples/page_banner.html');
      expect(auctionSucceeded.bid).to.be.deep.equal({
        adId: '5759bb3ef7be1e8',
        requestId: '206be9a13236af',
        auctionId: '75e394d9',
        creativeId: '456456456',
        bidder: 'zeta_global_ssp',
        mediaType: 'banner',
        size: '480x320',
        adomain: 'example.adomain',
        timeToRespond: 123,
        cpm: 2.258302852806723
      });
      expect(auctionSucceeded.device.ua).to.not.be.empty;
    });
  });
});
