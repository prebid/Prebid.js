import adapterManager from '../../../src/adapterManager.js';
import id5AnalyticsAdapter from '../../../modules/id5AnalyticsAdapter.js';
import { expect } from 'chai';
import sinon from 'sinon';
import * as events from '../../../src/events.js';
import constants from '../../../src/constants.json';
import { generateUUID } from '../../../src/utils.js';

const CONFIG_URL = 'https://api.id5-sync.com/analytics/12349/pbjs';
const INGEST_URL = 'https://test.me/ingest';

describe('ID5 analytics adapter', () => {
  let server;
  let config;

  beforeEach(() => {
    server = sinon.createFakeServer();
    config = {
      options: {
        partnerId: 12349,
      }
    };
  });

  afterEach(() => {
    server.restore();
  });

  it('registers itself with the adapter manager', () => {
    const adapter = adapterManager.getAnalyticsAdapter('id5Analytics');
    expect(adapter).to.exist;
    expect(adapter.gvlid).to.be.a('number');
    expect(adapter.adapter).to.equal(id5AnalyticsAdapter);
  });

  it('tolerates undefined or empty config', () => {
    id5AnalyticsAdapter.enableAnalytics(undefined);
    id5AnalyticsAdapter.enableAnalytics({});
  });

  it('calls configuration endpoint', () => {
    server.respondWith('GET', CONFIG_URL, [200,
      {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      `{ "sampling": 0, "ingestUrl": "${INGEST_URL}" }`
    ]);
    id5AnalyticsAdapter.enableAnalytics(config);
    server.respond();

    expect(server.requests).to.have.length(1);

    id5AnalyticsAdapter.disableAnalytics();
  });

  it('does not call configuration endpoint when partner id is missing', () => {
    id5AnalyticsAdapter.enableAnalytics({});
    server.respond();

    expect(server.requests).to.have.length(0);

    id5AnalyticsAdapter.disableAnalytics();
  });

  describe('after configuration', () => {
    let auction;

    beforeEach(() => {
      server.respondWith('GET', CONFIG_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        `{ "sampling": 1, "ingestUrl": "${INGEST_URL}" }`
      ]);

      server.respondWith('POST', INGEST_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        ''
      ]);

      auction = {
        auctionId: generateUUID(),
        adUnits: [{
          'code': 'user-728',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600], [728, 90]]
            }
          },
          adUnitCodes: ['user-728']
        }],
      };
    });

    afterEach(() => {
      id5AnalyticsAdapter.disableAnalytics();
    });

    it('sends auction end events to the backend', () => {
      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      // Why 3? 1: config, 2: tcfEnforcement, 3: auctionEnd
      // tcfEnforcement? yes, gdprEnforcement module emits in reaction to auctionEnd
      expect(server.requests).to.have.length(3);

      const body1 = JSON.parse(server.requests[1].requestBody);
      expect(body1.source).to.equal('pbjs');
      expect(body1.event).to.equal('tcf2Enforcement');
      expect(body1.partnerId).to.equal(12349);
      expect(body1.meta).to.be.a('object');
      expect(body1.meta.pbjs).to.equal($$PREBID_GLOBAL$$.version);
      expect(body1.meta.sampling).to.equal(1);
      expect(body1.meta.tz).to.be.a('number');

      const body2 = JSON.parse(server.requests[2].requestBody);
      expect(body2.source).to.equal('pbjs');
      expect(body2.event).to.equal('auctionEnd');
      expect(body2.partnerId).to.equal(12349);
      expect(body2.meta).to.be.a('object');
      expect(body2.meta.pbjs).to.equal($$PREBID_GLOBAL$$.version);
      expect(body2.meta.sampling).to.equal(1);
      expect(body2.meta.tz).to.be.a('number');
      expect(body2.payload).to.eql(auction);
    });

    it('filters unwanted IDs from the events it sends', () => {
      auction.adUnits[0].bids = [{
        'bidder': 'appnexus',
        'params': {
          'placementId': '16618951'
        },
        'userId': {
          'criteoId': '_h_y_19IMUhMZG1TOTRReHFNc29TekJ3TzQ3elhnRU81ayUyQjhiRkdJJTJGaTFXJTJCdDRnVmN4S0FETUhQbXdmQWg0M3g1NWtGbGolMkZXalclMkJvWjJDOXFDSk1HU3ZKaVElM0QlM0Q',
          'id5id': {
            'uid': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*FSycZQy7v7zWXiKbEpPEWoB3_UiWdPGzh554ncYDvOkAAA3rajiR0yNrFAU7oDTu',
            'ext': { 'linkType': 1 }
          },
          'tdid': '888a6042-8f99-483b-aa26-23c44bc9166b'
        },
        'userIdAsEids': [{
          'source': 'criteo.com',
          'uids': [{
            'id': '_h_y_19IMUhMZG1TOTRReHFNc29TekJ3TzQ3elhnRU81ayUyQjhiRkdJJTJGaTFXJTJCdDRnVmN4S0FETUhQbXdmQWg0M3g1NWtGbGolMkZXalclMkJvWjJDOXFDSk1HU3ZKaVElM0QlM0Q',
            'atype': 1
          }]
        }, {
          'source': 'id5-sync.com',
          'uids': [{
            'id': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*FSycZQy7v7zWXiKbEpPEWoB3_UiWdPGzh554ncYDvOkAAA3rajiR0yNrFAU7oDTu',
            'atype': 1,
            'ext': { 'linkType': 1 }
          }]
        }]
      }];

      auction.bidderRequests = [{
        'bidderCode': 'appnexus',
        'auctionId': 'e8d15df4-d89c-44c9-8b36-812f75cbf227',
        'bidderRequestId': '1451a3c759c60359',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': '16824712'
            },
            'userId': {
              'id5id': {
                'uid': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*CmuuahP8jbPJGRCUDdT2VZ8wz0eJM8O8mNlKktlEjuYAABFEjc2c9faqDencf2hR',
                'ext': {
                  'linkType': 1
                }
              },
              'sharedid': {
                'id': '01F6J4T72MRFYVWTN65WFA0H7N',
                'third': '01F6J4T72MRFYVWTN65WFA0H7N'
              },
              'tdid': '0e45f56b-ad09-4c91-b090-8bd03e0d0754'
            },
            'userIdAsEids': [
              {
                'source': 'id5-sync.com',
                'uids': [
                  {
                    'id': 'ID5-ZHMOQ99ulpk687Fd9xVwzxMsYtkQIJnI-qm3iWdtww!ID5*CmuuahP8jbPJGRCUDdT2VZ8wz0eJM8O8mNlKktlEjuYAABFEjc2c9faqDencf2hR',
                    'atype': 1,
                    'ext': {
                      'linkType': 1
                    }
                  }
                ]
              },
              {
                'source': 'sharedid.org',
                'uids': [
                  {
                    'id': '01F6J4T72MRFYVWTN65WFA0H7N',
                    'atype': 1,
                    'ext': {
                      'third': '01F6J4T72MRFYVWTN65WFA0H7N'
                    }
                  }
                ]
              },
              {
                'source': 'adserver.org',
                'uids': [
                  {
                    'id': '0e45f56b-ad09-4c91-b090-8bd03e0d0754',
                    'atype': 1,
                    'ext': {
                      'rtiPartner': 'TDID'
                    }
                  }
                ]
              }
            ],
            'ortb2Imp': {
              'ext': {
                'data': {
                  'adserver': {
                    'name': 'gam',
                    'adslot': '/6783/Kiwi/portail'
                  },
                  'pbadslot': '/6783/Kiwi/portail'
                }
              }
            },
            'adUnitCode': 'btf_leaderboard',
            'transactionId': '3ce8216e-7898-4a22-86ba-01519b62bfce',
            'sizes': [
              [
                728,
                90
              ]
            ],
            'bidId': '146661c05209a56e',
            'bidderRequestId': '1451a3c759c60359',
            'auctionId': 'e8d15df4-d89c-44c9-8b36-812f75cbf227',
            'src': 'client',
            'bidRequestsCount': 2,
            'bidderRequestsCount': 2,
            'bidderWinsCount': 0
          }
        ],
        'auctionStart': 1621959214757,
        'timeout': 2000,
        'refererInfo': {
          'referer': 'https://www.blog.com/?pbjs_debug=true',
          'reachedTop': true,
          'isAmp': false,
          'numIframes': 0,
          'stack': [
            'https://www.blog.com/?pbjs_debug=true'
          ],
          'canonicalUrl': null
        },
        'gdprConsent': {
          'consentString': 'CPGw1WAPGw1WAAHABBENBbCsAP_AAH_AAAAAH3tf_X__b3_j-_59__t0eY1f9_7_v-0zjhfdt-8N2f_X_L8X42M7vF36pq4KuR4Eu3LBIQdlHOHcTUmw6okVrTPsbk2Mr7NKJ7PEmnMbe2dYGH9_n93TuZKY7__8___z__-v_v____f_r-3_3__59X---_e_V399zLv9__3__9gfaASYal8AF2JY4Mk0aVQogQhWEh0AoAKKAYWiawgZXBTsrgI9QQMAEJqAjAiBBiCjFgEAAgEASERASAHggEQBEAgABACpAQgAI2AQWAFgYBAAKAaFiBFAEIEhBkcFRymBARItFBPZWAJRd7GmEIZRYAUCj-iowEShBAsDISFg4AAA.f_gAD_gAAAAA',
          'vendorData': {
            'cmpId': 7,
            'cmpVersion': 1,
            'gdprApplies': true,
            'tcfPolicyVersion': 2,
            'eventStatus': 'useractioncomplete',
            'cmpStatus': 'loaded',
            'listenerId': 47,
            'tcString': 'CPGw1WAPGw1WAAHABBENBbCsAP_AAH_AAAAAH3tf_X__b3_j-_59__t0eY1f9_7_v-0zjhfdt-8N2f_X_L8X42M7vF36pq4KuR4Eu3LBIQdlHOHcTUmw6okVrTPsbk2Mr7NKJ7PEmnMbe2dYGH9_n93TuZKY7__8___z__-v_v____f_r-3_3__59X---_e_V399zLv9__3__9gfaASYal8AF2JY4Mk0aVQogQhWEh0AoAKKAYWiawgZXBTsrgI9QQMAEJqAjAiBBiCjFgEAAgEASERASAHggEQBEAgABACpAQgAI2AQWAFgYBAAKAaFiBFAEIEhBkcFRymBARItFBPZWAJRd7GmEIZRYAUCj-iowEShBAsDISFg4AAA.f_gAD_gAAAAA',
          },
          'gdprApplies': true,
          'addtlConsent': '1~7.12.35.62.66.70.89.93.108.122.144.149.153.162.167.184.196.221.241.253.259.272.311.317.323.326.338.348.350.415.440.448.449.482.486.491.494.495.540.571.574.585.587.588.590.725.733.780.817.839.864.867.932.938.981.986.1031.1033.1051.1092.1097.1126.1127.1170.1171.1186.1201.1204.1205.1211.1215.1230.1232.1236.1248.1276.1290.1301.1313.1344.1364.1365.1415.1419.1428.1449.1451.1509.1558.1564.1570.1577.1591.1651.1669.1712.1716.1720.1721.1725.1733.1753.1765.1799.1810.1834.1842.1870.1878.1889.1896.1911.1922.1929.2012.2072.2078.2079.2109.2177.2202.2253.2290.2299.2316.2357.2373.2526.2531.2571.2572.2575.2628.2663.2677.2776.2778.2779.2985.3033.3052.3154',
          'apiVersion': 2
        },
        'start': 1621959214763
      }];

      auction.bidsReceived = [{
        'bidderCode': 'appnexus',
        'width': 728,
        'height': 90,
        'statusMessage': 'Bid available',
        'adId': '99e7838aa7f1c4f',
        'requestId': '21e0b32208ee9a',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.020601,
        'creativeId': 209272535,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'user-728',
        'appnexus': {
          'buyerMemberId': 11563
        },
        'meta': {
          'advertiserId': 4388779
        },
        'ad': 'stuff i am not interested in',
        'originalCpm': 0.020601,
        'originalCurrency': 'USD',
        'auctionId': 'c7694dbb-a583-4a73-a933-b16f1f821ba4',
        // Make sure cleanup is resilient
        'someNullObject': null,
        'someUndefinedProperty': undefined
      }];

      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      expect(server.requests).to.have.length(3);

      const body = JSON.parse(server.requests[2].requestBody);
      expect(body.event).to.equal('auctionEnd');
      expect(body.payload.adUnits[0].bids[0].userId).to.eql({
        'criteoId': '__ID5_REDACTED__',
        'id5id': {
          'uid': '__ID5_REDACTED__',
          'ext': {
            'linkType': 1
          }
        },
        'tdid': '__ID5_REDACTED__'
      });
      expect(body.payload.bidderRequests[0].bids[0].userId).to.eql({
        'sharedid': '__ID5_REDACTED__',
        'id5id': {
          'uid': '__ID5_REDACTED__',
          'ext': {
            'linkType': 1
          }
        },
        'tdid': '__ID5_REDACTED__'
      });
      body.payload.adUnits[0].bids[0].userIdAsEids.forEach((userId) => {
        expect(userId.uids[0].id).to.equal('__ID5_REDACTED__');
        if (userId.uids[0].ext) {
          expect(userId.uids[0].ext).to.equal('__ID5_REDACTED__');
        }
      });
      body.payload.bidderRequests[0].bids[0].userIdAsEids.forEach((userId) => {
        expect(userId.uids[0].id).to.equal('__ID5_REDACTED__');
        if (userId.uids[0].ext) {
          expect(userId.uids[0].ext).to.equal('__ID5_REDACTED__');
        }
      });
      expect(body.payload.bidsReceived[0].ad).to.equal(undefined);
      expect(body.payload.bidsReceived[0].requestId).to.equal('21e0b32208ee9a');
    });

    it('can override events to collect if configured to do so', () => {
      server.respondWith('GET', CONFIG_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        `{ "sampling": 1, "ingestUrl": "${INGEST_URL}", "eventsToTrack": ["tcf2Enforcement"] }`
      ]);
      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      expect(server.requests).to.have.length(2);
      const body1 = JSON.parse(server.requests[1].requestBody);
      expect(body1.event).to.equal('tcf2Enforcement');
    });

    it('can extend cleanup rules from server side', () => {
      auction.bidsReceived = [{
        'bidderCode': 'appnexus',
        'width': 728,
        'height': 90,
        'statusMessage': 'Bid available',
        'adId': '99e7838aa7f1c4f',
        'requestId': '21e0b32208ee9a',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.020601,
        'creativeId': 209272535,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'adUnitCode': 'user-728',
        'appnexus': {
          'buyerMemberId': 11563
        },
        'meta': {
          'advertiserId': 4388779
        },
        'ad': 'stuff i am not interested in',
        'originalCpm': 0.020601,
        'originalCurrency': 'USD',
        'auctionId': 'c7694dbb-a583-4a73-a933-b16f1f821ba4'
      }, {
        'bidderCode': 'ix',
        'width': 728,
        'height': 90,
        'statusMessage': 'Bid available',
        'adId': '228f725de4a9ff09',
        'requestId': '225a42b4a8ec7287',
        'mediaType': 'banner',
        'source': 'client',
        'cpm': 0.06,
        'netRevenue': true,
        'currency': 'USD',
        'creativeId': '8838044',
        'ad': 'lots of HTML code',
        'ttl': 300,
        'meta': {
          'networkId': 85,
          'brandId': 822,
          'brandName': 'Microsoft Brands',
          'advertiserDomains': [
            'microsoftstore.com'
          ]
        },
        'originalCpm': 0.06,
        'originalCurrency': 'USD',
        'auctionId': 'fe28ce44-61bb-4ed8-be3c-3e801dfddcb9',
        'responseTimestamp': 1621954632648,
        'requestTimestamp': 1621954632498,
        'bidder': 'ix',
        'adUnitCode': 'sticky_footer',
        'timeToRespond': 150,
        'pbLg': '0.00',
        'pbCg': '0.06',
        'size': '728x90',
        'adserverTargeting': {
          'hb_bidder': 'ix',
        }
      }];
      server.respondWith('GET', CONFIG_URL, [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        `{ "sampling": 1, "ingestUrl": "${INGEST_URL}", "additionalCleanupRules": {"auctionEnd": [{"match":["bidsReceived", "*", "requestId"],"apply":"erase"}]} }`
      ]);
      id5AnalyticsAdapter.enableAnalytics(config);
      server.respond();
      events.emit(constants.EVENTS.AUCTION_END, auction);
      server.respond();

      expect(server.requests).to.have.length(3);
      const body = JSON.parse(server.requests[2].requestBody);
      expect(body.event).to.equal('auctionEnd');
      expect(body.payload.bidsReceived[0].requestId).to.equal(undefined);
      expect(body.payload.bidsReceived[1].requestId).to.equal(undefined);
      expect(body.payload.bidsReceived[0].bidderCode).to.equal('appnexus');
      expect(body.payload.bidsReceived[1].bidderCode).to.equal('ix');
    });
  });
});
