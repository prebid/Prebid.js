import smartyadsAnalytics from 'modules/smartyadsAnalyticsAdapter.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from '../../../src/constants';

let adapterManager = require('src/adapterManager').default;
let events = require('src/events');

describe('SmartyAds Analytics', function () {
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
            'bidder': 'smartyads',
            'params': {
              'placementId': 123456
            }
          },
          {
            'bidder': 'smartyadsAst',
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
        'bidderCode': 'smartyads',
        'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
        'bidderRequestId': '11dc6ff6378de7',
        'bids': [
          {
            'bidder': 'smartyads',
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
            'transactionId': '8b2a8629-d1ea-4bb1-aff0-e335b96dd002',
            'sizes': [
              [
                300,
                600
              ]
            ],
            'bidId': '2bd3e8ff8a113f',
            'bidderRequestId': '11dc6ff6378de7',
            'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
            'src': 'client',
            'bidRequestsCount': 1,
            'bidderRequestsCount': 1,
            'bidderWinsCount': 0,
            'ova': 'cleared'
          }
        ],
        'auctionStart': 1647424261187,
        'timeout': 1000,
        'gdprConsent': {
          'consentString': 'CONSENT',
          'gdprApplies': true,
          'apiVersion': 2,
          'vendorData': 'a lot of borring stuff',
        },
        'start': 1647424261189
      },
    ],
    'noBids': [
      {
        'bidder': 'smartyadsAst',
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
        'bidderCode': 'smartyads',
        'width': 970,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '65d16ef039a97a',
        'requestId': '2bd3e8ff8a113f',
        'transactionId': '8b2a8629-d1ea-4bb1-aff0-e335b96dd002',
        'auctionId': '1e8b993d-8f0a-4232-83eb-3639ddf3a44b',
        'mediaType': 'video',
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
          ],
          'demandSource': 'something'
        },
        'renderer': 'something',
        'originalCpm': 25.02521,
        'originalCurrency': 'EUR',
        'responseTimestamp': 1647424261559,
        'requestTimestamp': 1647424261189,
        'bidder': 'smartyads',
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
          'hb_bidder': 'smartyads',
          'hb_adid': '65d16ef039a97a',
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
    'bidderCode': 'smartyads',
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
    'renderer': 'something',
    'originalCpm': 25.02521,
    'originalCurrency': 'EUR',
    'responseTimestamp': 1647424261558,
    'requestTimestamp': 1647424261189,
    'bidder': 'smartyads',
    'adUnitCode': 'tag_200123_banner',
    'timeToRespond': 369,
    'originalBidder': 'smartyads',
    'pbLg': '5.00',
    'pbMg': '20.00',
    'pbHg': '20.00',
    'pbAg': '20.00',
    'pbDg': '20.00',
    'pbCg': '20.000000',
    'size': '970x250',
    'adserverTargeting': {
      'hb_bidder': 'smartyads',
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

  let renderData = {
    'doc': {
      'location': {
        'ancestorOrigins': {
          '0': 'http://localhost:9999'
        },
        'href': 'http://localhost:9999/integrationExamples/gpt/gdpr_hello_world.html?pbjs_debug=true',
        'origin': 'http://localhost:9999',
        'protocol': 'http:',
        'host': 'localhost:9999',
        'hostname': 'localhost',
        'port': '9999',
        'pathname': '/integrationExamples/gpt/gdpr_hello_world.html',
        'search': '?pbjs_debug=true',
        'hash': ''
      },
      '__reactEvents$ffsiznmtn3p': {}
    },
    'bid': {
      'bidderCode': 'smartyads',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '3c81d46b03abb',
      'requestId': '2be8997209a61c',
      'transactionId': 'b3091239-660a-4b13-94a1-1737e11743c5',
      'adUnitId': '8097f75e-8c3c-4b3e-aebb-b261caa5e331',
      'auctionId': '5c0d10bf-96cb-4afa-92ac-2ef75470da22',
      'mediaType': 'banner',
      'source': 'client',
      'ad': "<div style='box-sizing:border-box; margin:0; padding:0; width: undefinedpx; height: undefinedpx; overflow: hidden;' id='smrt_banner_118f5369580e798eb2e9b138e0b724bb' class=><!-- Smartyads ad info: placementId - 983, crid - empty --><img src=\"https://library.smartyads.com/image/tst/300x250violet.png\" width=\"300px\" height=\"250\" alt=\"test mode\"><script>function isF(){try{return(window.top!==window);} catch(err){return true;}}if(isF() && document && document.body && document.body.style){document.body.style.overflow='hidden';document.body.style.margin=0;document.body.style.padding=0;}</script></div>",
      'cpm': 0.1,
      'ttl': 120,
      'creativeId': '123',
      'netRevenue': true,
      'currency': 'USD',
      'dealId': 'HASH',
      'sid': 1234,
      'meta': {
        'advertiserDomains': [
          'smartyads.com'
        ],
        'dchain': {
          'ver': '1.0',
          'complete': 0,
          'nodes': [
            {
              'name': 'smartyads'
            }
          ]
        }
      },
      'metrics': {
        'requestBids.usp': 0.20000000298023224,
        'requestBids.gdpr': 67.19999999925494,
        'requestBids.fpd': 4.299999997019768,
        'requestBids.validate': 0.29999999701976776,
        'requestBids.makeRequests': 1.800000000745058,
        'requestBids.total': 740.9000000022352,
        'requestBids.callBids': 663,
        'adapter.client.validate': 0,
        'adapters.client.smartyads.validate': 0,
        'adapter.client.buildRequests': 1,
        'adapters.client.smartyads.buildRequests': 1,
        'adapter.client.total': 661.6999999992549,
        'adapters.client.smartyads.total': 661.6999999992549,
        'adapter.client.net': 657.8999999985099,
        'adapters.client.smartyads.net': 657.8999999985099,
        'adapter.client.interpretResponse': 0,
        'adapters.client.smartyads.interpretResponse': 0,
        'addBidResponse.validate': 0.19999999925494194,
        'addBidResponse.categoryTranslation': 0,
        'addBidResponse.dchain': 0.10000000149011612,
        'addBidResponse.dsa': 0,
        'addBidResponse.multibid': 0,
        'addBidResponse.total': 1.5999999977648258,
        'render.pending': 368.80000000074506,
        'render.e2e': 1109.7000000029802
      },
      'adapterCode': 'smartyads',
      'originalCpm': 0.1,
      'originalCurrency': 'USD',
      'responseTimestamp': 1715350155081,
      'requestTimestamp': 1715350154420,
      'bidder': 'smartyads',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'timeToRespond': 661,
      'pbLg': '0.00',
      'pbMg': '0.10',
      'pbHg': '0.10',
      'pbAg': '0.10',
      'pbDg': '0.10',
      'pbCg': '',
      'size': '300x250',
      'adserverTargeting': {
        'hb_bidder': 'smartyads',
        'hb_adid': '3c81d46b03abb',
        'hb_pb': '0.10',
        'hb_size': '300x250',
        'hb_deal': 'HASH',
        'hb_source': 'client',
        'hb_format': 'banner',
        'hb_adomain': 'smartyads.com',
        'hb_crid': '123'
      },
      'latestTargetedAuctionId': '5c0d10bf-96cb-4afa-92ac-2ef75470da22',
      'status': 'rendered',
      'params': [
        {
          'sourceid': '983',
          'host': 'prebid',
          'accountid': '18349',
          'traffic': 'banner'
        }
      ]
    }
  };

  after(function () {
    smartyadsAnalytics.disableAnalytics();
  });

  describe('main test', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      sinon.spy(smartyadsAnalytics, 'track');
    });

    afterEach(function () {
      events.getEvents.restore();
      smartyadsAnalytics.disableAnalytics();
      smartyadsAnalytics.track.restore();
    });

    it('test auctionEnd', function () {
      adapterManager.registerAnalyticsAdapter({
        code: 'smartyads',
        adapter: smartyadsAnalytics
      });

      adapterManager.enableAnalytics({
        provider: 'smartyads',
      });

      events.emit(EVENTS.AUCTION_END, auctionEnd);
      expect(server.requests.length).to.equal(1);
      let message = JSON.parse(server.requests[0].requestBody);
      expect(message).to.have.property('auctionData');
      expect(message).to.have.property('eventType').and.to.equal(EVENTS.AUCTION_END);
      expect(message.auctionData).to.have.property('auctionId');
      expect(message.auctionData.bidderRequests).to.have.length(1);
    });

    it('test bidWon', function() {
      adapterManager.registerAnalyticsAdapter({
        code: 'smartyads',
        adapter: smartyadsAnalytics
      });

      adapterManager.enableAnalytics({
        provider: 'smartyads',
      });

      events.emit(EVENTS.BID_WON, bidWon);
      expect(server.requests.length).to.equal(1);
      let message = JSON.parse(server.requests[0].requestBody);
      expect(message).to.have.property('eventType').and.to.equal(EVENTS.BID_WON);
      expect(message).to.have.property('bid');
      expect(message.bid).to.have.property('bidder').and.to.equal('smartyads');
      expect(message.bid).to.have.property('cpm').and.to.equal(bidWon.cpm);
    });

    it('test adRender', function() {
      adapterManager.registerAnalyticsAdapter({
        code: 'smartyads',
        adapter: smartyadsAnalytics
      });

      adapterManager.enableAnalytics({
        provider: 'smartyads',
      });

      events.emit(EVENTS.AD_RENDER_SUCCEEDED, renderData);
      expect(server.requests.length).to.equal(1);
      let message = JSON.parse(server.requests[0].requestBody);
      expect(message).to.have.property('eventType').and.to.equal(EVENTS.AD_RENDER_SUCCEEDED);
      expect(message).to.have.property('renderData');
      expect(message.renderData).to.have.property('doc');
      expect(message.renderData).to.have.property('doc');
      expect(message.renderData).to.have.property('bid');
      expect(message.renderData.bid).to.have.property('adId').and.to.equal(renderData.bid.adId);
    });
  });
});
