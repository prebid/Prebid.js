import r2b2Analytics from '../../../modules/r2b2AnalyticsAdapter';
import {resetAnalyticAdapter} from '../../../modules/r2b2AnalyticsAdapter';
import { expect } from 'chai';
import {EVENTS, AD_RENDER_FAILED_REASON, REJECTION_REASON} from 'src/constants.js';
import * as pbEvents from 'src/events.js';
import * as ajax from 'src/ajax.js';
import * as utils from 'src/utils';
import {getGlobal} from 'src/prebidGlobal';
import * as prebidGlobal from 'src/prebidGlobal';
let adapterManager = require('src/adapterManager').default;

const { NO_BID, AUCTION_INIT, BID_REQUESTED, BID_TIMEOUT, BID_RESPONSE, BID_REJECTED, BIDDER_DONE,
  AUCTION_END, BID_WON, SET_TARGETING, STALE_RENDER, AD_RENDER_SUCCEEDED, AD_RENDER_FAILED, BID_VIEWABLE
} = EVENTS;

const BANNER_SETTING_1 = { 'sizes': [[300, 300], [300, 250]] };
const BANNER_SETTING_2 = { 'sizes': [[320, 150], [320, 50]] };

const AD_UNIT_1_CODE = 'prebid_300x300';
const AD_UNIT_2_CODE = 'prebid_320x150';
const R2B2_PID_1 = 'test.cz/s2s/300x300/mobile';
const R2B2_PID_2 = 'test.cz/s2s/320x150/mobile';
const AD_UNIT_1_TID = '0b3464bb-d80a-490e-8367-a65201a37ba3'
const AD_UNIT_2_TID = 'c8c3643c-9de0-43ea-bcd6-cc0072ec9b45';
const AD_UNIT_2_AD_ID = '22c828c62d44da5';
const AD_UNIT_1 = {
  'code': AD_UNIT_1_CODE,
  'mediaTypes': {
    'banner': BANNER_SETTING_1
  },
  'bids': [{
    'bidder': 'r2b2',
    'params': {'pid': R2B2_PID_1}
  }, {
    'bidder': 'adf',
    'params': {'mid': 1799592}
  }],
  'sizes': BANNER_SETTING_1.sizes,
  'transactionId': AD_UNIT_1_TID,
  'ortb2Imp': {
    'ext': {
      'tid': AD_UNIT_1_TID
    }
  }
}
const AD_UNIT_2 = {
  'code': AD_UNIT_2_CODE,
  'mediaTypes': {
    'banner': BANNER_SETTING_2
  },
  'bids': [{
    'bidder': 'r2b2',
    'params': {'pid': R2B2_PID_2}
  }, {
    'bidder': 'stroeerCore',
    'params': { 'sid': '9532ef8d-e630-45a9-88f6-3eb3eb265d58' }
  }],
  'sizes': BANNER_SETTING_2.sizes,
  'transactionId': AD_UNIT_2_TID,
  'ortb2Imp': {
    'ext': {
      'tid': AD_UNIT_2_TID
    }
  }
};
const AUCTION_ID = '5b912b08-ce23-463c-a6cf-1792f7344430';
const R2B2_BIDDER_REQUEST = {
  'bidderCode': 'r2b2',
  'auctionId': AUCTION_ID,
  'bidderRequestId': '1e5fae5d0ee471',
  'bids': [
    {
      'bidder': 'r2b2',
      'params': {'pid': R2B2_PID_1},
      'mediaTypes': { 'banner': BANNER_SETTING_1 },
      'adUnitCode': AD_UNIT_1_CODE,
      'transactionId': '0b3464bb-d80a-490e-8367-a65201a37ba3',
      'sizes': BANNER_SETTING_1.sizes,
      'bidId': '27434062b8cc94',
      'bidderRequestId': '1e5fae5d0ee471',
      'auctionId': AUCTION_ID,
    },
    {
      'bidder': 'r2b2',
      'params': {'pid': R2B2_PID_2},
      'mediaTypes': { 'banner': BANNER_SETTING_2 },
      'adUnitCode': AD_UNIT_2_CODE,
      'transactionId': 'c8c3643c-9de0-43ea-bcd6-cc0072ec9b45',
      'sizes': BANNER_SETTING_2.sizes,
      'bidId': '3c296eca6b08f4',
      'bidderRequestId': '1e5fae5d0ee471',
      'auctionId': AUCTION_ID,
    }
  ],
  'auctionStart': 1727160493004,
  'timeout': 10000,
  'start': 1727160493009
};
const ADFORM_BIDDER_REQUEST = {
  'bidderCode': 'adf',
  'auctionId': AUCTION_ID,
  'bidderRequestId': '49241b449c60b4',
  'bids': [{
    'bidder': 'adf',
    'params': {
      'mid': 1799592
    },
    'mediaTypes': { 'banner': BANNER_SETTING_1 },
    'adUnitCode': AD_UNIT_1_CODE,
    'transactionId': '0b3464bb-d80a-490e-8367-a65201a37ba3',
    'sizes': BANNER_SETTING_1.sizes,
    'bidId': '54ef5ac3c45b93',
    'bidderRequestId': '49241b449c60b4',
    'auctionId': AUCTION_ID,
  }],
  'auctionStart': 1727160493004,
  'timeout': 10000,
  'start': 1727160493016
}
const STROEER_BIDDER_REQUEST = {
  'bidderCode': 'stroeerCore',
  'auctionId': AUCTION_ID,
  'bidderRequestId': '13f374632545075',
  'bids': [
    {
      'bidder': 'stroeerCore',
      'params': {
        'sid': '9532ef8d-e630-45a9-88f6-3eb3eb265d58'
      },
      'mediaTypes': { 'banner': BANNER_SETTING_2 },
      'adUnitCode': AD_UNIT_2_CODE,
      'transactionId': '0b3464bb-d80a-490e-8367-a65201a37ba3',
      'sizes': BANNER_SETTING_2.sizes,
      'bidId': '14fc718193b4da3',
      'bidderRequestId': '13f374632545075',
      'auctionId': AUCTION_ID,
    },
  ],
  'auctionStart': 1727160493004,
  'timeout': 10000,
  'start': 1727160493023
}
const R2B2_AD_UNIT_2_BID = {
  'bidderCode': 'r2b2',
  'width': 300,
  'height': 100,
  'statusMessage': 'Bid available',
  'adId': '22c828c62d44da5',
  'requestId': '3c296eca6b08f4',
  'transactionId': 'c8c3643c-9de0-43ea-bcd6-cc0072ec9b45',
  'auctionId': AUCTION_ID,
  'mediaType': 'banner',
  'source': 'client',
  'cpm': 1.5,
  'creativeId': '76190558',
  'ttl': 360,
  'netRevenue': true,
  'currency': 'USD',
  'ad': '<div>Test creative</div>',
  'adapterCode': 'r2b2',
  'originalCpm': 1.5,
  'originalCurrency': 'USD',
  'meta': {},
  'responseTimestamp': 1727160493863,
  'requestTimestamp': 1727160493009,
  'bidder': 'r2b2',
  'adUnitCode': AD_UNIT_2_CODE,
  'timeToRespond': 854,
  'size': '300x100',
  'adserverTargeting': {
    'hb_bidder': 'r2b2',
    'hb_adid': AD_UNIT_2_AD_ID,
    'hb_pb': '0.20',
    'hb_size': '300x100',
    'hb_source': 'client',
    'hb_format': 'banner',
    'hb_adomain': '',
    'hb_crid': '76190558'
  },
  'latestTargetedAuctionId': AUCTION_ID,
  'status': 1
}

