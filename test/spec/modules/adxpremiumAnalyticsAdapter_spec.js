import adxpremiumAnalyticsAdapter from 'modules/adxpremiumAnalyticsAdapter.js';
import { testSend } from 'modules/adxpremiumAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';

let events = require('src/events');
let constants = require('src/constants.json');

describe('AdxPremium analytics adapter', function () {
  beforeEach(function () {
    sinon.stub(events, 'getEvents').returns([]);
  });

  afterEach(function () {
    events.getEvents.restore();
  });

  describe('track', function () {
    let initOptions = {
      pubId: 123,
      sid: 's2'
    };

    let auctionInit = {
      'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
      'timestamp': 1589707613899,
      'auctionStatus': 'inProgress',
      'adUnits': [
        {
          'code': 'div-gpt-ad-1533155193780-2',
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
          'bids': [
            {
              'bidder': 'luponmedia',
              'params': {
                'siteId': 303522,
                'keyId': '4o2c4'
              },
              'crumbs': {
                'pubcid': 'aebbdfa9-3e0f-49b6-ad87-437aaa88db2d'
              }
            }
          ],
          'sizes': [
            [
              300,
              250
            ]
          ],
          'transactionId': 'f68c54c2-0814-4ae5-95f5-09f6dd9dc1ef'
        }
      ],
      'adUnitCodes': [
        'div-gpt-ad-1533155193780-2'
      ],
      'labels': [
        'BA'
      ],
      'bidderRequests': [
        {
          'bidderCode': 'luponmedia',
          'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
          'bidderRequestId': '18c49b05a23645',
          'bids': [
            {
              'bidder': 'luponmedia',
              'params': {
                'siteId': 303522,
                'keyId': '4o2c4'
              },
              'crumbs': {
                'pubcid': 'aebbdfa9-3e0f-49b6-ad87-437aaa88db2d'
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
              'adUnitCode': 'div-gpt-ad-1533155193780-2',
              'transactionId': 'f68c54c2-0814-4ae5-95f5-09f6dd9dc1ef',
              'sizes': [
                [
                  300,
                  250
                ]
              ],
              'bidId': '284f8e1469246a',
              'bidderRequestId': '18c49b05a23645',
              'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
              'src': 'client',
              'bidRequestsCount': 1,
              'bidderRequestsCount': 1,
              'bidderWinsCount': 0,
              'schain': {
                'ver': '1.0',
                'complete': 1,
                'nodes': [
                  {
                    'asi': 'novi.ba',
                    'sid': '199424',
                    'hp': 1
                  }
                ]
              }
            }
          ],
          'auctionStart': 1589707613899,
          'timeout': 2000,
          'refererInfo': {
            'referer': 'https://test.com/article/176067',
            'reachedTop': true,
            'numIframes': 0,
            'stack': [
              'https://test.com/article/176067'
            ]
          },
          'gdprConsent': {}
        }
      ],
      'noBids': [],
      'bidsReceived': [],
      'winningBids': [],
      'timeout': 2000,
      'config': {
        'pubId': 4444,
        'sid': 's2'
      }
    };

    // requests & responses
    let bidRequest = {
      'bidderCode': 'luponmedia',
      'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
      'bidderRequestId': '18c49b05a23645',
      'bids': [
        {
          'bidder': 'luponmedia',
          'params': {
            'siteId': 303522,
            'keyId': '4o2c4'
          },
          'crumbs': {
            'pubcid': 'aebbdfa9-3e0f-49b6-ad87-437aaa88db2d'
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
          'adUnitCode': 'div-gpt-ad-1533155193780-2',
          'transactionId': 'f68c54c2-0814-4ae5-95f5-09f6dd9dc1ef',
          'sizes': [
            [
              300,
              250
            ]
          ],
          'bidId': '284f8e1469246a',
          'bidderRequestId': '18c49b05a23645',
          'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
          'src': 'client',
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0,
        },
        {
          'bidder': 'luponmedia',
          'params': {
            'siteId': 303522,
            'keyId': '4o2c5'
          },
          'crumbs': {
            'pubcid': 'aebbdfa9-3e0f-49b6-ad87-437aaa88db2d'
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
          'adUnitCode': 'div-gpt-ad-1533155193780-3',
          'transactionId': 'f68c54c2-0814-4ae5-95f5-09f6dd9dc1ef',
          'sizes': [
            [
              300,
              250
            ]
          ],
          'bidId': '284f8e1469246b',
          'bidderRequestId': '18c49b05a23645',
          'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
          'src': 'client',
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0,
        }
      ],
      'auctionStart': 1589707613899,
      'timeout': 2000,
      'refererInfo': {
        'referer': 'https://test.com/article/176067',
        'reachedTop': true,
        'numIframes': 0,
        'stack': [
          'https://test.com/article/176067'
        ]
      },
      'start': 1589707613908
    };

    let bidResponse = {
      'bidderCode': 'luponmedia',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '3b40e0da8968f5',
      'requestId': '284f8e1469246a',
      'mediaType': 'banner',
      'source': 'client',
      'cpm': 0.43,
      'creativeId': '443801010',
      'currency': 'USD',
      'netRevenue': false,
      'ttl': 300,
      'referrer': '',
      'ad': "<a href='https://novi.ba' target='_blank' style='position:absolute; width:300px; height:250px; z-index:5;'> </a><iframe src='https://lupon.media/vijestiba/300x250new/index.html' height='250' width='300' scrolling='no' frameborder='0'></iframe>",
      'originalCpm': '0.43',
      'originalCurrency': 'USD',
      'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
      'responseTimestamp': 1589707615188,
      'requestTimestamp': 1589707613908,
      'bidder': 'luponmedia',
      'adUnitCode': 'div-gpt-ad-1533155193780-2',
      'timeToRespond': 1280,
      'pbLg': '0.00',
      'pbMg': '0.40',
      'pbHg': '0.43',
      'pbAg': '0.40',
      'pbDg': '0.43',
      'pbCg': '0.43',
      'size': '300x250',
      'adserverTargeting': {
        'hb_bidder': 'luponmedia',
        'hb_adid': '3b40e0da8968f5',
        'hb_pb': '0.43',
        'hb_size': '300x250',
        'hb_source': 'client',
        'hb_format': 'banner'
      }
    };

    // what we expect after general auction

    let expectedAfterBidData = JSON.parse(atob('eyJwdWJsaXNoZXJfaWQiOjEyMywiYXVjdGlvbl9pZCI6ImM0ZjBjY2UwLTI2NGMtNDgzYS1iMmY0LThhYzIyNDhhODk2YiIsInJlZmVyZXIiOiJodHRwczovL3Rlc3QuY29tL2FydGljbGUvMTc2MDY3Iiwic2NyZWVuX3Jlc29sdXRpb24iOiIxNDQweDkwMCIsImRldmljZV90eXBlIjoiZGVza3RvcCIsImdlbyI6bnVsbCwiZXZlbnRzIjpbeyJ0eXBlIjoiVElNRU9VVCIsImJpZGRlcl9jb2RlIjoibHVwb25tZWRpYSIsImV2ZW50X3RpbWVzdGFtcCI6MTU4OTcwNzYxMzkwOCwiYmlkX2dwdF9jb2RlcyI6eyJkaXYtZ3B0LWFkLTE1MzMxNTUxOTM3ODAtMiI6W1szMDAsMjUwXV0sImRpdi1ncHQtYWQtMTUzMzE1NTE5Mzc4MC0zIjpbWzMwMCwyNTBdXX19XX0='));
    expectedAfterBidData['screen_resolution'] = window.screen.width + 'x' + window.screen.height;
    expectedAfterBidData = btoa(JSON.stringify(expectedAfterBidData));

    let expectedAfterBid = {
      'query': 'mutation {createEvent(input: {event: {eventData: "' + expectedAfterBidData + '"}}) {event {createTime } } }'
    };

    // what we expect after timeout

    let expectedAfterTimeoutData = JSON.parse(atob('eyJwdWJsaXNoZXJfaWQiOjEyMywiYXVjdGlvbl9pZCI6ImM0ZjBjY2UwLTI2NGMtNDgzYS1iMmY0LThhYzIyNDhhODk2YiIsInJlZmVyZXIiOiJodHRwczovL3Rlc3QuY29tL2FydGljbGUvMTc2MDY3Iiwic2NyZWVuX3Jlc29sdXRpb24iOiIxNDQweDkwMCIsImRldmljZV90eXBlIjoiZGVza3RvcCIsImdlbyI6bnVsbCwiZXZlbnRzIjpbeyJ0eXBlIjoiVElNRU9VVCIsImJpZGRlcl9jb2RlIjoibHVwb25tZWRpYSIsImV2ZW50X3RpbWVzdGFtcCI6MTU4OTcwNzYxMzkwOCwiYmlkX2dwdF9jb2RlcyI6eyJkaXYtZ3B0LWFkLTE1MzMxNTUxOTM3ODAtMiI6W1szMDAsMjUwXV0sImRpdi1ncHQtYWQtMTUzMzE1NTE5Mzc4MC0zIjpbWzMwMCwyNTBdXX19XX0='));
    expectedAfterTimeoutData['screen_resolution'] = window.screen.width + 'x' + window.screen.height;
    expectedAfterTimeoutData = btoa(JSON.stringify(expectedAfterTimeoutData));

    let expectedAfterTimeout = {
      'query': 'mutation {createEvent(input: {event: {eventData: "' + expectedAfterTimeoutData + '"}}) {event {createTime } } }'
    };

    // lets simulate that some bidders timeout
    let bidTimeoutArgsV1 = [
      {
        'bidId': '284f8e1469246b',
        'bidder': 'luponmedia',
        'adUnitCode': 'div-gpt-ad-1533155193780-3',
        'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b'
      }
    ];

    // now simulate some WIN and RENDERING
    let wonRequest = {
      'bidderCode': 'luponmedia',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '3b40e0da8968f5',
      'requestId': '284f8e1469246a',
      'mediaType': 'banner',
      'source': 'client',
      'cpm': 0.43,
      'creativeId': '443801010',
      'currency': 'USD',
      'netRevenue': false,
      'ttl': 300,
      'referrer': '',
      'ad': "<a href='https://novi.ba' target='_blank' style='position:absolute; width:300px; height:250px; z-index:5;'> </a><iframe src='https://lupon.media/vijestiba/300x250new/index.html' height='250' width='300' scrolling='no' frameborder='0'></iframe>",
      'originalCpm': '0.43',
      'originalCurrency': 'USD',
      'auctionId': 'c4f0cce0-264c-483a-b2f4-8ac2248a896b',
      'responseTimestamp': 1589707615188,
      'requestTimestamp': 1589707613908,
      'bidder': 'luponmedia',
      'adUnitCode': 'div-gpt-ad-1533155193780-2',
      'timeToRespond': 1280,
      'pbLg': '0.00',
      'pbMg': '0.40',
      'pbHg': '0.43',
      'pbAg': '0.40',
      'pbDg': '0.43',
      'pbCg': '0.43',
      'size': '300x250',
      'adserverTargeting': {
        'hb_bidder': 'luponmedia',
        'hb_adid': '3b40e0da8968f5',
        'hb_pb': '0.43',
        'hb_size': '300x250',
        'hb_source': 'client',
        'hb_format': 'banner'
      },
      'status': 'rendered',
      'params': [
        {
          'siteId': 303522,
          'keyId': '4o2c4'
        }
      ]
    };

    let wonExpectData = JSON.parse(atob('eyJwdWJsaXNoZXJfaWQiOjEyMywiYXVjdGlvbl9pZCI6ImM0ZjBjY2UwLTI2NGMtNDgzYS1iMmY0LThhYzIyNDhhODk2YiIsInJlZmVyZXIiOiJodHRwczovL3Rlc3QuY29tL2FydGljbGUvMTc2MDY3Iiwic2NyZWVuX3Jlc29sdXRpb24iOiIxNDQweDkwMCIsImRldmljZV90eXBlIjoiZGVza3RvcCIsImdlbyI6bnVsbCwiZXZlbnRzIjpbeyJ0eXBlIjoiVElNRU9VVCIsImJpZGRlcl9jb2RlIjoibHVwb25tZWRpYSIsImV2ZW50X3RpbWVzdGFtcCI6MTU4OTcwNzYxMzkwOCwiYmlkX2dwdF9jb2RlcyI6eyJkaXYtZ3B0LWFkLTE1MzMxNTUxOTM3ODAtMiI6W1szMDAsMjUwXV0sImRpdi1ncHQtYWQtMTUzMzE1NTE5Mzc4MC0zIjpbWzMwMCwyNTBdXX19LHsidHlwZSI6IlJFU1BPTlNFIiwiYmlkZGVyX2NvZGUiOiJsdXBvbm1lZGlhIiwiZXZlbnRfdGltZXN0YW1wIjoxNTg5NzA3NjE1MTg4LCJzaXplIjoiMzAweDI1MCIsImdwdF9jb2RlIjoiZGl2LWdwdC1hZC0xNTMzMTU1MTkzNzgwLTIiLCJjdXJyZW5jeSI6IlVTRCIsImNyZWF0aXZlX2lkIjoiNDQzODAxMDEwIiwidGltZV90b19yZXNwb25kIjoxMjgwLCJjcG0iOjAuNDMsImlzX3dpbm5pbmciOmZhbHNlfV19'));
    wonExpectData['screen_resolution'] = window.screen.width + 'x' + window.screen.height;
    wonExpectData = btoa(JSON.stringify(wonExpectData));

    let wonExpect = {
      'query': 'mutation {createEvent(input: {event: {eventData: "' + wonExpectData + '"}}) {event {createTime } } }'
    };

    adapterManager.registerAnalyticsAdapter({
      code: 'adxpremium',
      adapter: adxpremiumAnalyticsAdapter
    });

    beforeEach(function () {
      adapterManager.enableAnalytics({
        provider: 'adxpremium',
        options: initOptions
      });
    });

    afterEach(function () {
      adxpremiumAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', function () {
      // Step 1: Send auction init event
      events.emit(constants.EVENTS.AUCTION_INIT, auctionInit);

      // Step 2: Send bid requested event
      events.emit(constants.EVENTS.BID_REQUESTED, bidRequest);

      // Step 3: Send bid response event
      events.emit(constants.EVENTS.BID_RESPONSE, bidResponse);

      // Step 4: Send bid time out event
      events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeoutArgsV1);

      // Step 5: Send auction end event
      events.emit(constants.EVENTS.AUCTION_END, {});

      testSend();

      expect(server.requests.length).to.equal(2);

      let realAfterBid = JSON.parse(server.requests[0].requestBody);

      expect(realAfterBid).to.deep.equal(expectedAfterBid);

      // expect after timeout
      expect(realAfterBid).to.deep.equal(expectedAfterTimeout);

      // Step 6: Send auction bid won event
      events.emit(constants.EVENTS.BID_WON, wonRequest);

      expect(server.requests.length).to.equal(3);
      let winEventData = JSON.parse(server.requests[1].requestBody);

      expect(winEventData).to.deep.equal(wonExpect);
    });
  });
});
