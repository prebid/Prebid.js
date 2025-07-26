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
            'transactionId': 'd99d90e0-663a-459d-8c87-4c92ce6a527c',
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
      'noBid': {
        'bidder': 'ix',
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
        'transactionId': 'd99d90e0-663a-459d-8c87-4c92ce6a527c',
        'sizes': [[300, 250]],
        'bidId': '9424dea605368f',
        'bidderRequestId': '181df4d465699c',
        'auctionId': '86e005fa-1900-4782-b6df-528500f09128',
        'src': 's2s',
        'bidRequestsCount': 1,
        'bidderRequestsCount': 1,
        'bidderWinsCount': 0
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
    const location = utils.getWindowLocation();

    const expectedAfterBid = {
      "bids": [
        {
          "bidderCode": "appnexus",
          "bidId": "263efc09896d0c",
          "adUnitCode": "div-gpt-ad-1460505748561-0",
          "requestId": "155975c76e13b1",
          "auctionId": "db377024-d866-4a24-98ac-5e430f881313",
          "sizes": "300x250,300x600",
          "renderStatus": 2,
          "requestTimestamp": 1576823893838,
          "creativeId": 96846035,
          "currency": "USD",
          "cpm": 0.5,
          "netRevenue": true,
          "mediaType": "banner",
          "statusMessage": "Bid available",
          "timeToRespond": 212,
          "responseTimestamp": 1576823894050
        },
        {
          "bidderCode": "ix",
          "adUnitCode": "div-gpt-ad-1460505748561-0",
          "requestId": "181df4d465699c",
          "auctionId": "86e005fa-1900-4782-b6df-528500f09128",
          "transactionId": "d99d90e0-663a-459d-8c87-4c92ce6a527c",
          "sizes": "300x250,300x600",
          "renderStatus": 5,
          "responseTimestamp": 1753444800000
        }
      ],
      "auctionInit": {
        "auctionId": "db377024-d866-4a24-98ac-5e430f881313",
        "timestamp": 1576823893836,
        "auctionStatus": "inProgress",
        "adUnits": [
          {
            "code": "div-gpt-ad-1460505748561-0",
            "mediaTypes": {
              "banner": {
                "sizes": [
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
            "bids": [
              {
                "bidder": "appnexus",
                "params": {
                  "placementId": 13144370
                },
                "crumbs": {
                  "pubcid": "ff4002c4-ce05-4a61-b4ef-45a3cd93991a"
                }
              }
            ],
            "sizes": [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ],
            "transactionId": "6d275806-1943-4f3e-9cd5-624cbd05ad98"
          }
        ],
        "adUnitCodes": [
          "div-gpt-ad-1460505748561-0"
        ],
        "bidderRequests": [
          {
            "bidderCode": "appnexus",
            "auctionId": "db377024-d866-4a24-98ac-5e430f881313",
            "bidderRequestId": "155975c76e13b1",
            "bids": [
              {
                "bidder": "appnexus",
                "params": {
                  "placementId": 13144370
                },
                "crumbs": {
                  "pubcid": "ff4002c4-ce05-4a61-b4ef-45a3cd93991a"
                },
                "mediaTypes": {
                  "banner": {
                    "sizes": [
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
                "adUnitCode": "div-gpt-ad-1460505748561-0",
                "transactionId": "6d275806-1943-4f3e-9cd5-624cbd05ad98",
                "sizes": [
                  [
                    300,
                    250
                  ],
                  [
                    300,
                    600
                  ]
                ],
                "bidId": "263efc09896d0c",
                "bidderRequestId": "155975c76e13b1",
                "auctionId": "db377024-d866-4a24-98ac-5e430f881313",
                "src": "client",
                "bidRequestsCount": 1,
                "bidderRequestsCount": 1,
                "bidderWinsCount": 0
              }
            ],
            "auctionStart": 1576823893836,
            "timeout": 1000,
            "refererInfo": {
              "referer": "http://observer.com/integrationExamples/gpt/hello_world.html",
              "reachedTop": true,
              "numIframes": 0,
              "stack": [
                "http://observer.com/integrationExamples/gpt/hello_world.html"
              ]
            },
            "start": 1576823893838
          },
          {
            "bidderCode": "ix",
            "auctionId": "db377024-d866-4a24-98ac-5e430f881313",
            "bidderRequestId": "181df4d465699c",
            "bids": [
              {
                "bidder": "ix",
                "params": {
                  "placementId": 13144370
                },
                "crumbs": {
                  "pubcid": "ff4002c4-ce05-4a61-b4ef-45a3cd93991a"
                },
                "mediaTypes": {
                  "banner": {
                    "sizes": [
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
                "adUnitCode": "div-gpt-ad-1460505748561-0",
                "transactionId": "6d275806-1943-4f3e-9cd5-624cbd05ad98",
                "sizes": [
                  [
                    300,
                    250
                  ],
                  [
                    300,
                    600
                  ]
                ],
                "bidId": "9424dea605368f",
                "bidderRequestId": "181df4d465699c",
                "auctionId": "db377024-d866-4a24-98ac-5e430f881313",
                "src": "client",
                "bidRequestsCount": 1,
                "bidderRequestsCount": 1,
                "bidderWinsCount": 0
              }
            ],
            "auctionStart": 1576823893836,
            "timeout": 1000,
            "refererInfo": {
              "referer": "http://observer.com/integrationExamples/gpt/hello_world.html",
              "reachedTop": true,
              "numIframes": 0,
              "stack": [
                "http://observer.com/integrationExamples/gpt/hello_world.html"
              ]
            },
            "start": 1576823893838
          }
        ],
        "noBids": [],
        "bidsReceived": [],
        "winningBids": [],
        "timeout": 1000,
        "host": "localhost:9876",
        "path": "/context.html",
        "search": ""
      },
      "initOptions": {
        "pubId": "1",
        "pubKey": "ZXlKaGJHY2lPaUpJVXpJMU5pSjkuT==",
        "hostName": "us-central1-quikr-ebay.cloudfunctions.net",
        "pathName": "/prebid-analytics"
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
        'mediaType': 'banner',
        'statusMessage': 'Bid available',
        'status': 'rendered',
        'renderStatus': 4,
        'timeToRespond': 212,
        'requestTimestamp': 1576823893838,
        'responseTimestamp': 1576823894050,
        "host": "localhost",
        "path": "/context.html",
        "search": "",
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
  });
});
