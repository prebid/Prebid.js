import terceptAnalyticsAdapter from 'modules/terceptAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';

const events = require('src/events');

describe('tercept analytics adapter', function () {
  let clock;

  beforeEach(function () {
    // Freeze time at a fixed date/time
    clock = sinon.useFakeTimers(new Date('2025-07-25T12:00:00Z').getTime());
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    clock.restore();
    events.getEvents.restore();
  });

  describe('track', function () {
    const initOptions = {
      pubId: '1',
      pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
      hostName: 'us-central1-quikr-ebay.cloudfunctions.net',
      pathName: '/prebid-analytics'
    };

    const prebidEvent = {
      'addAdUnits': {},
      'requestBids': {},
      'auctionInit': {
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'timestamp': 1576823893836,
        'auctionStatus': 'inProgress',
        'adUnits': [
          {
            'code': 'div-gpt-ad-1460505748561-0',
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [300, 250],
                  [300, 600]
                ]
              }
            },
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                }
              }
            ],
            'sizes': [
              [300, 250],
              [300, 600]
            ],
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': {
                    'adslot': '/1234567/homepage-banner'
                  },
                  'pbadslot': 'homepage-banner-pbadslot'
                }
              }
            }
          }
        ],
        'adUnitCodes': ['div-gpt-ad-1460505748561-0'],
        'bidderRequests': [
          {
            'bidderCode': 'appnexus',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'bidderRequestId': '155975c76e13b1',
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [300, 250],
                      [300, 600]
                    ]
                  }
                },
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
                'sizes': [
                  [300, 250],
                  [300, 600]
                ],
                'bidId': '263efc09896d0c',
                'bidderRequestId': '155975c76e13b1',
                'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1576823893836,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
              'reachedTop': true,
              'numIframes': 0,
              'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
            },
            'start': 1576823893838
          },
          {
            'bidderCode': 'ix',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'bidderRequestId': '181df4d465699c',
            'bids': [
              {
                'bidder': 'ix',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [300, 250],
                      [300, 600]
                    ]
                  }
                },
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
                'sizes': [
                  [300, 250],
                  [300, 600]
                ],
                'bidId': '9424dea605368f',
                'bidderRequestId': '181df4d465699c',
                'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1576823893836,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
              'reachedTop': true,
              'numIframes': 0,
              'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
            },
            'start': 1576823893838
          }
        ],
        'noBids': [],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 1000
      },
      'bidRequested': {
        'bidderCode': 'appnexus',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'bidderRequestId': '155975c76e13b1',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 13144370
            },
            'crumbs': {
              'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [300, 250],
                  [300, 600]
                ]
              }
            },
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
            'sizes': [
              [300, 250],
              [300, 600]
            ],
            'bidId': '263efc09896d0c',
            'bidderRequestId': '155975c76e13b1',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1576823893836,
        'timeout': 1000,
        'refererInfo': {
          'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
          'reachedTop': true,
          'numIframes': 0,
          'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
        },
        'start': 1576823893838
      },
      'bidRequested2': {
        'bidderCode': 'ix',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'bidderRequestId': '181df4d465699c',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 13144370
            },
            'crumbs': {
              'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [300, 250],
                  [300, 600]
                ]
              }
            },
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'transactionId': 'd99d90e0-663a-459d-8c87-4c92ce6a527c',
            'sizes': [
              [300, 250],
              [300, 600]
            ],
            'bidId': '9424dea605368f',
            'bidderRequestId': '181df4d465699c',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1576823893836,
        'timeout': 1000,
        'refererInfo': {
          'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
          'reachedTop': true,
          'numIframes': 0,
          'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
        },
        'start': 1576823893838
      },
      'bidAdjustment': {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '393976d8770041',
        'requestId': '263efc09896d0c',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.5,
        'creativeId': 96846035,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'appnexus': {
          'buyerMemberId': 9325
        },
        'meta': {
          'advertiserId': 2529885
        },
        'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        'originalCpm': 0.5,
        'originalCurrency': 'USD',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'responseTimestamp': 1576823894050,
        'requestTimestamp': 1576823893838,
        'bidder': 'appnexus',
        'timeToRespond': 212
      },
      'noBid': {
        'bidder': 'ix',
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250],
              [300, 600]
            ]
          }
        },
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'transactionId': 'd99d90e0-663a-459d-8c87-4c92ce6a527c',
        'sizes': [[300, 250]],
        'bidId': '9424dea605368f',
        'bidderRequestId': '181df4d465699c',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'src': 's2s',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
      },
      'bidTimeout': [],
      'bidResponse': {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '393976d8770041',
        'requestId': '263efc09896d0c',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.5,
        'creativeId': 96846035,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'appnexus': {
          'buyerMemberId': 9325
        },
        'meta': {
          'advertiserId': 2529885
        },
        'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        'originalCpm': 0.5,
        'originalCurrency': 'USD',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'responseTimestamp': 1576823894050,
        'requestTimestamp': 1576823893838,
        'bidder': 'appnexus',
        'timeToRespond': 212,
        'pbLg': '0.50',
        'pbMg': '0.50',
        'pbHg': '0.50',
        'pbAg': '0.50',
        'pbDg': '0.50',
        'pbCg': '',
        'size': '300x250',
        'adserverTargeting': {
          'hb_bidder': 'appnexus',
          'hb_adid': '393976d8770041',
          'hb_pb': '0.50',
          'hb_size': '300x250',
          'hb_source': 'client',
          'hb_format': 'banner'
        }
      },
      'auctionEnd': {
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'timestamp': 1576823893836,
        'auctionEnd': 1576823894054,
        'auctionStatus': 'completed',
        'adUnits': [
          {
            'code': 'div-gpt-ad-1460505748561-0',
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [300, 250],
                  [300, 600]
                ]
              }
            },
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                }
              }
            ],
            'sizes': [
              [300, 250],
              [300, 600]
            ],
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': {
                    'adslot': '/1234567/homepage-banner'
                  },
                  'pbadslot': 'homepage-banner-pbadslot'
                }
              }
            }
          }
        ],
        'adUnitCodes': ['div-gpt-ad-1460505748561-0'],
        'bidderRequests': [
          {
            'bidderCode': 'appnexus',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'bidderRequestId': '155975c76e13b1',
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [300, 250],
                      [300, 600]
                    ]
                  }
                },
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
                'sizes': [
                  [300, 250],
                  [300, 600]
                ],
                'bidId': '263efc09896d0c',
                'bidderRequestId': '155975c76e13b1',
                'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1576823893836,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
              'reachedTop': true,
              'numIframes': 0,
              'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
            },
            'start': 1576823893838
          }
        ],
        'noBids': [],
        'bidsReceived': [
          {
            'bidderCode': 'appnexus',
            'width': 300,
            'height': 250,
            'statusMessage': 'Bid available',
            'adId': '393976d8770041',
            'requestId': '263efc09896d0c',
            'mediaType': 'banner',
            'source': 'client',
            'cpm': 0.5,
            'creativeId': 96846035,
            'currency': 'USD',
            'netRevenue': true,
            'ttl': 300,
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'appnexus': {
              'buyerMemberId': 9325
            },
            'meta': {
              'advertiserId': 2529885
            },
            'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
            'originalCpm': 0.5,
            'originalCurrency': 'USD',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'responseTimestamp': 1576823894050,
            'requestTimestamp': 1576823893838,
            'bidder': 'appnexus',
            'timeToRespond': 212,
            'pbLg': '0.50',
            'pbMg': '0.50',
            'pbHg': '0.50',
            'pbAg': '0.50',
            'pbDg': '0.50',
            'pbCg': '',
            'size': '300x250',
            'adserverTargeting': {
              'hb_bidder': 'appnexus',
              'hb_adid': '393976d8770041',
              'hb_pb': '0.50',
              'hb_size': '300x250',
              'hb_source': 'client',
              'hb_format': 'banner'
            }
          }
        ],
        'winningBids': [],
        'timeout': 1000
      },
      'setTargeting': {
        'div-gpt-ad-1460505748561-0': {
          'hb_format': 'banner',
          'hb_source': 'client',
          'hb_size': '300x250',
          'hb_pb': '0.50',
          'hb_adid': '393976d8770041',
          'hb_bidder': 'appnexus',
          'hb_format_appnexus': 'banner',
          'hb_source_appnexus': 'client',
          'hb_size_appnexus': '300x250',
          'hb_pb_appnexus': '0.50',
          'hb_adid_appnexus': '393976d8770041',
          'hb_bidder_appnexus': 'appnexus'
        }
      },
      'bidderDone': {
        'bidderCode': 'appnexus',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'bidderRequestId': '155975c76e13b1',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': 13144370
            },
            'crumbs': {
              'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [300, 250],
                  [300, 600]
                ]
              }
            },
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
            'sizes': [
              [300, 250],
              [300, 600]
            ],
            'bidId': '263efc09896d0c',
            'bidderRequestId': '155975c76e13b1',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1576823893836,
        'timeout': 1000,
        'refererInfo': {
          'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
          'reachedTop': true,
          'numIframes': 0,
          'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
        },
        'start': 1576823893838
      },
      'bidWon': {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '393976d8770041',
        'requestId': '263efc09896d0c',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.5,
        'creativeId': 96846035,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'appnexus': {
          'buyerMemberId': 9325
        },
        'meta': {
          'advertiserId': 2529885
        },
        'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        'originalCpm': 0.5,
        'originalCurrency': 'USD',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'responseTimestamp': 1576823894050,
        'requestTimestamp': 1576823893838,
        'bidder': 'appnexus',
        'timeToRespond': 212,
        'pbLg': '0.50',
        'pbMg': '0.50',
        'pbHg': '0.50',
        'pbAg': '0.50',
        'pbDg': '0.50',
        'pbCg': '',
        'size': '300x250',
        'adserverTargeting': {
          'hb_bidder': 'appnexus',
          'hb_adid': '393976d8770041',
          'hb_pb': '0.50',
          'hb_size': '300x250',
          'hb_source': 'client',
          'hb_format': 'banner'
        },
        'status': 'rendered',
        'params': [
          {
            'placementId': 13144370
          }
        ]
      }
    };

    const location = utils.getWindowLocation();

    const expectedAfterBid = {
      'bids': [
        {
          'bidderCode': 'appnexus',
          'bidId': '263efc09896d0c',
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'requestId': '155975c76e13b1',
          'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
          'sizes': '300x250,300x600',
          'renderStatus': 2,
          'requestTimestamp': 1576823893838,
          'creativeId': 96846035,
          'currency': 'USD',
          'cpm': 0.5,
          'netRevenue': true,
          'renderedSize': null,
          'width': 300,
          'height': 250,
          'mediaType': 'banner',
          'statusMessage': 'Bid available',
          'timeToRespond': 212,
          'responseTimestamp': 1576823894050,
          'renderTimestamp': null,
          'reason': null,
          'message': null,
          'host': null,
          'path': null,
          'search': null,
          'adserverAdSlot': '/1234567/homepage-banner',
          'pbAdSlot': 'homepage-banner-pbadslot',
          'ttl': 300,
          'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
          'adId': '393976d8770041',
          'size': '300x250',
          'adserverTargeting': {
            'hb_bidder': 'appnexus',
            'hb_adid': '393976d8770041',
            'hb_pb': '0.50',
            'hb_size': '300x250',
            'hb_source': 'client',
            'hb_format': 'banner'
          },
          'meta': {
            'advertiserId': 2529885
          }
        },
        {
          'bidderCode': 'ix',
          'bidId': '9424dea605368f',
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'requestId': '181df4d465699c',
          'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
          'transactionId': 'd99d90e0-663a-459d-8c87-4c92ce6a527c',
          'sizes': '300x250,300x600',
          'renderStatus': 5,
          'renderedSize': null,
          'renderTimestamp': null,
          'reason': null,
          'message': null,
          'host': null,
          'path': null,
          'search': null,
          'responseTimestamp': 1753444800000,
          'adserverAdSlot': '/1234567/homepage-banner',
          'pbAdSlot': 'homepage-banner-pbadslot',
          'meta': {}
        }
      ],
      'auctionInit': {
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'timestamp': 1576823893836,
        'auctionStatus': 'inProgress',
        'adUnits': [
          {
            'code': 'div-gpt-ad-1460505748561-0',
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [300, 250],
                  [300, 600]
                ]
              }
            },
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                }
              }
            ],
            'sizes': [
              [300, 250],
              [300, 600]
            ],
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': {
                    'adslot': '/1234567/homepage-banner'
                  },
                  'pbadslot': 'homepage-banner-pbadslot'
                }
              }
            }
          }
        ],
        'adUnitCodes': ['div-gpt-ad-1460505748561-0'],
        'bidderRequests': [
          {
            'bidderCode': 'appnexus',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'bidderRequestId': '155975c76e13b1',
            'bids': [
              {
                'bidder': 'appnexus',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [300, 250],
                      [300, 600]
                    ]
                  }
                },
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
                'sizes': [
                  [300, 250],
                  [300, 600]
                ],
                'bidId': '263efc09896d0c',
                'bidderRequestId': '155975c76e13b1',
                'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1576823893836,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
              'reachedTop': true,
              'numIframes': 0,
              'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
            },
            'start': 1576823893838
          },
          {
            'bidderCode': 'ix',
            'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
            'bidderRequestId': '181df4d465699c',
            'bids': [
              {
                'bidder': 'ix',
                'params': {
                  'placementId': 13144370
                },
                'crumbs': {
                  'pubcid': 'ff4002c4-ce05-4a61-b4ef-45a3cd93991a'
                },
                'mediaTypes': {
                  'banner': {
                    'sizes': [
                      [300, 250],
                      [300, 600]
                    ]
                  }
                },
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
                'sizes': [
                  [300, 250],
                  [300, 600]
                ],
                'bidId': '9424dea605368f',
                'bidderRequestId': '181df4d465699c',
                'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
                'src': 'client',
                'bidRequestsCount': 1,
                'bidderRequestsCount': 1,
                'bidderWinsCount': 0
              }
            ],
            'auctionStart': 1576823893836,
            'timeout': 1000,
            'refererInfo': {
              'referer': 'http://observer.com/integrationExamples/gpt/hello_world.html',
              'reachedTop': true,
              'numIframes': 0,
              'stack': ['http://observer.com/integrationExamples/gpt/hello_world.html']
            },
            'start': 1576823893838
          }
        ],
        'noBids': [],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 1000,
        'host': 'localhost:9876',
        'path': '/context.html',
        'search': ''
      },
      'initOptions': {
        'pubId': '1',
        'pubKey': 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
        'hostName': 'us-central1-quikr-ebay.cloudfunctions.net',
        'pathName': '/prebid-analytics'
      }
    };

    const expectedAfterBidWon = {
      'bidWon': {
        'bidderCode': 'appnexus',
        'bidId': '263efc09896d0c',
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'creativeId': 96846035,
        'currency': 'USD',
        'cpm': 0.5,
        'netRevenue': true,
        'renderedSize': '300x250',
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'statusMessage': 'Bid available',
        'status': 'rendered',
        'renderStatus': 4,
        'timeToRespond': 212,
        'requestTimestamp': 1576823893838,
        'responseTimestamp': 1576823894050,
        'renderTimestamp': null,
        'reason': null,
        'message': null,
        'host': 'localhost',
        'path': '/context.html',
        'search': '',
        'adserverAdSlot': '/1234567/homepage-banner',
        'pbAdSlot': 'homepage-banner-pbadslot',
        'ttl': 300,
        'ad': '<!-- Creative 96846035 served by Member 9325 via AppNexus -->',
        'adId': '393976d8770041',
        'adserverTargeting': {
          'hb_bidder': 'appnexus',
          'hb_adid': '393976d8770041',
          'hb_pb': '0.50',
          'hb_size': '300x250',
          'hb_source': 'client',
          'hb_format': 'banner'
        },
        'meta': {
          'advertiserId': 2529885
        }
      },
      'initOptions': initOptions
    };

    adapterManager.registerAnalyticsAdapter({
      code: 'tercept',
      adapter: terceptAnalyticsAdapter
    });

    beforeEach(function () {
      adapterManager.enableAnalytics({
        provider: 'tercept',
        options: initOptions
      });
    });

    afterEach(function () {
      terceptAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', function () {
      // Step 1: Send auction init event
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      // Step 2: Send bid requested events
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested']);
      events.emit(EVENTS.BID_REQUESTED, prebidEvent['bidRequested2']);

      // Step 3: Send bid response event
      events.emit(EVENTS.BID_RESPONSE, prebidEvent['bidResponse']);

      // Step 4: Send no bid response event
      events.emit(EVENTS.NO_BID, prebidEvent['noBid']);

      // Step 5: Send bid time out event
      events.emit(EVENTS.BID_TIMEOUT, prebidEvent['bidTimeout']);

      // Step 6: Send auction end event
      events.emit(EVENTS.AUCTION_END, prebidEvent['auctionEnd']);

      expect(server.requests.length).to.equal(1);
      const realAfterBid = JSON.parse(server.requests[0].requestBody);
      expect(realAfterBid).to.deep.equal(expectedAfterBid);

      // Step 7: Send auction bid won event
      events.emit(EVENTS.BID_WON, prebidEvent['bidWon']);

      expect(server.requests.length).to.equal(2);
      const winEventData = JSON.parse(server.requests[1].requestBody);
      expect(winEventData).to.deep.equal(expectedAfterBidWon);
    });

    it('uses correct adUnits for each auction via Map lookup', function () {
      const auction1Init = {
        'auctionId': 'auction-1-id',
        'timestamp': 1576823893836,
        'auctionStatus': 'inProgress',
        'adUnits': [
          {
            'code': 'div-auction-1',
            'mediaTypes': { 'banner': { 'sizes': [[300, 250]] } },
            'bids': [{ 'bidder': 'appnexus', 'params': { 'placementId': 111 } }],
            'sizes': [[300, 250]],
            'transactionId': 'trans-1',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': { 'adslot': '/auction1/slot' },
                  'pbadslot': 'auction1-pbadslot'
                }
              }
            }
          }
        ],
        'adUnitCodes': ['div-auction-1'],
        'bidderRequests': [],
        'noBids': [],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 1000
      };

      const auction2Init = {
        'auctionId': 'auction-2-id',
        'timestamp': 1576823893900,
        'auctionStatus': 'inProgress',
        'adUnits': [
          {
            'code': 'div-auction-2',
            'mediaTypes': { 'banner': { 'sizes': [[728, 90]] } },
            'bids': [{ 'bidder': 'rubicon', 'params': { 'placementId': 222 } }],
            'sizes': [[728, 90]],
            'transactionId': 'trans-2',
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': { 'adslot': '/auction2/slot' },
                  'pbadslot': 'auction2-pbadslot'
                }
              }
            }
          }
        ],
        'adUnitCodes': ['div-auction-2'],
        'bidderRequests': [],
        'noBids': [],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 1000
      };

      events.emit(EVENTS.AUCTION_INIT, auction1Init);
      events.emit(EVENTS.AUCTION_INIT, auction2Init);

      const bidWon1 = {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 250,
        'adId': 'ad-1',
        'requestId': 'bid-1',
        'mediaType': 'banner',
        'cpm': 1.0,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'div-auction-1',
        'auctionId': 'auction-1-id',
        'responseTimestamp': 1576823894000,
        'requestTimestamp': 1576823893838,
        'bidder': 'appnexus',
        'timeToRespond': 164,
        'size': '300x250',
        'status': 'rendered',
        'meta': {}
      };

      const bidWon2 = {
        'bidderCode': 'rubicon',
        'width': 728,
        'height': 90,
        'adId': 'ad-2',
        'requestId': 'bid-2',
        'mediaType': 'banner',
        'cpm': 2.0,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'div-auction-2',
        'auctionId': 'auction-2-id',
        'responseTimestamp': 1576823894100,
        'requestTimestamp': 1576823893900,
        'bidder': 'rubicon',
        'timeToRespond': 200,
        'size': '728x90',
        'status': 'rendered',
        'meta': {}
      };

      events.emit(EVENTS.BID_WON, bidWon1);
      events.emit(EVENTS.BID_WON, bidWon2);

      expect(server.requests.length).to.equal(2);

      const winData1 = JSON.parse(server.requests[0].requestBody);
      expect(winData1.bidWon.adserverAdSlot).to.equal('/auction1/slot');
      expect(winData1.bidWon.pbAdSlot).to.equal('auction1-pbadslot');

      const winData2 = JSON.parse(server.requests[1].requestBody);
      expect(winData2.bidWon.adserverAdSlot).to.equal('/auction2/slot');
      expect(winData2.bidWon.pbAdSlot).to.equal('auction2-pbadslot');
    });

    it('handles BIDDER_ERROR event', function () {
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      const bidderError = {
        'bidderCode': 'appnexus',
        'error': 'timeout',
        'bidderRequest': {
          'bidderCode': 'appnexus',
          'auctionId': 'db377024-d866-4a24-98ac-5e430f881313'
        },
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313'
      };

      events.emit(EVENTS.BIDDER_ERROR, bidderError);

      expect(server.requests.length).to.equal(1);
      const errorData = JSON.parse(server.requests[0].requestBody);
      expect(errorData.bidderError).to.exist;
      expect(errorData.bidderError.status).to.equal(6);
      expect(errorData.bidderError.adserverAdSlot).to.equal('/1234567/homepage-banner');
      expect(errorData.bidderError.pbAdSlot).to.equal('homepage-banner-pbadslot');
      expect(errorData.bidderError.host).to.equal(window.location.hostname);
      expect(errorData.bidderError.path).to.equal(window.location.pathname);
    });

    it('returns empty object for getAdSlotData when ad unit not found', function () {
      const auctionInitNoOrtb2 = {
        'auctionId': 'no-ortb2-auction',
        'timestamp': 1576823893836,
        'auctionStatus': 'inProgress',
        'adUnits': [
          {
            'code': 'div-no-ortb2',
            'mediaTypes': { 'banner': { 'sizes': [[300, 250]] } },
            'bids': [{ 'bidder': 'appnexus', 'params': { 'placementId': 999 } }],
            'sizes': [[300, 250]],
            'transactionId': 'trans-no-ortb2'
          }
        ],
        'adUnitCodes': ['div-no-ortb2'],
        'bidderRequests': [],
        'noBids': [],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 1000
      };

      const bidRequest = {
        'bidderCode': 'appnexus',
        'auctionId': 'no-ortb2-auction',
        'bidderRequestId': 'req-no-ortb2',
        'bids': [{
          'bidder': 'appnexus',
          'params': { 'placementId': 999 },
          'mediaTypes': { 'banner': { 'sizes': [[300, 250]] } },
          'adUnitCode': 'div-no-ortb2',
          'transactionId': 'trans-no-ortb2',
          'sizes': [[300, 250]],
          'bidId': 'bid-no-ortb2',
          'bidderRequestId': 'req-no-ortb2',
          'auctionId': 'no-ortb2-auction'
        }],
        'auctionStart': 1576823893836
      };

      const bidResponse = {
        'bidderCode': 'appnexus',
        'width': 300,
        'height': 250,
        'adId': 'ad-no-ortb2',
        'requestId': 'bid-no-ortb2',
        'mediaType': 'banner',
        'cpm': 0.5,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'div-no-ortb2',
        'auctionId': 'no-ortb2-auction',
        'responseTimestamp': 1576823894000,
        'bidder': 'appnexus',
        'timeToRespond': 164,
        'meta': {}
      };

      events.emit(EVENTS.AUCTION_INIT, auctionInitNoOrtb2);
      events.emit(EVENTS.BID_REQUESTED, bidRequest);
      events.emit(EVENTS.BID_RESPONSE, bidResponse);
      events.emit(EVENTS.AUCTION_END, { auctionId: 'no-ortb2-auction' });

      expect(server.requests.length).to.equal(1);
      const auctionData = JSON.parse(server.requests[0].requestBody);
      const bid = auctionData.bids.find(b => b.bidId === 'bid-no-ortb2');
      expect(bid.adserverAdSlot).to.be.undefined;
      expect(bid.pbAdSlot).to.be.undefined;
    });

    it('handles AD_RENDER_SUCCEEDED event', function () {
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      const adRenderSucceeded = {
        'bid': {
          'bidderCode': 'appnexus',
          'width': 300,
          'height': 250,
          'statusMessage': 'Bid available',
          'adId': '393976d8770041',
          'requestId': '263efc09896d0c',
          'mediaType': 'banner',
          'cpm': 0.5,
          'creativeId': 96846035,
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 300,
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
          'responseTimestamp': 1576823894050,
          'requestTimestamp': 1576823893838,
          'bidder': 'appnexus',
          'timeToRespond': 212,
          'size': '300x250',
          'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
          'meta': {
            'advertiserId': 2529885
          }
        },
        'doc': {},
        'adId': '393976d8770041'
      };

      events.emit(EVENTS.AD_RENDER_SUCCEEDED, adRenderSucceeded);

      expect(server.requests.length).to.equal(1);
      const renderData = JSON.parse(server.requests[0].requestBody);
      expect(renderData.adRenderSucceeded).to.exist;
      expect(renderData.adRenderSucceeded.renderStatus).to.equal(7);
      expect(renderData.adRenderSucceeded.renderTimestamp).to.be.a('number');
      expect(renderData.adRenderSucceeded.bidderCode).to.equal('appnexus');
      expect(renderData.adRenderSucceeded.bidId).to.equal('263efc09896d0c');
      expect(renderData.adRenderSucceeded.adUnitCode).to.equal('div-gpt-ad-1460505748561-0');
      expect(renderData.adRenderSucceeded.auctionId).to.equal('db377024-d866-4a24-98ac-5e430f881313');
      expect(renderData.adRenderSucceeded.cpm).to.equal(0.5);
      expect(renderData.adRenderSucceeded.renderedSize).to.equal('300x250');
      expect(renderData.adRenderSucceeded.adserverAdSlot).to.equal('/1234567/homepage-banner');
      expect(renderData.adRenderSucceeded.pbAdSlot).to.equal('homepage-banner-pbadslot');
      expect(renderData.adRenderSucceeded.host).to.equal(window.location.hostname);
      expect(renderData.adRenderSucceeded.path).to.equal(window.location.pathname);
      expect(renderData.adRenderSucceeded.reason).to.be.null;
      expect(renderData.adRenderSucceeded.message).to.be.null;
    });

    it('handles AD_RENDER_FAILED event', function () {
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);

      const adRenderFailed = {
        'bid': {
          'bidderCode': 'appnexus',
          'width': 300,
          'height': 250,
          'statusMessage': 'Bid available',
          'adId': '393976d8770041',
          'requestId': '263efc09896d0c',
          'mediaType': 'banner',
          'cpm': 0.5,
          'creativeId': 96846035,
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 300,
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
          'responseTimestamp': 1576823894050,
          'requestTimestamp': 1576823893838,
          'bidder': 'appnexus',
          'timeToRespond': 212,
          'size': '300x250',
          'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
          'meta': {
            'advertiserId': 2529885
          }
        },
        'adId': '393976d8770041',
        'reason': 'exception',
        'message': 'Error rendering ad: Cannot read property of undefined'
      };

      events.emit(EVENTS.AD_RENDER_FAILED, adRenderFailed);

      expect(server.requests.length).to.equal(1);
      const renderData = JSON.parse(server.requests[0].requestBody);
      expect(renderData.adRenderFailed).to.exist;
      expect(renderData.adRenderFailed.renderStatus).to.equal(8);
      expect(renderData.adRenderFailed.renderTimestamp).to.be.a('number');
      expect(renderData.adRenderFailed.bidderCode).to.equal('appnexus');
      expect(renderData.adRenderFailed.bidId).to.equal('263efc09896d0c');
      expect(renderData.adRenderFailed.adUnitCode).to.equal('div-gpt-ad-1460505748561-0');
      expect(renderData.adRenderFailed.auctionId).to.equal('db377024-d866-4a24-98ac-5e430f881313');
      expect(renderData.adRenderFailed.cpm).to.equal(0.5);
      expect(renderData.adRenderFailed.reason).to.equal('exception');
      expect(renderData.adRenderFailed.message).to.equal('Error rendering ad: Cannot read property of undefined');
      expect(renderData.adRenderFailed.adserverAdSlot).to.equal('/1234567/homepage-banner');
      expect(renderData.adRenderFailed.pbAdSlot).to.equal('homepage-banner-pbadslot');
      expect(renderData.adRenderFailed.host).to.equal(window.location.hostname);
      expect(renderData.adRenderFailed.path).to.equal(window.location.pathname);
    });

    it('includes null render fields in bidWon for consistency', function () {
      events.emit(EVENTS.AUCTION_INIT, prebidEvent['auctionInit']);
      events.emit(EVENTS.BID_WON, prebidEvent['bidWon']);

      expect(server.requests.length).to.equal(1);
      const winData = JSON.parse(server.requests[0].requestBody);
      expect(winData.bidWon.renderTimestamp).to.be.null;
      expect(winData.bidWon.reason).to.be.null;
      expect(winData.bidWon.message).to.be.null;
    });
  });
});
