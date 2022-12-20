import magniteAdapter, {
  parseBidResponse,
  getHostNameFromReferer,
  storage,
  rubiConf,
} from '../../../modules/magniteAnalyticsAdapter.js';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import * as mockGpt from '../integration/faker/googletag.js';
import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency.js';
import { getGlobal } from '../../../src/prebidGlobal.js';
import { deepAccess } from '../../../src/utils.js';

let events = require('src/events.js');
let utils = require('src/utils.js');

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BIDDER_DONE,
    BID_WON,
    BID_TIMEOUT,
    BILLABLE_EVENT
  }
} = CONSTANTS;

const STUBBED_UUID = '12345678-1234-1234-1234-123456789abc';

// Mock Event Data
const MOCK = {
  AUCTION_INIT: {
    'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
    'timestamp': 1658868383741,
    'adUnits': [
      {
        'code': 'box',
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
            'bidder': 'rubicon',
            'params': {
              'accountId': 1001,
              'siteId': 267318,
              'zoneId': 1861698
            }
          }
        ],
        'sizes': [
          [
            300,
            250
          ]
        ],
        'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
        'ortb2Imp': {
          'ext': {
            'tid': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
            'data': {
              'adserver': {
                'name': 'gam',
                'adslot': '/1234567/prebid-slot'
              },
              'pbadslot': '/1234567/prebid-slot'
            },
            'gpid': '/1234567/prebid-slot'
          }
        }
      }
    ],
    'bidderRequests': [
      {
        'bidderCode': 'rubicon',
        'bids': [
          {
            'bidder': 'rubicon',
            'params': {
              'accountId': 1001,
              'siteId': 267318,
              'zoneId': 1861698,
            },
            'adUnitCode': 'box',
            'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
            'bidId': '23fcd8cf4bf0d7',
            'src': 'client',
            'startTime': 1658868383748
          }
        ],
        'refererInfo': {
          'page': 'http://a-test-domain.com:8000/test_pages/sanity/TEMP/prebidTest.html?pbjs_debug=true',
        },
      }
    ],
    'timeout': 3000,
    'config': {
      'accountId': 1001,
      'endpoint': 'https://pba-event-service-alb-dev.use1.fanops.net/event'
    }
  },
  BID_REQUESTED: {
    'bidderCode': 'rubicon',
    'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
    'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
    'bids': [
      {
        'bidder': 'rubicon',
        'params': {
          'accountId': 1001,
          'siteId': 267318,
          'zoneId': 1861698,
        },
        'adUnitCode': 'box',
        'bidId': '23fcd8cf4bf0d7',
        'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
        'src': 'client',
      }
    ]
  },
  BID_RESPONSE: {
    'bidderCode': 'rubicon',
    'width': 300,
    'height': 250,
    'adId': '3c0b59947ced11',
    'requestId': '23fcd8cf4bf0d7',
    'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
    'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
    'mediaType': 'banner',
    'source': 'client',
    'currency': 'USD',
    'creativeId': '4954828',
    'cpm': 3.4,
    'ttl': 300,
    'netRevenue': true,
    'ad': '<html></html>',
    'bidder': 'rubicon',
    'adUnitCode': 'box',
    'timeToRespond': 271,
    'size': '300x250',
    'status': 'rendered',
    getStatusCode: () => 1,
  },
  AUCTION_END: {
    'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
    'auctionEnd': 1658868384019,
  },
  BIDDER_DONE: {
    'bidderCode': 'rubicon',
    'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
    'bids': [
      {
        'bidder': 'rubicon',
        'adUnitCode': 'box',
        'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
        'bidId': '23fcd8cf4bf0d7',
        'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
        'src': 'client',
      }
    ]
  },
  BID_WON: {
    'bidderCode': 'rubicon',
    'bidId': '23fcd8cf4bf0d7',
    'adId': '3c0b59947ced11',
    'requestId': '23fcd8cf4bf0d7',
    'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
    'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
    'mediaType': 'banner',
    'currency': 'USD',
    'cpm': 3.4,
    'ttl': 300,
    'bidder': 'rubicon',
    'adUnitCode': 'box',
    'status': 'rendered',
  }
}

const ANALYTICS_MESSAGE = {
  'channel': 'web',
  'integration': 'pbjs',
  'referrerUri': 'http://a-test-domain.com:8000/test_pages/sanity/TEMP/prebidTest.html?pbjs_debug=true',
  'version': '$prebid.version$',
  'referrerHostname': 'a-test-domain.com',
  'timestamps': {
    'timeSincePageLoad': 500,
    'eventTime': 1519767014281,
    'prebidLoaded': magniteAdapter.MODULE_INITIALIZED_TIME
  },
  'wrapper': {
    'name': '10000_fakewrapper_test'
  },
  'session': {
    'id': '12345678-1234-1234-1234-123456789abc',
    'pvid': '12345678',
    'start': 1519767013781,
    'expires': 1519788613781
  },
  'auctions': [
    {
      'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
      'auctionStart': 1658868383741,
      'samplingFactor': 1,
      'clientTimeoutMillis': 3000,
      'accountId': 1001,
      'bidderOrder': [
        'rubicon'
      ],
      'serverTimeoutMillis': 1000,
      'adUnits': [
        {
          'adUnitCode': 'box',
          'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
          'mediaTypes': [
            'banner'
          ],
          'dimensions': [
            {
              'width': 300,
              'height': 250
            }
          ],
          'pbAdSlot': '/1234567/prebid-slot',
          'gpid': '/1234567/prebid-slot',
          'bids': [
            {
              'bidder': 'rubicon',
              'bidId': '23fcd8cf4bf0d7',
              'source': 'client',
              'status': 'success',
              'clientLatencyMillis': 271,
              'bidResponse': {
                'bidPriceUSD': 3.4,
                'mediaType': 'banner',
                'dimensions': {
                  'width': 300,
                  'height': 250
                }
              }
            }
          ],
          'accountId': 1001,
          'siteId': 267318,
          'zoneId': 1861698,
          'status': 'success'
        }
      ],
      'auctionEnd': 1658868384019
    }
  ],
  'gamRenders': [
    {
      'adSlot': 'box',
      'advertiserId': 1111,
      'creativeId': 2222,
      'lineItemId': 3333,
      'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
      'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a'
    }
  ],
  'bidsWon': [
    {
      'bidder': 'rubicon',
      'bidId': '23fcd8cf4bf0d7',
      'source': 'client',
      'status': 'success',
      'clientLatencyMillis': 271,
      'bidResponse': {
        'bidPriceUSD': 3.4,
        'mediaType': 'banner',
        'dimensions': {
          'width': 300,
          'height': 250
        }
      },
      'sourceAuctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
      'renderAuctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
      'sourceTransactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
      'renderTransactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
      'transactionId': '7b10a106-89ea-4e19-bc51-9b2e970fc42a',
      'accountId': 1001,
      'siteId': 267318,
      'zoneId': 1861698,
      'mediaTypes': [
        'banner'
      ],
      'adUnitCode': 'box'
    }
  ],
  'trigger': 'gam-delayed'
}

