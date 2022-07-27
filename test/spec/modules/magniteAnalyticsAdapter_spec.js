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

let Ajv = require('ajv');
let schema = require('./magniteAnalyticsSchema.json');
let ajv = new Ajv({
  allErrors: true
});

let validator = ajv.compile(schema);

function validate(message) {
  validator(message);
  expect(validator.errors).to.deep.equal(null);
}

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
  'version': '7.8.0-pre',
  'referrerHostname': 'a-test-domain.com',
  'timestamps': {
    'eventTime': 1519767018781,
    'prebidLoaded': magniteAdapter.MODULE_INITIALIZED_TIME
  },
  'wrapper': {
    'name': '10000_fakewrapper_test'
  },
  'session': {
    'id': '12345678-1234-1234-1234-123456789abc',
    'pvid': '12345678',
    'start': 1519767018781,
    'expires': 1519788618781
  },
  'auctions': [
    {
      'auctionId': '99785e47-a7c8-4c8a-ae05-ef1c717a4b4d',
      'auctionStart': 1658868383741,
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
  'trigger': 'auctionEnd'
}

describe('magnite analytics adapter', function () {
  let sandbox;
  let clock;
  let getDataFromLocalStorageStub, setDataInLocalStorageStub, localStorageIsEnabledStub;
  beforeEach(function () {
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setDataInLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
    mockGpt.disable();
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
        analyticsEventDelay: 0,
        analyticsBatchTimeout: 5000,
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
        analyticsEventDelay: 0,
        analyticsBatchTimeout: 3000,
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
        analyticsEventDelay: 0,
        analyticsBatchTimeout: 3000,
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
    function performStandardAuction(gptEvents, auctionId = MOCK.AUCTION_INIT.auctionId) {
      events.emit(AUCTION_INIT, { ...MOCK.AUCTION_INIT, auctionId });
      events.emit(BID_REQUESTED, { ...MOCK.BID_REQUESTED, auctionId });
      events.emit(BID_RESPONSE, { ...MOCK.BID_RESPONSE, auctionId });
      events.emit(BIDDER_DONE, { ...MOCK.BIDDER_DONE, auctionId });
      events.emit(AUCTION_END, { ...MOCK.AUCTION_END, auctionId });

      if (gptEvents && gptEvents.length) {
        gptEvents.forEach(gptEvent => mockGpt.emitEvent(gptEvent.eventName, gptEvent.params));
      }

      events.emit(BID_WON, { ...MOCK.BID_WON, auctionId });
      clock.tick(rubiConf.analyticsBatchTimeout + 1000);
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
      validate(message);

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
        validate(message);

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
        validate(message);

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
        validate(message);

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
        validate(message);

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
        validate(message);

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
          start: 1519766113781, // should have stayed same
          expires: 1519787713781, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our "now"
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
        validate(message);

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
          lastSeen: 1519767013781, // lastSeen updated to our "now"
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
        validate(message);

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
          id: STUBBED_UUID, // should have stayed same
          start: 1519767013781, // should have stayed same
          expires: 1519788613781, // should have stayed same
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
        validate(message);

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
          id: STUBBED_UUID, // should have stayed same
          start: 1519767013781, // should have stayed same
          expires: 1519788613781, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our "now"
          fpkvs: { link: 'email' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });
    });
  });
});