const MOCK = {
  AUCTION_INIT: {
    adUnitCodes: [AD_UNIT_1_CODE, AD_UNIT_2_CODE],
    adUnits: [AD_UNIT_1, AD_UNIT_2],
    bidderRequests: [R2B2_BIDDER_REQUEST, ADFORM_BIDDER_REQUEST, STROEER_BIDDER_REQUEST],
    auctionId: AUCTION_ID,
  },
  BID_REQUESTED: R2B2_BIDDER_REQUEST,
  BID_RESPONSE: R2B2_AD_UNIT_2_BID,
  BIDDER_DONE: R2B2_BIDDER_REQUEST,
  AUCTION_END: {
    auctionId: AUCTION_ID,
    adUnitCodes: [AD_UNIT_1_CODE, AD_UNIT_2_CODE],
    adUnits: [AD_UNIT_1, AD_UNIT_2],
    bidderRequests: [R2B2_BIDDER_REQUEST, ADFORM_BIDDER_REQUEST, STROEER_BIDDER_REQUEST],
    bidsReceived: [R2B2_AD_UNIT_2_BID],
    bidsRejected: [],
    noBids: [],
    auctionEnd: 1727160493104
  },
  BID_WON: R2B2_AD_UNIT_2_BID,
  SET_TARGETING: {
    [AD_UNIT_2_CODE]: R2B2_AD_UNIT_2_BID.adserverTargeting
  },
  NO_BID: {
    bidder: 'r2b2',
    params: { pid: R2B2_PID_1 },
    mediaTypes: { banner: BANNER_SETTING_1 },
    adUnitCode: AD_UNIT_1_CODE,
    transactionId: 'a0b9d621-6b74-47ce-b7e0-cee5f8e3c124',
    adUnitId: 'b87edd48-9572-431d-a508-e7f956332cec',
    sizes: BANNER_SETTING_1.sizes,
    bidId: '121b6373a78e56b',
    bidderRequestId: '104126936185f0b',
    auctionId: AUCTION_ID,
    src: 'client',
  },
  BID_TIMEOUT: [
    {
      bidder: 'r2b2',
      mediaTypes: { 'banner': BANNER_SETTING_1 },
      adUnitCode: AD_UNIT_1_CODE,
      transactionId: '5629f772-9eae-49fa-a749-119f4d6295f9',
      adUnitId: 'fb3536c6-7bcd-41a2-b96a-cb1764a06675',
      sizes: BANNER_SETTING_1.sizes,
      bidId: '25522556ba65bb72',
      bidderRequestId: '2544c8d7e5b5aba4',
      auctionId: AUCTION_ID,
      timeout: 1000
    },
    {
      bidder: 'r2b2',
      mediaTypes: { 'banner': BANNER_SETTING_1 },
      adUnitCode: AD_UNIT_1_CODE,
      transactionId: '5629f772-9eae-49fa-a749-119f4d6295f9',
      adUnitId: 'fb3536c6-7bcd-41a2-b96a-cb1764a06675',
      sizes: BANNER_SETTING_1.sizes,
      bidId: '25522556ba65bb72',
      bidderRequestId: '2544c8d7e5b5aba4',
      auctionId: AUCTION_ID,
      timeout: 1000
    }
  ],
  AD_RENDER_SUCCEEDED: {
    'doc': {
      'location': {
        'href': 'http://localhost:63342/test/prebid.html',
        'protocol': 'http:',
        'host': 'localhost:63342',
        'hostname': 'localhost',
        'port': '63342',
        'pathname': '/test/prebid.html',
        'hash': '',
        'origin': 'http://localhost:63342',
        'ancestorOrigins': {
          '0': 'http://localhost:63342'
        }
      }
    },
    'bid': R2B2_AD_UNIT_2_BID,
    'adId': R2B2_AD_UNIT_2_BID.adId
  },
  AD_RENDER_FAILED: {
    bidId: '3c296eca6b08f4',
    reason: AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
    message: 'message',
    bid: R2B2_AD_UNIT_2_BID
  },
  STALE_RENDER: R2B2_AD_UNIT_2_BID,
  BID_VIEWABLE: R2B2_AD_UNIT_2_BID
}
function fireEvents(events) {
  return events.map((ev, i) => {
    ev = Array.isArray(ev) ? ev : [ev, {i: i}];
    pbEvents.emit.apply(null, ev)
    return ev;
  });
}