describe('magnite analytics adapter', function () {
  let sandbox;
  let clock;
  let getDataFromLocalStorageStub, setDataInLocalStorageStub, localStorageIsEnabledStub;
  let gptSlot0;
  let gptSlotRenderEnded0;
  beforeEach(function () {
    mockGpt.enable();
    gptSlot0 = mockGpt.makeSlot({ code: 'box' });
    gptSlotRenderEnded0 = {
      eventName: 'slotRenderEnded',
      params: {
        slot: gptSlot0,
        isEmpty: false,
        advertiserId: 1111,
        sourceAgnosticCreativeId: 2222,
        sourceAgnosticLineItemId: 3333
      }
    };
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setDataInLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
    sandbox = sinon.sandbox.create();

    localStorageIsEnabledStub.returns(true);

    sandbox.stub(events, 'getEvents').returns([]);

    sandbox.stub(utils, 'generateUUID').returns(STUBBED_UUID);

    clock = sandbox.useFakeTimers(1519767013781);

    magniteAdapter.referrerHostname = '';

    config.setConfig({
      s2sConfig: {
        timeout: 1000,
        accountId: 10000,
      },
      rubicon: {
        wrapperName: '10000_fakewrapper_test'
      }
    })
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
    mockGpt.enable();
    getDataFromLocalStorageStub.restore();
    setDataInLocalStorageStub.restore();
    localStorageIsEnabledStub.restore();
    magniteAdapter.disableAnalytics();
  });

  it('should require accountId', function () {
    sandbox.stub(utils, 'logError');

    magniteAdapter.enableAnalytics({
      options: {
        endpoint: '//localhost:9999/event'
      }
    });

    expect(utils.logError.called).to.equal(true);
  });

  it('should require endpoint', function () {
    sandbox.stub(utils, 'logError');

    magniteAdapter.enableAnalytics({
      options: {
        accountId: 1001
      }
    });

    expect(utils.logError.called).to.equal(true);
  });

  describe('config subscribe', function () {
    it('should update the pvid if user asks', function () {
      expect(utils.generateUUID.called).to.equal(false);
      config.setConfig({ rubicon: { updatePageView: true } });
      expect(utils.generateUUID.called).to.equal(true);
    });
    it('should merge in and preserve older set configs', function () {
      config.setConfig({
        rubicon: {
          wrapperName: '1001_general',
          int_type: 'dmpbjs',
          fpkvs: {
            source: 'fb'
          },
          updatePageView: true
        }
      });
      expect(rubiConf).to.deep.equal({
        analyticsEventDelay: 500,
        analyticsBatchTimeout: 5000,
        analyticsProcessDelay: 1,
        dmBilling: {
          enabled: false,
          vendors: [],
          waitForAuction: true
        },
        pvid: '12345678',
        wrapperName: '1001_general',
        int_type: 'dmpbjs',
        fpkvs: {
          source: 'fb'
        },
        updatePageView: true
      });

      // update it with stuff
      config.setConfig({
        rubicon: {
          analyticsBatchTimeout: 3000,
          fpkvs: {
            link: 'email'
          }
        }
      });
      expect(rubiConf).to.deep.equal({
        analyticsEventDelay: 500,
        analyticsBatchTimeout: 3000,
        analyticsProcessDelay: 1,
        dmBilling: {
          enabled: false,
          vendors: [],
          waitForAuction: true
        },
        pvid: '12345678',
        wrapperName: '1001_general',
        int_type: 'dmpbjs',
        fpkvs: {
          source: 'fb',
          link: 'email'
        },
        updatePageView: true
      });

      // overwriting specific edge keys should update them
      config.setConfig({
        rubicon: {
          fpkvs: {
            link: 'iMessage',
            source: 'twitter'
          }
        }
      });
      expect(rubiConf).to.deep.equal({
        analyticsEventDelay: 500,
        analyticsBatchTimeout: 3000,
        analyticsProcessDelay: 1,
        dmBilling: {
          enabled: false,
          vendors: [],
          waitForAuction: true
        },
        pvid: '12345678',
        wrapperName: '1001_general',
        int_type: 'dmpbjs',
        fpkvs: {
          link: 'iMessage',
          source: 'twitter'
        },
        updatePageView: true
      });
    });
  });

  describe('when handling events', function () {
    function performStandardAuction({
      gptEvents = [gptSlotRenderEnded0],
      auctionId = MOCK.AUCTION_INIT.auctionId,
      eventDelay = rubiConf.analyticsEventDelay,
      sendBidWon = true
    } = {}) {
      events.emit(AUCTION_INIT, { ...MOCK.AUCTION_INIT, auctionId });
      events.emit(BID_REQUESTED, { ...MOCK.BID_REQUESTED, auctionId });
      events.emit(BID_RESPONSE, { ...MOCK.BID_RESPONSE, auctionId });
      events.emit(BIDDER_DONE, { ...MOCK.BIDDER_DONE, auctionId });
      events.emit(AUCTION_END, { ...MOCK.AUCTION_END, auctionId });

      if (gptEvents && gptEvents.length) {
        gptEvents.forEach(gptEvent => mockGpt.emitEvent(gptEvent.eventName, gptEvent.params));
      }

      if (sendBidWon) {
        events.emit(BID_WON, { ...MOCK.BID_WON, auctionId });
      }

      if (eventDelay > 0) {
        clock.tick(eventDelay);
      }
    }

    beforeEach(function () {
      magniteAdapter.enableAnalytics({
        options: {
          endpoint: '//localhost:9999/event',
          accountId: 1001
        }
      });
      config.setConfig({ rubicon: { updatePageView: true } });
    });

    it('should build a batched message from prebid events', function () {
      performStandardAuction();

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];

      expect(request.url).to.equal('//localhost:9999/event');

      let message = JSON.parse(request.requestBody);

      expect(message).to.deep.equal(ANALYTICS_MESSAGE);
    });

    it('should pass along bidderOrder correctly', function () {
      const auctionInit = utils.deepClone(MOCK.AUCTION_INIT);

      auctionInit.bidderRequests = auctionInit.bidderRequests.concat([
        { bidderCode: 'pubmatic' },
        { bidderCode: 'ix' },
        { bidderCode: 'appnexus' }
      ])

      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      clock.tick(rubiConf.analyticsBatchTimeout + 1000);

      let message = JSON.parse(server.requests[0].requestBody);
      expect(message.auctions[0].bidderOrder).to.deep.equal([
        'rubicon',
        'pubmatic',
        'ix',
        'appnexus'
      ]);
    });

    it('should pass along 1x1 size if no sizes in adUnit', function () {
      const auctionInit = utils.deepClone(MOCK.AUCTION_INIT);

      delete auctionInit.adUnits[0].sizes;

      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      clock.tick(rubiConf.analyticsBatchTimeout + 1000);

      let message = JSON.parse(server.requests[0].requestBody);
      expect(message.auctions[0].adUnits[0].dimensions).to.deep.equal([
        {
          width: 1,
          height: 1
        }
      ]);
    });

    it('should pass along user ids', function () {
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.bidderRequests[0].bids[0].userId = {
        criteoId: 'sadfe4334',
        lotamePanoramaId: 'asdf3gf4eg',
        pubcid: 'dsfa4545-svgdfs5',
        sharedId: { id1: 'asdf', id2: 'sadf4344' }
      };

      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      clock.tick(rubiConf.analyticsBatchTimeout + 1000);

      let message = JSON.parse(server.requests[0].requestBody);

      expect(message.auctions[0].user).to.deep.equal({
        ids: [
          { provider: 'criteoId', 'hasId': true },
          { provider: 'lotamePanoramaId', 'hasId': true },
          { provider: 'pubcid', 'hasId': true },
          { provider: 'sharedId', 'hasId': true },
        ]
      });
    });

    // A-Domain tests
    [
      { input: ['magnite.com'], expected: ['magnite.com'] },
      { input: ['magnite.com', 'prebid.org'], expected: ['magnite.com', 'prebid.org'] },
      { input: [123, 'prebid.org', false, true, [], 'magnite.com', {}], expected: ['prebid.org', 'magnite.com'] },
      { input: 'not array', expected: undefined },
      { input: [], expected: undefined },
    ].forEach((test, index) => {
      it(`should handle adomain correctly - #${index + 1}`, function () {
        events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
        events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

        let bidResponse = utils.deepClone(MOCK.BID_RESPONSE);
        bidResponse.meta = {
          advertiserDomains: test.input
        }

        events.emit(BID_RESPONSE, bidResponse);
        events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
        events.emit(AUCTION_END, MOCK.AUCTION_END);
        events.emit(BID_WON, MOCK.BID_WON);
        clock.tick(rubiConf.analyticsBatchTimeout + 1000);

        let message = JSON.parse(server.requests[0].requestBody);
        expect(message.auctions[0].adUnits[0].bids[0].bidResponse.adomains).to.deep.equal(test.expected);
      });

      // Network Id tests
      [
        { input: 'magnite.com', expected: 'magnite.com' },
        { input: 12345, expected: '12345' },
        { input: ['magnite.com', 12345], expected: 'magnite.com,12345' }
      ].forEach((test, index) => {
        it(`should handle networkId correctly - #${index + 1}`, function () {
          events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
          events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

          let bidResponse = utils.deepClone(MOCK.BID_RESPONSE);
          bidResponse.meta = {
            networkId: test.input
          };

          events.emit(BID_RESPONSE, bidResponse);
          events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
          events.emit(AUCTION_END, MOCK.AUCTION_END);
          events.emit(BID_WON, MOCK.BID_WON);
          clock.tick(rubiConf.analyticsBatchTimeout + 1000);

          let message = JSON.parse(server.requests[0].requestBody);
          expect(message.auctions[0].adUnits[0].bids[0].bidResponse.networkId).to.equal(test.expected);
        });
      });
    });

    describe('with session handling', function () {
      const expectedPvid = STUBBED_UUID.slice(0, 8);
      beforeEach(function () {
        config.setConfig({ rubicon: { updatePageView: true } });
      });

      it('should not log any session data if local storage is not enabled', function () {
        localStorageIsEnabledStub.returns(false);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        delete expectedMessage.session;
        delete expectedMessage.fpkvs;

        performStandardAuction();

        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];

        expect(request.url).to.equal('//localhost:9999/event');

        let message = JSON.parse(request.requestBody);

        expect(message).to.deep.equal(expectedMessage);
      });

      it('should should pass along custom rubicon kv and pvid when defined', function () {
        config.setConfig({
          rubicon: {
            fpkvs: {
              source: 'fb',
              link: 'email'
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session.pvid = STUBBED_UUID.slice(0, 8);
        expectedMessage.fpkvs = [
          { key: 'source', value: 'fb' },
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should convert kvs to strings before sending', function () {
        config.setConfig({
          rubicon: {
            fpkvs: {
              number: 24,
              boolean: false,
              string: 'hello',
              array: ['one', 2, 'three'],
              object: { one: 'two' }
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session.pvid = STUBBED_UUID.slice(0, 8);
        expectedMessage.fpkvs = [
          { key: 'number', value: '24' },
          { key: 'boolean', value: 'false' },
          { key: 'string', value: 'hello' },
          { key: 'array', value: 'one,2,three' },
          { key: 'object', value: '[object Object]' }
        ]
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should use the query utm param rubicon kv value and pass updated kv and pvid when defined', function () {
        sandbox.stub(utils, 'getWindowLocation').returns({ 'search': '?utm_source=other', 'pbjs_debug': 'true' });

        config.setConfig({
          rubicon: {
            fpkvs: {
              source: 'fb',
              link: 'email'
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session.pvid = STUBBED_UUID.slice(0, 8);
        expectedMessage.fpkvs = [
          { key: 'source', value: 'other' },
          { key: 'link', value: 'email' }
        ]

        message.fpkvs.sort((left, right) => left.key < right.key);
        expectedMessage.fpkvs.sort((left, right) => left.key < right.key);

        expect(message).to.deep.equal(expectedMessage);
      });

      it('should pick up existing localStorage and use its values', function () {
        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519767017881, // 15 mins before "now"
          expires: 1519767039481, // six hours later
          lastSeen: 1519766113781,
          fpkvs: { source: 'tw' }
        };
        getDataFromLocalStorageStub.withArgs('mgniSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session = {
          id: '987654',
          start: 1519767017881,
          expires: 1519767039481,
          pvid: expectedPvid
        }
        expectedMessage.fpkvs = [
          { key: 'source', value: 'tw' },
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: '987654', // should have stayed same
          start: 1519767017881, // should have stayed same
          expires: 1519767039481, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our auction init time
          fpkvs: { source: 'tw', link: 'email' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });

      it('should overwrite matching localstorge value and use its remaining values', function () {
        sandbox.stub(utils, 'getWindowLocation').returns({ 'search': '?utm_source=fb&utm_click=dog' });

        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519766113781, // 15 mins before "now"
          expires: 1519787713781, // six hours later
          lastSeen: 1519766113781,
          fpkvs: { source: 'tw', link: 'email' }
        };
        getDataFromLocalStorageStub.withArgs('mgniSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session = {
          id: '987654',
          start: 1519766113781,
          expires: 1519787713781,
          pvid: expectedPvid
        }
        expectedMessage.fpkvs = [
          { key: 'source', value: 'fb' },
          { key: 'link', value: 'email' },
          { key: 'click', value: 'dog' }
        ]

        message.fpkvs.sort((left, right) => left.key < right.key);
        expectedMessage.fpkvs.sort((left, right) => left.key < right.key);

        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: '987654', // should have stayed same
          start: 1519766113781, // should have stayed same
          expires: 1519787713781, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our auction init time
          fpkvs: { source: 'fb', link: 'email', click: 'dog' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });

      it('should throw out session if lastSeen > 30 mins ago and create new one', function () {
        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519764313781, // 45 mins before "now"
          expires: 1519785913781, // six hours later
          lastSeen: 1519764313781, // 45 mins before "now"
          fpkvs: { source: 'tw' }
        };
        getDataFromLocalStorageStub.withArgs('mgniSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });

        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        // session should match what is already in ANALYTICS_MESSAGE, just need to add pvid
        expectedMessage.session.pvid = expectedPvid;

        // the saved fpkvs should have been thrown out since session expired
        expectedMessage.fpkvs = [
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: STUBBED_UUID, // should have generated not used input
          start: 1519767013781, // updated to whenever auction init started
          expires: 1519788613781, // 6 hours after start
          lastSeen: 1519767013781, // lastSeen updated to our "now"
          fpkvs: { link: 'email' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });

      it('should throw out session if past expires time and create new one', function () {
        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519745353781, // 6 hours before "expires"
          expires: 1519766953781, // little more than six hours ago
          lastSeen: 1519767008781, // 5 seconds ago
          fpkvs: { source: 'tw' }
        };
        getDataFromLocalStorageStub.withArgs('mgniSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });

        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        // session should match what is already in ANALYTICS_MESSAGE, just need to add pvid
        expectedMessage.session.pvid = expectedPvid;

        // the saved fpkvs should have been thrown out since session expired
        expectedMessage.fpkvs = [
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: STUBBED_UUID, // should have generated and not used same one
          start: 1519767013781, // updated to whenever auction init started
          expires: 1519788613781, // 6 hours after start
          lastSeen: 1519767013781, // lastSeen updated to our "now"
          fpkvs: { link: 'email' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });
    });

    it('should send gam data if adunit has elementid ortb2 fields', function () {
      // update auction init mock to have the elementids in the adunit
      // and change adUnitCode to be hashes
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.adUnits[0].ortb2Imp.ext.data.elementid = [gptSlot0.getSlotElementId()];
      auctionInit.adUnits[0].code = '1a2b3c4d';

      // bid request
      let bidRequested = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequested.bids[0].adUnitCode = '1a2b3c4d';

      // bid response
      let bidResponse = utils.deepClone(MOCK.BID_RESPONSE);
      bidResponse.adUnitCode = '1a2b3c4d';

      // bidder done
      let bidderDone = utils.deepClone(MOCK.BIDDER_DONE);
      bidderDone.bids[0].adUnitCode = '1a2b3c4d';

      // bidder done
      let bidWon = utils.deepClone(MOCK.BID_WON);
      bidWon.adUnitCode = '1a2b3c4d';

      // Run auction
      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, bidRequested);
      events.emit(BID_RESPONSE, bidResponse);
      events.emit(BIDDER_DONE, bidderDone);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      // emmit gpt events and bidWon
      mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

      events.emit(BID_WON, bidWon);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);
      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);

      // new adUnitCodes in payload
      expectedMessage.auctions[0].adUnits[0].adUnitCode = '1a2b3c4d';
      expectedMessage.bidsWon[0].adUnitCode = '1a2b3c4d';
      expect(message).to.deep.equal(expectedMessage);
    });

    it('should delay the event call depending on analyticsEventDelay config', function () {
      config.setConfig({
        rubicon: {
          analyticsEventDelay: 2000
        }
      });
      performStandardAuction({ eventDelay: 0 });

      // Should not be sent until delay
      expect(server.requests.length).to.equal(0);

      // tick the clock and it should fire
      clock.tick(2000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);

      // The timestamps should be changed from the default by (set eventDelay (2000) - eventDelay default (500))
      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
      expectedMessage.timestamps.eventTime = expectedMessage.timestamps.eventTime + 1500;
      expectedMessage.timestamps.timeSincePageLoad = expectedMessage.timestamps.timeSincePageLoad + 1500;

      expect(message).to.deep.equal(expectedMessage);
    });

    ['seatBidId', 'pbsBidId'].forEach(pbsParam => {
      it(`should overwrite prebid bidId with incoming PBS ${pbsParam}`, function () {
        // bid response
        let seatBidResponse = utils.deepClone(MOCK.BID_RESPONSE);
        seatBidResponse[pbsParam] = 'abc-123-do-re-me';

        // Run auction
        events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
        events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
        events.emit(BID_RESPONSE, seatBidResponse);
        events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
        events.emit(AUCTION_END, MOCK.AUCTION_END);

        // emmit gpt events and bidWon
        mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

        events.emit(BID_WON, MOCK.BID_WON);

        // tick the event delay time plus processing delay
        clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);

        // new adUnitCodes in payload
        expectedMessage.auctions[0].adUnits[0].bids[0].bidId = 'abc-123-do-re-me';
        expectedMessage.auctions[0].adUnits[0].bids[0].oldBidId = '23fcd8cf4bf0d7';
        expectedMessage.bidsWon[0].bidId = 'abc-123-do-re-me';
        expect(message).to.deep.equal(expectedMessage);
      });
    });

    [0, '0'].forEach(pbsParam => {
      it(`should generate new bidId if incoming pbsBidId is ${pbsParam}`, function () {
        // bid response
        let seatBidResponse = utils.deepClone(MOCK.BID_RESPONSE);
        seatBidResponse.pbsBidId = pbsParam;

        // Run auction
        events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
        events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
        events.emit(BID_RESPONSE, seatBidResponse);
        events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
        events.emit(AUCTION_END, MOCK.AUCTION_END);

        // emmit gpt events and bidWon
        mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

        events.emit(BID_WON, MOCK.BID_WON);

        // tick the event delay time plus processing delay
        clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);

        // new adUnitCodes in payload
        expectedMessage.auctions[0].adUnits[0].bids[0].bidId = STUBBED_UUID;
        expectedMessage.auctions[0].adUnits[0].bids[0].oldBidId = '23fcd8cf4bf0d7';
        expectedMessage.bidsWon[0].bidId = STUBBED_UUID;
        expect(message).to.deep.equal(expectedMessage);
      });
    });

    it(`should pick highest cpm if more than one bidResponse comes in`, function () {
      // Run auction
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      const bidResp = utils.deepClone(MOCK.BID_RESPONSE);

      // emit some bid responses
      [1.0, 5.5, 0.1].forEach(cpm => {
        events.emit(BID_RESPONSE, { ...bidResp, cpm });
      });

      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      // emmit gpt events and bidWon
      mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

      events.emit(BID_WON, MOCK.BID_WON);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);
      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);

      // highest cpm in payload
      expectedMessage.auctions[0].adUnits[0].bids[0].bidResponse.bidPriceUSD = 5.5;
      expectedMessage.bidsWon[0].bidResponse.bidPriceUSD = 5.5;
      expect(message).to.deep.equal(expectedMessage);
    });

    it('should send bid won events by themselves if emitted after auction pba payload is sent', function () {
      performStandardAuction({ sendBidWon: false });

      // Now send bidWon
      events.emit(BID_WON, MOCK.BID_WON);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

      // should see two server requests
      expect(server.requests.length).to.equal(2);

      // first is normal analytics event without bidWon
      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
      delete expectedMessage.bidsWon;

      let message = JSON.parse(server.requests[0].requestBody);
      expect(message).to.deep.equal(expectedMessage);

      // second is just a bidWon (remove gam and auction event)
      message = JSON.parse(server.requests[1].requestBody);

      let expectedMessage2 = utils.deepClone(ANALYTICS_MESSAGE);
      delete expectedMessage2.auctions;
      delete expectedMessage2.gamRenders;

      // second event should be event delay time after first one
      expectedMessage2.timestamps.eventTime = expectedMessage.timestamps.eventTime + rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay;
      expectedMessage2.timestamps.timeSincePageLoad = expectedMessage.timestamps.timeSincePageLoad + rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay;

      // trigger is `batched-bidsWon`
      expectedMessage2.trigger = 'batched-bidsWon';

      expect(message).to.deep.equal(expectedMessage2);
    });

    it('should send gamRender events by themselves if emitted after auction pba payload is sent', function () {
      // dont send extra events and hit the batch timeout
      performStandardAuction({ gptEvents: [], sendBidWon: false, eventDelay: rubiConf.analyticsBatchTimeout });

      // Now send gptEvent and bidWon
      mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);
      events.emit(BID_WON, MOCK.BID_WON);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

      // should see two server requests
      expect(server.requests.length).to.equal(2);

      // first is normal analytics event without bidWon or gam
      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
      delete expectedMessage.bidsWon;
      delete expectedMessage.gamRenders;

      // timing changes a bit -> timestamps should be batchTimeout - event delay later
      const expectedExtraTime = rubiConf.analyticsBatchTimeout - rubiConf.analyticsEventDelay;
      expectedMessage.timestamps.eventTime = expectedMessage.timestamps.eventTime + expectedExtraTime;
      expectedMessage.timestamps.timeSincePageLoad = expectedMessage.timestamps.timeSincePageLoad + expectedExtraTime;

      // since gam event did not fire, the trigger should be auctionEnd
      expectedMessage.trigger = 'auctionEnd';

      let message = JSON.parse(server.requests[0].requestBody);
      expect(message).to.deep.equal(expectedMessage);

      // second is gam and bid won
      message = JSON.parse(server.requests[1].requestBody);

      let expectedMessage2 = utils.deepClone(ANALYTICS_MESSAGE);
      // second event should be event delay time after first one
      expectedMessage2.timestamps.eventTime = expectedMessage.timestamps.eventTime + rubiConf.analyticsEventDelay;
      expectedMessage2.timestamps.timeSincePageLoad = expectedMessage.timestamps.timeSincePageLoad + rubiConf.analyticsEventDelay;
      delete expectedMessage2.auctions;

      // trigger should be `batched-bidsWon-gamRender`
      expectedMessage2.trigger = 'batched-bidsWon-gamRenders';

      expect(message).to.deep.equal(expectedMessage2);
    });

    it('should send all events solo if delay and batch set to 0', function () {
      const defaultDelay = rubiConf.analyticsEventDelay;
      config.setConfig({
        rubicon: {
          analyticsBatchTimeout: 0,
          analyticsEventDelay: 0,
          analyticsProcessDelay: 0
        }
      });

      performStandardAuction({ eventDelay: 0 });

      // should be 3 requests
      expect(server.requests.length).to.equal(3);

      // grab expected 3 requests from default message
      let { auctions, gamRenders, bidsWon, ...rest } = utils.deepClone(ANALYTICS_MESSAGE);

      // rest of payload should have timestamps changed to be - default eventDelay since we changed it to 0
      rest.timestamps.eventTime = rest.timestamps.eventTime - defaultDelay;
      rest.timestamps.timeSincePageLoad = rest.timestamps.timeSincePageLoad - defaultDelay;

      // loop through and assert events fired in correct order with correct stuff
      [
        { expectedMessage: { auctions, ...rest }, trigger: 'solo-auction' },
        { expectedMessage: { gamRenders, ...rest }, trigger: 'solo-gam' },
        { expectedMessage: { bidsWon, ...rest }, trigger: 'solo-bidWon' },
      ].forEach((stuff, requestNum) => {
        let message = JSON.parse(server.requests[requestNum].requestBody);
        stuff.expectedMessage.trigger = stuff.trigger;
        expect(message).to.deep.equal(stuff.expectedMessage);
      });
    });

    it(`should correctly mark bids as timed out`, function () {
      // Run auction (simulate bidder timed out in 1000 ms)
      const auctionStart = Date.now() - 1000;
      events.emit(AUCTION_INIT, { ...MOCK.AUCTION_INIT, timestamp: auctionStart });
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      // emit bid timeout
      events.emit(BID_TIMEOUT, [
        {
          auctionId: MOCK.AUCTION_INIT.auctionId,
          adUnitCode: MOCK.AUCTION_INIT.adUnits[0].code,
          bidId: MOCK.BID_REQUESTED.bids[0].bidId,
          transactionId: MOCK.AUCTION_INIT.adUnits[0].transactionId,
        }
      ]);

      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      // emmit gpt events and bidWon
      mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);
      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);

      // should see error time out bid
      expectedMessage.auctions[0].adUnits[0].bids[0].status = 'error';
      expectedMessage.auctions[0].adUnits[0].bids[0].error = {
        code: 'timeout-error',
        description: 'prebid.js timeout' // will help us diff if timeout was set by PBS or PBJS
      };

      // should not see bidResponse or bidsWon
      delete expectedMessage.auctions[0].adUnits[0].bids[0].bidResponse;
      delete expectedMessage.bidsWon;

      // adunit should be marked as error
      expectedMessage.auctions[0].adUnits[0].status = 'error';

      // timed out in 1000 ms
      expectedMessage.auctions[0].adUnits[0].bids[0].clientLatencyMillis = 1000;

      expectedMessage.auctions[0].auctionStart = auctionStart;

      expect(message).to.deep.equal(expectedMessage);
    });

    [
      { name: 'aupname', adUnitPath: 'adUnits.0.ortb2Imp.ext.data.aupname', eventPath: 'auctions.0.adUnits.0.pattern', input: '1234/mycoolsite/*&gpt_leaderboard&deviceType=mobile' },
      { name: 'gpid', adUnitPath: 'adUnits.0.ortb2Imp.ext.gpid', eventPath: 'auctions.0.adUnits.0.gpid', input: '1234/gpid/path' },
      { name: 'pbadslot', adUnitPath: 'adUnits.0.ortb2Imp.ext.data.pbadslot', eventPath: 'auctions.0.adUnits.0.pbAdSlot', input: '1234/pbadslot/path' }
    ].forEach(test => {
      it(`should correctly pass ${test.name}`, function () {
        // bid response
        let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
        utils.deepSetValue(auctionInit, test.adUnitPath, test.input);

        // Run auction
        events.emit(AUCTION_INIT, auctionInit);
        events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
        events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
        events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
        events.emit(AUCTION_END, MOCK.AUCTION_END);

        // emmit gpt events and bidWon
        mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

        events.emit(BID_WON, MOCK.BID_WON);

        // tick the event delay time plus processing delay
        clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        // pattern in payload
        expect(deepAccess(message, test.eventPath)).to.equal(test.input);
      });
    });

    it('should pass bidderDetail for multibid auctions', function () {
      let bidResponse = utils.deepClone(MOCK.BID_RESPONSE);
      bidResponse.targetingBidder = 'rubi2';
      bidResponse.originalRequestId = bidResponse.requestId;
      bidResponse.requestId = '1a2b3c4d5e6f7g8h9';

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, bidResponse);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      // emmit gpt events and bidWon
      mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

      let bidWon = utils.deepClone(MOCK.BID_WON);
      bidWon.bidId = bidWon.requestId = '1a2b3c4d5e6f7g8h9';
      bidWon.bidderDetail = 'rubi2';
      events.emit(BID_WON, bidWon);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

      expect(server.requests.length).to.equal(1);

      let message = JSON.parse(server.requests[0].requestBody);

      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);

      // expect an extra bid added
      expectedMessage.auctions[0].adUnits[0].bids.push({
        ...ANALYTICS_MESSAGE.auctions[0].adUnits[0].bids[0],
        bidderDetail: 'rubi2',
        bidId: '1a2b3c4d5e6f7g8h9'
      });

      // bid won is our extra bid
      expectedMessage.bidsWon[0].bidderDetail = 'rubi2';
      expectedMessage.bidsWon[0].bidId = '1a2b3c4d5e6f7g8h9';

      expect(message).to.deep.equal(expectedMessage);
    });

    it('should pass bidderDetail for multibid auctions', function () {
      // Set the rates
      setConfig({
        adServerCurrency: 'JPY',
        rates: {
          USD: {
            JPY: 100
          }
        }
      });

      // set our bid response to JPY
      let bidResponse = utils.deepClone(MOCK.BID_RESPONSE);
      bidResponse.currency = 'JPY';
      bidResponse.cpm = 100;

      // Now add the bidResponse hook which hooks on the currenct conversion function onto the bid response
      let innerBid;
      addBidResponseHook(function (adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bidResponse);

      // Use the rubi analytics parseBidResponse Function to get the resulting cpm from the bid response!
      const bidResponseObj = parseBidResponse(innerBid);
      expect(bidResponseObj).to.have.property('bidPriceUSD');
      expect(bidResponseObj.bidPriceUSD).to.equal(1.0);
    });

    it('should use the integration type provided in the config instead of the default', () => {
      config.setConfig({
        rubicon: {
          int_type: 'testType'
        }
      })

      performStandardAuction();

      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.integration).to.equal('testType');
    });

    it('should correctly pass bid.source when is s2s', () => {
      // Run auction
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);

      const bidReq = utils.deepClone(MOCK.BID_REQUESTED);
      bidReq.bids[0].src = 's2s';

      events.emit(BID_REQUESTED, bidReq);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      // emmit gpt events and bidWon
      mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);
      events.emit(BID_WON, MOCK.BID_WON);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);
      let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);

      // bid source should be 'server'
      expectedMessage.auctions[0].adUnits[0].bids[0].source = 'server';
      expectedMessage.bidsWon[0].source = 'server';
      expect(message).to.deep.equal(expectedMessage);
    });

    describe('when handling bid caching', () => {
      let auctionInits, bidRequests, bidResponses, bidsWon;
      beforeEach(function () {
        // set timing stuff to 0 so we clearly know when things fire
        config.setConfig({
          useBidCache: true,
          rubicon: {
            analyticsEventDelay: 0,
            analyticsBatchTimeout: 0,
            analyticsProcessDelay: 0
          }
        });

        // setup 3 auctions
        auctionInits = [
          { ...MOCK.AUCTION_INIT, auctionId: 'auctionId-1', adUnits: [{ ...MOCK.AUCTION_INIT.adUnits[0], transactionId: 'tid-1' }] },
          { ...MOCK.AUCTION_INIT, auctionId: 'auctionId-2', adUnits: [{ ...MOCK.AUCTION_INIT.adUnits[0], transactionId: 'tid-2' }] },
          { ...MOCK.AUCTION_INIT, auctionId: 'auctionId-3', adUnits: [{ ...MOCK.AUCTION_INIT.adUnits[0], transactionId: 'tid-3' }] }
        ];
        bidRequests = [
          { ...MOCK.BID_REQUESTED, auctionId: 'auctionId-1', bids: [{ ...MOCK.BID_REQUESTED.bids[0], bidId: 'bidId-1', transactionId: 'tid-1' }] },
          { ...MOCK.BID_REQUESTED, auctionId: 'auctionId-2', bids: [{ ...MOCK.BID_REQUESTED.bids[0], bidId: 'bidId-2', transactionId: 'tid-2' }] },
          { ...MOCK.BID_REQUESTED, auctionId: 'auctionId-3', bids: [{ ...MOCK.BID_REQUESTED.bids[0], bidId: 'bidId-3', transactionId: 'tid-3' }] }
        ];
        bidResponses = [
          { ...MOCK.BID_RESPONSE, auctionId: 'auctionId-1', transactionId: 'tid-1', requestId: 'bidId-1' },
          { ...MOCK.BID_RESPONSE, auctionId: 'auctionId-2', transactionId: 'tid-2', requestId: 'bidId-2' },
          { ...MOCK.BID_RESPONSE, auctionId: 'auctionId-3', transactionId: 'tid-3', requestId: 'bidId-3' },
        ];
        bidsWon = [
          { ...MOCK.BID_WON, auctionId: 'auctionId-1', transactionId: 'tid-1', bidId: 'bidId-1', requestId: 'bidId-1' },
          { ...MOCK.BID_WON, auctionId: 'auctionId-2', transactionId: 'tid-2', bidId: 'bidId-2', requestId: 'bidId-2' },
          { ...MOCK.BID_WON, auctionId: 'auctionId-3', transactionId: 'tid-3', bidId: 'bidId-3', requestId: 'bidId-3' },
        ];
      });
      function runBasicAuction(auctionNum) {
        events.emit(AUCTION_INIT, auctionInits[auctionNum]);
        events.emit(BID_REQUESTED, bidRequests[auctionNum]);
        events.emit(BID_RESPONSE, bidResponses[auctionNum]);
        events.emit(BIDDER_DONE, { ...MOCK.BIDDER_DONE, auctionId: auctionInits[auctionNum].auctionId });
        events.emit(AUCTION_END, { ...MOCK.AUCTION_END, auctionId: auctionInits[auctionNum].auctionId });
      }
      it('should select earliest auction to attach to', () => {
        // get 3 auctions pending to send events
        runBasicAuction(0);
        runBasicAuction(1);
        runBasicAuction(2);

        // emmit a gptEvent should attach to first auction
        mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

        // should be 4 requests so far (3 auctions + 1 gamRender)
        expect(server.requests.length).to.equal(4);

        // 4th should be gamRender and should have Auciton # 1's id's
        const message = JSON.parse(server.requests[3].requestBody);
        const expectedMessage = {
          ...ANALYTICS_MESSAGE.gamRenders[0],
          auctionId: 'auctionId-1',
          transactionId: 'tid-1'
        };
        expect(message.gamRenders).to.deep.equal([expectedMessage]);

        // emit bidWon from first auction
        events.emit(BID_WON, bidsWon[0]);

        // another request which is bidWon
        expect(server.requests.length).to.equal(5);
        const message1 = JSON.parse(server.requests[4].requestBody);
        const expectedMessage1 = {
          ...ANALYTICS_MESSAGE.bidsWon[0],
          sourceAuctionId: 'auctionId-1',
          renderAuctionId: 'auctionId-1',
          sourceTransactionId: 'tid-1',
          renderTransactionId: 'tid-1',
          transactionId: 'tid-1',
          bidId: 'bidId-1',
        };
        expect(message1.bidsWon).to.deep.equal([expectedMessage1]);
      });

      [
        { useBidCache: true, expectedRenderId: 3 },
        { useBidCache: false, expectedRenderId: 2 }
      ].forEach(test => {
        it(`should match bidWon to correct render auction if useBidCache is ${test.useBidCache}`, () => {
          config.setConfig({ useBidCache: test.useBidCache });
          // get 3 auctions pending to send events
          runBasicAuction(0);
          runBasicAuction(1);
          runBasicAuction(2);

          // emmit 3 gpt Events, first two "empty"
          mockGpt.emitEvent(gptSlotRenderEnded0.eventName, {
            slot: gptSlot0,
            isEmpty: true,
          });
          mockGpt.emitEvent(gptSlotRenderEnded0.eventName, {
            slot: gptSlot0,
            isEmpty: true,
          });
          // last one is valid
          mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);

          // should be 6 requests so far (3 auctions + 3 gamRender)
          expect(server.requests.length).to.equal(6);

          // 4th should be gamRender and should have Auciton # 1's id's
          const message = JSON.parse(server.requests[3].requestBody);
          const expectedMessage = {
            auctionId: 'auctionId-1',
            transactionId: 'tid-1',
            isSlotEmpty: true,
            adSlot: 'box'
          };
          expect(message.gamRenders).to.deep.equal([expectedMessage]);

          // 5th should be gamRender and should have Auciton # 2's id's
          const message1 = JSON.parse(server.requests[4].requestBody);
          const expectedMessage1 = {
            auctionId: 'auctionId-2',
            transactionId: 'tid-2',
            isSlotEmpty: true,
            adSlot: 'box'
          };
          expect(message1.gamRenders).to.deep.equal([expectedMessage1]);

          // 6th should be gamRender and should have Auciton # 3's id's
          const message2 = JSON.parse(server.requests[5].requestBody);
          const expectedMessage2 = {
            ...ANALYTICS_MESSAGE.gamRenders[0],
            auctionId: 'auctionId-3',
            transactionId: 'tid-3'
          };
          expect(message2.gamRenders).to.deep.equal([expectedMessage2]);

          // emit bidWon from second auction
          // it should pick out render information from 3rd auction and source from 1st
          events.emit(BID_WON, bidsWon[1]);

          // another request which is bidWon
          expect(server.requests.length).to.equal(7);
          const message3 = JSON.parse(server.requests[6].requestBody);
          const expectedMessage3 = {
            ...ANALYTICS_MESSAGE.bidsWon[0],
            sourceAuctionId: 'auctionId-2',
            renderAuctionId: `auctionId-${test.expectedRenderId}`,
            sourceTransactionId: 'tid-2',
            renderTransactionId: `tid-${test.expectedRenderId}`,
            transactionId: 'tid-2',
            bidId: 'bidId-2'
          };
          if (test.useBidCache) expectedMessage3.isCachedBid = true
          expect(message3.bidsWon).to.deep.equal([expectedMessage3]);
        });
      });

      it('should still fire bidWon if no gam match found', () => {
        // get 3 auctions pending to send events
        runBasicAuction(0);
        runBasicAuction(1);
        runBasicAuction(2);

        // emit bidWon from 3rd auction - it should still fire even though no associated gamRender found
        events.emit(BID_WON, bidsWon[2]);

        // another request which is bidWon
        expect(server.requests.length).to.equal(4);
        const message1 = JSON.parse(server.requests[3].requestBody);
        const expectedMessage1 = {
          ...ANALYTICS_MESSAGE.bidsWon[0],
          sourceAuctionId: 'auctionId-3',
          renderAuctionId: 'auctionId-3',
          sourceTransactionId: 'tid-3',
          renderTransactionId: 'tid-3',
          transactionId: 'tid-3',
          bidId: 'bidId-3',
        };
        expect(message1.bidsWon).to.deep.equal([expectedMessage1]);
      });
    });
  });

  describe('billing events integration', () => {
    beforeEach(function () {
      magniteAdapter.enableAnalytics({
        options: {
          endpoint: '//localhost:9999/event',
          accountId: 1001
        }
      });
      // default dmBilling
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: false,
            vendors: [],
            waitForAuction: true
          }
        }
      })
    });
    afterEach(function () {
      magniteAdapter.disableAnalytics();
    });
    const basicBillingAuction = (billingEvents = []) => {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      billingEvents.forEach(ev => events.emit(BILLABLE_EVENT, ev));

      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);
      events.emit(BID_WON, MOCK.BID_WON);

      // tick the event delay time plus processing delay
      clock.tick(rubiConf.analyticsEventDelay + rubiConf.analyticsProcessDelay);
    }
    it('should ignore billing events when not enabled', () => {
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.billableEvents).to.be.undefined;
    });
    it('should ignore billing events when enabled but vendor is not whitelisted', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true
          }
        }
      });
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.billableEvents).to.be.undefined;
    });
    it('should ignore billing events if billingId is not defined or billingId is not a string', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });
      basicBillingAuction([
        {
          vendor: 'vendorName',
          type: 'auction',
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: true
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: 1233434
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: null
        }
      ]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.billableEvents).to.be.undefined;
    });
    it('should pass along billing event in same payload if same auctionId', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'pageView',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965',
        auctionId: MOCK.AUCTION_INIT.auctionId
      }]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message).to.haveOwnProperty('auctions');
      expect(message.billableEvents).to.deep.equal([{
        accountId: 1001,
        vendor: 'vendorName',
        type: 'pageView',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965',
        auctionId: MOCK.AUCTION_INIT.auctionId
      }]);
    });
    it('should pass NOT pass along billing event in same payload if no auctionId', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965',
      }]);
      expect(server.requests.length).to.equal(2);

      // first is the billing event
      let message = JSON.parse(server.requests[0].requestBody);
      expect(message).to.not.haveOwnProperty('auctions');
      expect(message.billableEvents).to.deep.equal([{
        accountId: 1001,
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);

      // second is auctions
      message = JSON.parse(server.requests[1].requestBody);
      expect(message).to.haveOwnProperty('auctions');
      expect(message).to.not.haveOwnProperty('billableEvents');
    });
    it('should pass along multiple billing events but filter out duplicates', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });
      basicBillingAuction([
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965',
          auctionId: MOCK.AUCTION_INIT.auctionId
        },
        {
          vendor: 'vendorName',
          type: 'impression',
          billingId: '743db6e3-21f2-44d4-917f-cb3488c6076f',
          auctionId: MOCK.AUCTION_INIT.auctionId
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965',
          auctionId: MOCK.AUCTION_INIT.auctionId
        }
      ]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message).to.haveOwnProperty('auctions');
      expect(message.billableEvents).to.deep.equal([
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'auction',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965',
          auctionId: MOCK.AUCTION_INIT.auctionId
        },
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'impression',
          billingId: '743db6e3-21f2-44d4-917f-cb3488c6076f',
          auctionId: MOCK.AUCTION_INIT.auctionId
        }
      ]);
    });
    it('should pass along event right away if no pending auction', () => {
      // off by default
      config.setConfig({
        rubicon: {
          analyticsEventDelay: 0,
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });

      events.emit(BILLABLE_EVENT, {
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      });
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message).to.not.haveOwnProperty('auctions');
      expect(message.billableEvents).to.deep.equal([
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'auction',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
        }
      ]);
    });
    it('should pass along event right away if pending auction but not waiting', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName'],
            waitForAuction: false
          }
        }
      });
      // should fire right away, and then auction later
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
      expect(server.requests.length).to.equal(2);
      const billingRequest = server.requests[0];
      const billingMessage = JSON.parse(billingRequest.requestBody);
      expect(billingMessage).to.not.haveOwnProperty('auctions');
      expect(billingMessage.billableEvents).to.deep.equal([
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'auction',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
        }
      ]);
      // auction event after
      const auctionRequest = server.requests[1];
      const auctionMessage = JSON.parse(auctionRequest.requestBody);
      // should not double pass events!
      expect(auctionMessage).to.not.haveOwnProperty('billableEvents');
    });
  });

  it('getHostNameFromReferer correctly grabs hostname from an input URL', function () {
    let inputUrl = 'https://www.prebid.org/some/path?pbjs_debug=true';
    expect(getHostNameFromReferer(inputUrl)).to.equal('www.prebid.org');
    inputUrl = 'https://www.prebid.com/some/path?pbjs_debug=true';
    expect(getHostNameFromReferer(inputUrl)).to.equal('www.prebid.com');
    inputUrl = 'https://prebid.org/some/path?pbjs_debug=true';
    expect(getHostNameFromReferer(inputUrl)).to.equal('prebid.org');
    inputUrl = 'http://xn--p8j9a0d9c9a.xn--q9jyb4c/';
    expect(typeof getHostNameFromReferer(inputUrl)).to.equal('string');

    // not non-UTF char's in query / path which break if noDecodeWholeURL not set
    inputUrl = 'https://prebid.org/search_results/%95x%8Em%92%CA/?category=000';
    expect(getHostNameFromReferer(inputUrl)).to.equal('prebid.org');
  });

  describe(`handle currency conversions`, () => {
    const origConvertCurrency = getGlobal().convertCurrency;
    afterEach(() => {
      if (origConvertCurrency != null) {
        getGlobal().convertCurrency = origConvertCurrency;
      } else {
        delete getGlobal().convertCurrency;
      }
    });

    it(`should convert successfully`, () => {
      getGlobal().convertCurrency = () => 1.0;
      const bidCopy = utils.deepClone(MOCK.BID_RESPONSE);
      bidCopy.currency = 'JPY';
      bidCopy.cpm = 100;

      const bidResponseObj = parseBidResponse(bidCopy);
      expect(bidResponseObj.conversionError).to.equal(undefined);
      expect(bidResponseObj.ogCurrency).to.equal(undefined);
      expect(bidResponseObj.ogPrice).to.equal(undefined);
      expect(bidResponseObj.bidPriceUSD).to.equal(1.0);
    });

    it(`should catch error and set to zero with conversionError flag true`, () => {
      getGlobal().convertCurrency = () => {
        throw new Error('I am an error');
      };
      const bidCopy = utils.deepClone(MOCK.BID_RESPONSE);
      bidCopy.currency = 'JPY';
      bidCopy.cpm = 100;

      const bidResponseObj = parseBidResponse(bidCopy);
      expect(bidResponseObj.conversionError).to.equal(true);
      expect(bidResponseObj.ogCurrency).to.equal('JPY');
      expect(bidResponseObj.ogPrice).to.equal(100);
      expect(bidResponseObj.bidPriceUSD).to.equal(0);
    });
  });
});
