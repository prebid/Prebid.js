import terceptAnalyticsAdapter from 'modules/terceptAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

let events = require('src/events');
let constants = require('src/constants.json');

describe('tercept analytics adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    events.getEvents.restore();
  });

  describe('track', function () {
    let initOptions = {
      pubId: '1',
      pubKey: 'ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==',
      hostName: 'us-central1-quikr-ebay.cloudfunctions.net',
      pathName: '/prebid-analytics'
    };

    let prebidEvent = {
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
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ],
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98'
          }
        ],
        'adUnitCodes': [
          'div-gpt-ad-1460505748561-0'
        ],
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
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
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
              'stack': [
                'http://observer.com/integrationExamples/gpt/hello_world.html'
              ]
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
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
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
          'stack': [
            'http://observer.com/integrationExamples/gpt/hello_world.html'
          ]
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
      'bidTimeout': [
      ],
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
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ],
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98'
          }
        ],
        'adUnitCodes': [
          'div-gpt-ad-1460505748561-0'
        ],
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
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
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
              'stack': [
                'http://observer.com/integrationExamples/gpt/hello_world.html'
              ]
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
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
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
          'stack': [
            'http://observer.com/integrationExamples/gpt/hello_world.html'
          ]
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
    let location = utils.getWindowLocation();

    let expectedAfterBid = {
      'bids': [
        {
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
          'bidId': '263efc09896d0c',
          'bidderCode': 'appnexus',
          'cpm': 0.5,
          'creativeId': 96846035,
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'renderStatus': 2,
          'requestId': '155975c76e13b1',
          'requestTimestamp': 1576823893838,
          'responseTimestamp': 1576823894050,
          'sizes': '300x250,300x600',
          'statusMessage': 'Bid available',
          'timeToRespond': 212
        }
      ],
      'auctionInit': {
        'host': location.host,
        'path': location.pathname,
        'search': location.search,
        'auctionId': 'db377024-d866-4a24-98ac-5e430f881313',
        'timestamp': 1576823893836,
        'auctionStatus': 'inProgress',
        'adUnits': [
          {
            'code': 'div-gpt-ad-1460505748561-0',
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
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ],
            'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98'
          }
        ],
        'adUnitCodes': [
          'div-gpt-ad-1460505748561-0'
        ],
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
                'adUnitCode': 'div-gpt-ad-1460505748561-0',
                'transactionId': '6d275806-1943-4f3e-9cd5-624cbd05ad98',
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
              'stack': [
                'http://observer.com/integrationExamples/gpt/hello_world.html'
              ]
            },
            'start': 1576823893838
          }
        ],
        'noBids': [],
        'bidsReceived': [],
        'winningBids': [],
        'timeout': 1000,
        'config': initOptions
      },
      'initOptions': initOptions
    };

    let expectedAfterBidWon = {
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
        'mediaType': 'banner',
        'statusMessage': 'Bid available',
        'status': 'rendered',
        'renderStatus': 4,
        'timeToRespond': 212,
        'requestTimestamp': 1576823893838,
        'responseTimestamp': 1576823894050
      },
      'initOptions': initOptions
    }

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