function expectEvents(events, sandbox) {
  events = fireEvents(events);
  return {
    to: {
      beTrackedBy(trackFn) {
        events.forEach(([eventType, args]) => {
          sandbox.assert.calledWithMatch(trackFn, sandbox.match({eventType, args}));
        });
      },
      beBundledTo(bundleFn) {
        events.forEach(([eventType, args]) => {
          sandbox.assert.calledWithMatch(bundleFn, sandbox.match.any, eventType, sandbox.match(args))
        });
      },
    },
  };
}

function validateAndExtractEvents(ajaxStub) {
  expect(ajaxStub.calledOnce).to.equal(true);
  let eventArgs = ajaxStub.firstCall.args[2];
  expect(typeof eventArgs).to.be.equal('string');
  expect(eventArgs.indexOf('events=')).to.be.equal(0);
  let eventsString = eventArgs.substring(7);
  let events = tryParseJSON(eventsString);
  expect(events).to.not.be.undefined;

  return events;
}

function getQueryData(url, decode = false) {
  const queryArgs = url.split('?')[1].split('&');
  return queryArgs.reduce((data, arg) => {
    let [key, val] = arg.split('=');
    if (decode) {
      val = decodeURIComponent(val);
    }
    if (data[key] !== undefined) {
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(val);
    } else {
      data[key] = val;
    }
    return data;
  }, {});
}

