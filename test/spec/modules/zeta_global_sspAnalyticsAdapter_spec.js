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
  },
  BID_TIMEOUT: [
    {
      'bidder': 'zeta_global_ssp',
      'params': [
        {
          'tags': {
            'position': 'top',
            'shortname': 'someShortName',
          },
          'sid': 100
        }
      ],
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
      'adUnitCode': 'ad-1',
      'transactionId': '6d2c4757-d34b-4538-b812-c6e638f05eac',
      'adUnitId': '9dc8cbf6-9b2d-48c7-b424-be9ae4be3dfc',
      'sizes': [
        [
          300,
          250
        ]
      ],
      'bidId': '27c8c05823e2f',
      'bidderRequestId': '1e8e895de1708',
      'auctionId': 'fa9ef841-bcb9-401f-96ad-03a94ac64e63',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0,
      'ortb2': {
        'site': {
          'domain': 'zetaglobal.com',
          'publisher': {
            'domain': 'zetaglobal.com'
          },
          'page': 'https://zetaglobal.com/page'
        },
        'device': {
          'w': 807,
          'h': 847,
          'dnt': 0,
          'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'language': 'en',
          'sua': {
            'source': 1,
            'platform': {
              'brand': 'macOS'
            },
            'browsers': [
              {
                'brand': 'Google Chrome',
                'version': [
                  '123'
                ]
              },
              {
                'brand': 'Not:A-Brand',
                'version': [
                  '8'
                ]
              },
              {
                'brand': 'Chromium',
                'version': [
                  '123'
                ]
              }
            ],
            'mobile': 0
          }
        }
      },
      'timeout': 3
    },
    {
      'bidder': 'zeta_global_ssp',
      'params': [
        {
          'tags': {
            'position': 'top',
            'shortname': 'someShortName',
          },
          'sid': 100
        }
      ],
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
      'adUnitCode': 'ad-2',
      'transactionId': '11eaa59f-221d-4027-a0a8-7841e0ffc4ee',
      'adUnitId': '4397b4bc-6368-40b8-91f1-987a31076886',
      'sizes': [
        [
          300,
          250
        ]
      ],
      'bidId': '31a3b551cbf1ed',
      'bidderRequestId': '1e8e895de1708',
      'auctionId': 'fa9ef841-bcb9-401f-96ad-03a94ac64e63',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0,
      'ortb2': {
        'site': {
          'domain': 'zetaglobal.com',
          'publisher': {
            'domain': 'zetaglobal.com'
          },
          'page': 'https://zetaglobal.com/page'
        },
        'device': {
          'w': 807,
          'h': 847,
          'dnt': 0,
          'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'language': 'en',
          'sua': {
            'source': 1,
            'platform': {
              'brand': 'macOS'
            },
            'browsers': [
              {
                'brand': 'Google Chrome',
                'version': [
                  '123'
                ]
              },
              {
                'brand': 'Not:A-Brand',
                'version': [
                  '8'
                ]
              },
              {
                'brand': 'Chromium',
                'version': [
                  '123'
                ]
              }
            ],
            'mobile': 0
          }
        }
      },
      'timeout': 3
    }
  ]
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
      events.emit(EVENTS.BID_TIMEOUT, SAMPLE_EVENTS.BID_TIMEOUT);

      expect(requests.length).to.equal(3);
      const auctionEnd = JSON.parse(requests[0].requestBody);
      expect(auctionEnd).to.be.deep.equal({
        zetaParams: {sid: 111, tags: {position: 'top', shortname: 'name'}},
        bidderRequests: [{
          bidderCode: 'zeta_global_ssp',
          domain: 'test-zeta-ssp.net:63342',
          page: 'http://test-zeta-ssp.net:63342/zeta-ssp/ssp/_dev/examples/page_banner.html',
          bids: [{
            adUnitCode: '/19968336/header-bid-tag-0',
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
            adUnitCode: '/19968336/header-bid-tag-0',
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
          adUnitCode: '/19968336/header-bid-tag-0',
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
        adUnitCode: '/19968336/header-bid-tag-0',
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

      const bidTimeout = JSON.parse(requests[2].requestBody);
      expect(bidTimeout.zetaParams).to.be.deep.equal({
        sid: 111,
        tags: {
          position: 'top',
          shortname: 'name'
        }
      });
      expect(bidTimeout.domain).to.eql('zetaglobal.com');
      expect(bidTimeout.page).to.eql('https://zetaglobal.com/page');
      expect(bidTimeout.timeouts).to.be.deep.equal([{
        'bidId': '27c8c05823e2f',
        'auctionId': 'fa9ef841-bcb9-401f-96ad-03a94ac64e63',
        'bidder': 'zeta_global_ssp',
        'mediaType': 'BANNER',
        'size': '300x250',
        'timeout': 3,
        'device': {
          'w': 807,
          'h': 847,
          'dnt': 0,
          'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'language': 'en',
          'sua': {
            'source': 1,
            'platform': {'brand': 'macOS'},
            'browsers': [{'brand': 'Google Chrome', 'version': ['123']}, {
              'brand': 'Not:A-Brand',
              'version': ['8']
            }, {'brand': 'Chromium', 'version': ['123']}],
            'mobile': 0
          }
        },
        'adUnitCode': 'ad-1'
      }, {
        'bidId': '31a3b551cbf1ed',
        'auctionId': 'fa9ef841-bcb9-401f-96ad-03a94ac64e63',
        'bidder': 'zeta_global_ssp',
        'mediaType': 'BANNER',
        'size': '300x250',
        'timeout': 3,
        'device': {
          'w': 807,
          'h': 847,
          'dnt': 0,
          'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'language': 'en',
          'sua': {
            'source': 1,
            'platform': {'brand': 'macOS'},
            'browsers': [{'brand': 'Google Chrome', 'version': ['123']}, {
              'brand': 'Not:A-Brand',
              'version': ['8']
            }, {'brand': 'Chromium', 'version': ['123']}],
            'mobile': 0
          }
        },
        'adUnitCode': 'ad-2'
      }]);
    });
  });
});