function getPrebidEvents(events) {
  return events && events.prebid && events.prebid.e;
}
function getPrebidEventsByName(events, name) {
  let prebidEvents = getPrebidEvents(events);
  if (!prebidEvents) return [];

  let result = [];
  for (let i = 0; i < prebidEvents.length; i++) {
    let event = prebidEvents[i];
    if (event.e === name) {
      result.push(event);
    }
  }

  return result;
}

function tryParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
  }
}
describe('r2b2 Analytics', function () {
  let sandbox;
  let clock;
  let ajaxStub;
  let getGlobalStub;
  let enableAnalytics;

  before(() => {
    enableAnalytics = r2b2Analytics.enableAnalytics;
  })

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    sandbox.stub(pbEvents, 'getEvents').returns([]);
    getGlobalStub = sandbox.stub(prebidGlobal, 'getGlobal').returns({
      getHighestCpmBids: () => [R2B2_AD_UNIT_2_BID]
    });
    ajaxStub = sandbox.stub(ajax, 'ajax');

    adapterManager.registerAnalyticsAdapter({
      code: 'r2b2',
      adapter: r2b2Analytics
    });

    r2b2Analytics.enableAnalytics = enableAnalytics;
  });

  afterEach(() => {
    resetAnalyticAdapter();
    sandbox.restore();
    getGlobalStub.restore();
    ajaxStub.restore();
    r2b2Analytics.disableAnalytics();
  });

  describe('config', () => {
    it('missing domain', () => {
      let logWarnStub = sandbox.stub(utils, 'logWarn');

      adapterManager.enableAnalytics({
        provider: 'r2b2',
        options: {}
      });

      expect(logWarnStub.calledOnce).to.be.true;
      expect(logWarnStub.firstCall.args[0]).to.be.equal('R2B2 Analytics: Mandatory parameter \'domain\' not configured, analytics disabled');
      logWarnStub.restore();
    });

    it('all params error reporting', () => {
      adapterManager.enableAnalytics({
        provider: 'r2b2',
        options: {
          domain: 'test.cz',
          configId: 11,
          configVer: 7,
          server: 'delivery.local',
        }
      });

      fireEvents([
        [BID_RESPONSE, MOCK.BID_RESPONSE],
      ]);

      expect(ajaxStub.calledOnce).to.be.true;
      expect(typeof ajaxStub.firstCall.args[0]).to.be.equal('string');
      let query = getQueryData(ajaxStub.firstCall.args[0], true);
      expect(query['d']).to.be.equal('test.cz');
      expect(query['conf']).to.be.equal('11');
      expect(query['conf_ver']).to.be.equal('7');
    });

    it('all params events reporting', (done) => {
      adapterManager.enableAnalytics({
        provider: 'r2b2',
        options: {
          domain: 'test.cz',
          configId: 11,
          configVer: 7,
          server: 'delivery.local',
        }
      });

      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_RESPONSE, MOCK.BID_RESPONSE],
      ]);

      setTimeout(() => {
        expect(ajaxStub.calledOnce).to.be.true;
        expect(typeof ajaxStub.firstCall.args[0]).to.be.equal('string');
        let query = getQueryData(ajaxStub.firstCall.args[0], true);
        expect(query['hbDomain']).to.be.equal('test.cz');
        expect(query['conf']).to.be.equal('11');
        expect(query['conf_ver']).to.be.equal('7');
        done();
      }, 500);

      clock.tick(500);
    });
  });

  describe('events', () => {
    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'r2b2',
        options: {
          domain: 'test.com',
        }
      });
    });

    it('should catch all events', function () {
      sandbox.spy(r2b2Analytics, 'track');

      expectEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_REQUESTED, MOCK.BID_REQUESTED],
        [BID_RESPONSE, MOCK.BID_RESPONSE],
        [AUCTION_END, MOCK.AUCTION_END],
        [SET_TARGETING, MOCK.SET_TARGETING],
        [BID_WON, MOCK.BID_WON],
      ], sandbox).to.beTrackedBy(r2b2Analytics.track);
    });

    it('should send ajax after delay', (done) => {
      fireEvents([[AUCTION_INIT, MOCK.AUCTION_INIT]]);
      setTimeout(() => {
        expect(ajaxStub.calledOnce).to.equal(true);
        done();
      }, 500);

      clock.tick(500);
    })

    it('auction init content', (done) => {
      fireEvents([[AUCTION_INIT, MOCK.AUCTION_INIT]]);
      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let initEvents = getPrebidEventsByName(events, 'init');
        expect(initEvents.length).to.be.equal(1);
        let initEvent = initEvents[0];
        expect(initEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          u: {
            [AD_UNIT_1_CODE]: ['r2b2', 'adf'],
            [AD_UNIT_2_CODE]: ['r2b2', 'stroeerCore']
          },
          o: 1
        })

        done();
      }, 500);

      clock.tick(500);
    })

    it('auction multiple init', (done) => {
      let auction_init = MOCK.AUCTION_INIT;
      let auction_init_2 = utils.deepClone(MOCK.AUCTION_INIT);
      auction_init_2.auctionId = 'different_auction_id';

      fireEvents([[AUCTION_INIT, auction_init], [AUCTION_INIT, auction_init_2]]);
      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let initEvents = getPrebidEventsByName(events, 'init');
        expect(initEvents.length).to.be.equal(2);
        done();
      }, 500);

      clock.tick(500);
    });

    it('bid requested content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_REQUESTED, MOCK.BID_REQUESTED],
        [BID_REQUESTED, ADFORM_BIDDER_REQUEST],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let bidRequestedEvents = getPrebidEventsByName(events, 'request');
        expect(bidRequestedEvents.length).to.be.equal(2);
        let r2b2BidRequest = bidRequestedEvents[0];
        let adformBidRequest = bidRequestedEvents[1];
        expect(r2b2BidRequest.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: {
            [AD_UNIT_1_CODE]: 1,
            [AD_UNIT_2_CODE]: 1
          }
        });
        expect(adformBidRequest.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'adf',
          u: {[AD_UNIT_1_CODE]: 1}
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('no bid content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [NO_BID, MOCK.NO_BID]
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let noBidEvents = getPrebidEventsByName(events, 'noBid');
        expect(noBidEvents.length).to.be.equal(1);
        let noBidEvent = noBidEvents[0];
        expect(noBidEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_1_CODE
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('bid timeout content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_TIMEOUT, MOCK.BID_TIMEOUT]
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let timeoutEvents = getPrebidEventsByName(events, 'timeout');
        expect(timeoutEvents.length).to.be.equal(1);
        let timeoutEvent = timeoutEvents[0];
        expect(timeoutEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: {
            r2b2: {[AD_UNIT_1_CODE]: 2}
          }
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('bidder done content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BIDDER_DONE, MOCK.BIDDER_DONE]
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let bidderDoneEvents = getPrebidEventsByName(events, 'bidderDone');
        expect(bidderDoneEvents.length).to.be.equal(1);
        let bidderDoneEvent = bidderDoneEvents[0];
        expect(bidderDoneEvent.d).to.be.deep.equal({ ai: AUCTION_ID, b: 'r2b2' });

        done();
      }, 500);

      clock.tick(500);
    });

    it('auction end content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [AUCTION_END, MOCK.AUCTION_END]
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let auctionEndEvents = getPrebidEventsByName(events, 'auction');
        expect(auctionEndEvents.length).to.be.equal(1);
        let auctionEnd = auctionEndEvents[0];
        expect(auctionEnd.d).to.be.deep.equal({
          ai: AUCTION_ID,
          wins: [{
            b: 'r2b2',
            u: AD_UNIT_2_CODE,
            p: 1.5,
            c: 'USD',
            sz: '300x100',
            bi: R2B2_AD_UNIT_2_BID.requestId,
          }],
          u: {[AD_UNIT_2_CODE]: {b: {r2b2: 1}}},
          o: 1,
          bc: 1,
          nbc: 0,
          rjc: 0,
          brc: 4
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('auction end empty auction', (done) => {
      let noBidderRequestsEnd = utils.deepClone(MOCK.AUCTION_END);
      noBidderRequestsEnd.bidderRequests = [];

      fireEvents([
        [AUCTION_END, noBidderRequestsEnd]
      ]);

      setTimeout(() => {
        expect(ajaxStub.calledOnce).to.be.false;

        done();
      }, 500);

      clock.tick(500);
    });

    it('bid response content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_RESPONSE, MOCK.BID_RESPONSE],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let bidResponseEvents = getPrebidEventsByName(events, 'response');
        expect(bidResponseEvents.length).to.be.equal(1);
        let bidResponseEvent = bidResponseEvents[0];
        expect(bidResponseEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          p: 1.5,
          op: 1.5,
          c: 'USD',
          oc: 'USD',
          sz: '300x100',
          st: 1,
          rt: 854,
          bi: R2B2_AD_UNIT_2_BID.requestId,
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('bid rejected content', (done) => {
      let rejectedBid = utils.deepClone(R2B2_AD_UNIT_2_BID);
      rejectedBid.rejectionReason = REJECTION_REASON.FLOOR_NOT_MET;

      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_REJECTED, rejectedBid],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let rejectedBidsEvents = getPrebidEventsByName(events, 'reject');
        expect(rejectedBidsEvents.length).to.be.equal(1);
        let rejectedBidEvent = rejectedBidsEvents[0];
        expect(rejectedBidEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          p: 1.5,
          c: 'USD',
          r: REJECTION_REASON.FLOOR_NOT_MET,
          bi: R2B2_AD_UNIT_2_BID.requestId,
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('bid won content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_WON, MOCK.BID_WON],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let bidWonEvents = getPrebidEventsByName(events, 'bidWon');
        expect(bidWonEvents.length).to.be.equal(1);
        let bidWonEvent = bidWonEvents[0];
        expect(bidWonEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          p: 1.5,
          op: 1.5,
          c: 'USD',
          oc: 'USD',
          sz: '300x100',
          mt: 'banner',
          at: {
            b: 'r2b2',
            sz: '300x100',
            pb: '0.20',
            fmt: 'banner'
          },
          o: 1,
          bi: R2B2_AD_UNIT_2_BID.requestId,
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('bid won content no targeting', (done) => {
      let bidWonWithoutTargeting = utils.deepClone(MOCK.BID_WON);
      bidWonWithoutTargeting.adserverTargeting = {};

      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_WON, bidWonWithoutTargeting],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let bidWonEvents = getPrebidEventsByName(events, 'bidWon');
        expect(bidWonEvents.length).to.be.equal(1);
        let bidWonEvent = bidWonEvents[0];
        expect(bidWonEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          p: 1.5,
          op: 1.5,
          c: 'USD',
          oc: 'USD',
          sz: '300x100',
          mt: 'banner',
          at: {
            b: '',
            sz: '',
            pb: '',
            fmt: ''
          },
          o: 1,
          bi: R2B2_AD_UNIT_2_BID.requestId,
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('targeting content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_RESPONSE, MOCK.BID_RESPONSE],
        [SET_TARGETING, MOCK.SET_TARGETING]
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let setTargetingEvents = getPrebidEventsByName(events, 'targeting');
        expect(setTargetingEvents.length).to.be.equal(1);
        expect(setTargetingEvents[0].d).to.be.deep.equal({
          ai: AUCTION_ID,
          u: {
            [AD_UNIT_2_CODE]: {
              b: 'r2b2',
              sz: '300x100',
              pb: '0.20',
              fmt: 'banner'
            }
          }
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('ad render succeeded content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_RESPONSE, MOCK.BID_RESPONSE],
        [AD_RENDER_SUCCEEDED, MOCK.AD_RENDER_SUCCEEDED],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let setTargetingEvents = getPrebidEventsByName(events, 'render');
        expect(setTargetingEvents.length).to.be.equal(1);
        let setTargeting = setTargetingEvents[0];
        expect(setTargeting.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          p: 1.5,
          c: 'USD',
          sz: '300x100',
          mt: 'banner',
          bi: R2B2_AD_UNIT_2_BID.requestId,
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('ad render failed content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_RESPONSE, MOCK.BID_RESPONSE],
        [AD_RENDER_FAILED, MOCK.AD_RENDER_FAILED],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let renderFailedEvents = getPrebidEventsByName(events, 'renderFail');
        expect(renderFailedEvents.length).to.be.equal(1);
        let renderFailed = renderFailedEvents[0];
        expect(renderFailed.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          p: 1.5,
          c: 'USD',
          r: AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
          bi: R2B2_AD_UNIT_2_BID.requestId,
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('stale render content', (done) => {
      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [STALE_RENDER, MOCK.STALE_RENDER],
      ]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let staleRenderEvents = getPrebidEventsByName(events, 'staleRender');
        expect(staleRenderEvents.length).to.be.equal(1);
        let staleRenderEvent = staleRenderEvents[0];
        expect(staleRenderEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          p: 1.5,
          c: 'USD',
          bi: R2B2_AD_UNIT_2_BID.requestId,
        });

        done();
      }, 500);

      clock.tick(500);
    });

    it('bid viewable content', (done) => {
      let dateStub = sandbox.stub(Date, 'now');
      dateStub.returns(100);

      fireEvents([
        [AUCTION_INIT, MOCK.AUCTION_INIT],
        [BID_RESPONSE, MOCK.BID_RESPONSE],
        [AD_RENDER_SUCCEEDED, MOCK.AD_RENDER_SUCCEEDED]
      ]);

      dateStub.returns(150);

      fireEvents([[BID_VIEWABLE, MOCK.BID_VIEWABLE]]);

      setTimeout(() => {
        let events = validateAndExtractEvents(ajaxStub);
        let bidViewableEvents = getPrebidEventsByName(events, 'view');
        expect(bidViewableEvents.length).to.be.equal(1);
        let bidViewableEvent = bidViewableEvents[0];
        expect(bidViewableEvent.d).to.be.deep.equal({
          ai: AUCTION_ID,
          b: 'r2b2',
          u: AD_UNIT_2_CODE,
          rt: 50,
          bi: R2B2_AD_UNIT_2_BID.requestId
        });

        done();
      }, 500);

      clock.tick(500);
      dateStub.restore();
    });

    it('no auction data error', (done) => {
      fireEvents([
        [BID_RESPONSE, MOCK.BID_RESPONSE],
      ]);

      setTimeout(() => {
        expect(ajaxStub.calledOnce).to.be.true;
        expect(typeof ajaxStub.firstCall.args[0]).to.be.equal('string');
        let query = getQueryData(ajaxStub.firstCall.args[0], true);
        expect(typeof query.m).to.be.equal('string');
        expect(query.m.indexOf('No auction data when creating event')).to.not.be.equal(-1);

        done();
      }, 500);

      clock.tick(500);
    });

    it('empty auction', (done) => {
      let emptyAuctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      emptyAuctionInit.bidderRequests = undefined;
      let emptyAuctionEnd = utils.deepClone(MOCK.AUCTION_END);
      emptyAuctionEnd.bidderRequests = [];

      fireEvents([
        [AUCTION_INIT, emptyAuctionInit],
        [AUCTION_END, emptyAuctionEnd],
      ])

      setTimeout(() => {
        expect(ajaxStub.calledOnce).to.be.true;
        let events = validateAndExtractEvents(ajaxStub);
        let initEvents = getPrebidEventsByName(events, 'init');
        let auctionEndEvents = getPrebidEventsByName(events, 'auction');

        expect(initEvents.length).to.be.equal(1);
        expect(auctionEndEvents.length).to.be.equal(0);

        done();
      }, 500);

      clock.tick(500);
    });
  });
});
