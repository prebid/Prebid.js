import { expect } from 'chai';
import adapterManager, {
  gdprDataHandler,
  coppaDataHandler,
  _partitionBidders,
  PARTITIONS,
  getS2SBidderSet, filterBidsForAdUnit, dep, partitionBidders
} from 'src/adapterManager.js';
import {
  getAdUnits,
  getServerTestingConfig,
  getServerTestingsAds,
  getBidRequests,
  getTwinAdUnits
} from 'test/fixtures/fixtures.js';
import { EVENTS, S2S } from 'src/constants.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { setSizeConfig } from 'modules/sizeMapping.js';
import s2sTesting from 'modules/s2sTesting.js';
import {hook} from '../../../../src/hook.js';
import {auctionManager} from '../../../../src/auctionManager.js';
import {GDPR_GVLIDS} from '../../../../src/consentHandler.js';
import {MODULE_TYPE_ANALYTICS, MODULE_TYPE_BIDDER} from '../../../../src/activities/modules.js';
import {ACTIVITY_FETCH_BIDS, ACTIVITY_REPORT_ANALYTICS} from '../../../../src/activities/activities.js';
import {reset as resetAdUnitCounters} from '../../../../src/adUnits.js';
import {deepClone} from 'src/utils.js';
import {
  EVENT_TYPE_IMPRESSION,
  EVENT_TYPE_WIN,
  TRACKER_METHOD_IMG,
  TRACKER_METHOD_JS
} from '../../../../src/eventTrackers.js';
var events = require('../../../../src/events.js');

const CONFIG = {
  enabled: true,
  endpoint: S2S.DEFAULT_ENDPOINT,
  timeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
  bidders: ['appnexus'],
  accountId: 'abc'
};

const CONFIG2 = {
  enabled: true,
  endpoint: 'https://prebid-server.rubiconproject.com/openrtb2/auction',
  timeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
  bidders: ['pubmatic'],
  accountId: 'def'
}

var prebidServerAdapterMock = {
  bidder: 'prebidServer',
  callBids: sinon.stub()
};
var adequantAdapterMock = {
  bidder: 'adequant',
  callBids: sinon.stub()
};
var appnexusAdapterMock = {
  bidder: 'appnexus',
  callBids: sinon.stub()
};

var rubiconAdapterMock = {
  bidder: 'rubicon',
  callBids: sinon.stub()
};

var pubmaticAdapterMock = {
  bidder: 'rubicon',
  callBids: sinon.stub()
};

var badAdapterMock = {
  bidder: 'badBidder',
  callBids: sinon.stub().throws(Error('some fake error'))
};

describe('adapterManager tests', function () {
  let orgAppnexusAdapter;
  let orgAdequantAdapter;
  let orgPrebidServerAdapter;
  let orgRubiconAdapter;
  let orgBadBidderAdapter;
  let sandbox;
  before(function () {
    orgAppnexusAdapter = adapterManager.bidderRegistry['appnexus'];
    orgAdequantAdapter = adapterManager.bidderRegistry['adequant'];
    orgPrebidServerAdapter = adapterManager.bidderRegistry['prebidServer'];
    orgRubiconAdapter = adapterManager.bidderRegistry['rubicon'];
    orgBadBidderAdapter = adapterManager.bidderRegistry['badBidder'];
  });

  after(function () {
    adapterManager.bidderRegistry['appnexus'] = orgAppnexusAdapter;
    adapterManager.bidderRegistry['adequant'] = orgAdequantAdapter;
    adapterManager.bidderRegistry['prebidServer'] = orgPrebidServerAdapter;
    adapterManager.bidderRegistry['rubicon'] = orgRubiconAdapter;
    adapterManager.bidderRegistry['badBidder'] = orgBadBidderAdapter;
    config.setConfig({s2sConfig: { enabled: false }});
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    s2sTesting.clientTestBidders.clear();
    sandbox.restore();
  });

  describe('callBids', function () {
    before(function () {
      config.setConfig({s2sConfig: { enabled: false }});
      hook.ready();
    });

    beforeEach(function () {
      sinon.stub(utils, 'logError');
      appnexusAdapterMock.callBids.resetHistory();
      appnexusAdapterMock.callBids.resetBehavior()
      adapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
      adapterManager.bidderRegistry['rubicon'] = rubiconAdapterMock;
      adapterManager.bidderRegistry['badBidder'] = badAdapterMock;
      adapterManager.bidderRegistry['badBidder'] = badAdapterMock;
    });

    afterEach(function () {
      utils.logError.restore();
      delete adapterManager.bidderRegistry['appnexus'];
      delete adapterManager.bidderRegistry['rubicon'];
      delete adapterManager.bidderRegistry['badBidder'];
      config.resetConfig();
    });

    it('should log an error if a bidder is used that does not exist', function () {
      const adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'fakeBidder', params: {placementId: 'id'}}
        ]
      }];

      const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      expect(bidRequests.length).to.equal(1);
      expect(bidRequests[0].bidderCode).to.equal('appnexus');
      sinon.assert.called(utils.logError);
    });

    it('should catch a bidder adapter thrown error and continue with other bidders', function () {
      const adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'badBidder', params: {placementId: 'id'}},
          {bidder: 'rubicon', params: {account: 1111, site: 2222, zone: 3333}}
        ]
      }];
      const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);

      const doneBidders = [];
      function mockDoneCB() {
        doneBidders.push(this.bidderCode)
      }
      adapterManager.callBids(adUnits, bidRequests, () => {}, mockDoneCB);
      sinon.assert.calledOnce(appnexusAdapterMock.callBids);
      sinon.assert.calledOnce(badAdapterMock.callBids);
      sinon.assert.calledOnce(rubiconAdapterMock.callBids);

      expect(utils.logError.calledOnce).to.be.true;
      expect(utils.logError.calledWith(
        'badBidder Bid Adapter emitted an uncaught error when parsing their bidRequest'
      )).to.be.true;
      // done should be called for our bidder!
      expect(doneBidders.indexOf('badBidder') === -1).to.be.false;
    });
    it('should emit BID_REQUESTED event', function () {
      // function to count BID_REQUESTED events
      let cnt = 0;
      const count = () => cnt++;
      events.on(EVENTS.BID_REQUESTED, count);
      const bidRequests = [{
        'bidderCode': 'appnexus',
        'auctionId': '1863e370099523',
        'bidderRequestId': '2946b569352ef2',
        'uniquePbsTid': '34566b569352ef2',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': '4799418',
              'test': 'me'
            },
            'adUnitCode': '/19968336/header-bid-tag1',
            'sizes': [[728, 90], [970, 70]],
            'bidId': '392b5a6b05d648',
            'bidderRequestId': '2946b569352ef2',
            'auctionId': '1863e370099523',
            'startTime': 1462918897462,
            'status': 1,
            'transactionId': 'fsafsa'
          },
        ],
        'start': 1462918897460
      }];

      const adUnits = [{
        code: 'adUnit-code',
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
        ]
      }];
      adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
      expect(cnt).to.equal(1);
      sinon.assert.calledOnce(appnexusAdapterMock.callBids);
      events.off(EVENTS.BID_REQUESTED, count);
    });

    it('should give bidders access to bidder-specific config', function(done) {
      const mockBidders = ['rubicon', 'appnexus', 'pubmatic'];
      const bidderRequest = getBidRequests().filter(bidRequest => mockBidders.includes(bidRequest.bidderCode));
      const adUnits = getAdUnits();

      const bidders = {};
      const results = {};
      let cbCount = 0;

      function mock(bidder) {
        bidders[bidder] = adapterManager.bidderRegistry[bidder];
        adapterManager.bidderRegistry[bidder] = {
          callBids: function(bidRequest, addBidResponse, done, ajax, timeout, configCallback) {
            const myResults = results[bidRequest.bidderCode] = [];
            myResults.push(config.getConfig('buildRequests'));
            myResults.push(config.getConfig('test1'));
            myResults.push(config.getConfig('test2'));
            // emulate ajax callback that would register bids
            setTimeout(configCallback(() => {
              myResults.push(config.getConfig('interpretResponse'));
              myResults.push(config.getConfig('afterInterpretResponse'));
              if (++cbCount === Object.keys(bidders).length) {
                assertions();
              }
            }), 1);
            done();
          }
        }
      }

      mockBidders.forEach(bidder => {
        mock(bidder);
      });

      config.setConfig({
        buildRequests: {
          data: 1
        },
        test1: { speedy: true, fun: { test: true } },
        interpretResponse: 'baseInterpret',
        afterInterpretResponse: 'anotherBaseInterpret'
      });
      config.setBidderConfig({
        bidders: [ 'appnexus' ],
        config: {
          buildRequests: {
            test: 2
          },
          test1: { fun: { safe: true, cheap: false } },
          interpretResponse: 'appnexusInterpret'
        }
      });
      config.setBidderConfig({
        bidders: [ 'rubicon' ],
        config: {
          buildRequests: 'rubiconBuild',
          interpretResponse: null
        }
      });
      config.setBidderConfig({
        bidders: [ 'appnexus', 'rubicon' ],
        config: {
          test2: { amazing: true }
        }
      });

      adapterManager.callBids(adUnits, bidderRequest, () => {}, () => {});

      function assertions() {
        expect(results).to.deep.equal({
          'appnexus': [
            {
              data: 1,
              test: 2
            },
            { fun: { safe: true, cheap: false, test: true }, speedy: true },
            { amazing: true },
            'appnexusInterpret',
            'anotherBaseInterpret'
          ],
          'pubmatic': [
            {
              data: 1
            },
            { fun: { test: true }, speedy: true },
            undefined,
            'baseInterpret',
            'anotherBaseInterpret'
          ],
          'rubicon': [
            'rubiconBuild',
            { fun: { test: true }, speedy: true },
            { amazing: true },
            null,
            'anotherBaseInterpret'
          ]
        });

        // restore bid adapters
        Object.keys(bidders).forEach(bidder => {
          adapterManager.bidderRegistry[bidder] = bidders[bidder];
        });
        done();
      }
    });
  });

  describe('callTimedOutBidders', function () {
    var criteoSpec = { onTimeout: sinon.stub() }
    var criteoAdapter = {
      bidder: 'criteo',
      getSpec: function() { return criteoSpec; }
    }
    before(function () {
      config.setConfig({s2sConfig: { enabled: false }});
    });

    beforeEach(function () {
      adapterManager.bidderRegistry['criteo'] = criteoAdapter;
    });

    afterEach(function () {
      delete adapterManager.bidderRegistry['criteo'];
    });

    it('should call spec\'s onTimeout callback when callTimedOutBidders is called', function () {
      const adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids: [
          {bidder: 'criteo', params: {placementId: 'id'}},
        ]
      }];
      const timedOutBidders = [{
        bidId: 'bidId',
        bidder: 'criteo',
        adUnitCode: adUnits[0].code,
        auctionId: 'auctionId',
      }];
      adapterManager.callTimedOutBidders(adUnits, timedOutBidders, CONFIG.timeout);
      sinon.assert.called(criteoSpec.onTimeout);
    });
  }); // end callTimedOutBidders

  describe('bidder spec methods', () => {
    let adUnits, bids, criteoSpec;
    before(function () {
      config.setConfig({s2sConfig: { enabled: false }});
    });

    beforeEach(() => {
      criteoSpec = {}
      adapterManager.bidderRegistry['criteo'] = {
        bidder: 'criteo',
        getSpec: function() { return criteoSpec; },
      }
      bids = [
        {bidder: 'criteo', params: {placementId: 'id'}},
      ];
      adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids
      }];
    });

    afterEach(function () {
      delete adapterManager.bidderRegistry['criteo'];
    });

    describe('onBidWon', function () {
      beforeEach(() => {
        criteoSpec.onBidWon = sinon.stub()
      });
      it('should call spec\'s onBidWon callback when a bid is won', function () {
        adapterManager.callBidWonBidder(bids[0].bidder, bids[0], adUnits);
        sinon.assert.called(criteoSpec.onBidWon);
      });

      it('should NOT call onBidWon when the bid is S2S', () => {
        bids[0].source = S2S.SRC
        adapterManager.callBidWonBidder(bids[0].bidder, bids[0], adUnits);
        sinon.assert.notCalled(criteoSpec.onBidWon);
      })
    });

    describe('triggerBilling', () => {
      beforeEach(() => {
        criteoSpec.onBidBillable = sinon.spy();
        sandbox.stub(utils.internal, 'triggerPixel');
      });
      it('should fire impression pixels from eventtrackers', () => {
        bids[0].eventtrackers = [
          {event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_IMG, url: 'tracker'},
        ]
        adapterManager.triggerBilling(bids[0]);
        sinon.assert.calledWith(utils.internal.triggerPixel, 'tracker');
      });

      it('should NOT fire non-impression or non-pixel trackers', () => {
        bids[0].eventtrackers = [
          {event: EVENT_TYPE_WIN, method: TRACKER_METHOD_IMG, url: 'ignored'},
          {event: EVENT_TYPE_IMPRESSION, method: TRACKER_METHOD_JS, url: 'ignored'},
        ]
        adapterManager.triggerBilling(bids[0]);
        sinon.assert.notCalled(utils.internal.triggerPixel);
      })
      describe('on client bids', () => {
        it('should call bidder\'s onBidBillable', () => {
          adapterManager.triggerBilling(bids[0]);
          sinon.assert.called(criteoSpec.onBidBillable);
        });
        it('should not call again on second trigger', () => {
          adapterManager.triggerBilling(bids[0]);
          adapterManager.triggerBilling(bids[0]);
          sinon.assert.calledOnce(criteoSpec.onBidBillable);
        });
      })
      describe('on s2s bids', () => {
        beforeEach(() => {
          bids[0].source = S2S.SRC;
        });
        it('should not call onBidBillable', () => {
          bids[0].burl = 'burl';
          adapterManager.triggerBilling(bids[0]);
          sinon.assert.notCalled(criteoSpec.onBidBillable);
        });
      });
    })

    describe('onSetTargeting', function () {
      beforeEach(() => {
        criteoSpec.onSetTargeting = sinon.stub()
      })

      it('should call spec\'s onSetTargeting callback when setTargeting is called', function () {
        adapterManager.callSetTargetingBidder(bids[0].bidder, bids[0], adUnits);
        sinon.assert.called(criteoSpec.onSetTargeting);
      });

      it('should NOT call onSetTargeting when bid is S2S', () => {
        bids[0].source = S2S.SRC;
        adapterManager.callSetTargetingBidder(bids[0].bidder, bids[0], adUnits);
        sinon.assert.notCalled(criteoSpec.onSetTargeting);
      })
    }); // end onSetTargeting
    describe('onBidViewable', function () {
      beforeEach(() => {
        criteoSpec.onBidViewable = sinon.stub();
      })
      it('should call spec\'s onBidViewable callback when callBidViewableBidder is called', function () {
        adapterManager.callBidViewableBidder(bids[0].bidder, bids[0]);
        sinon.assert.called(criteoSpec.onBidViewable);
      });
      it('should NOT call onBidViewable when bid is S2S', () => {
        bids[0].source = S2S.SRC;
        adapterManager.callBidViewableBidder(bids[0].bidder, bids[0]);
        sinon.assert.notCalled(criteoSpec.onBidViewable);
      })
    });

    describe('onAdRenderSucceeded', function () {
      beforeEach(() => {
        criteoSpec.onAdRenderSucceeded = sinon.stub()
      });
      it('should call spec\'s onAdRenderSucceeded callback', function () {
        adapterManager.callAdRenderSucceededBidder(bids[0].bidder, bids[0]);
        sinon.assert.called(criteoSpec.onAdRenderSucceeded);
      });
    });
  })
  describe('onBidderError', function () {
    const bidder = 'appnexus';
    const appnexusSpec = { onBidderError: sinon.stub() };
    const appnexusAdapter = {
      bidder,
      getSpec: function() { return appnexusSpec; },
    }
    before(function () {
      config.setConfig({s2sConfig: { enabled: false }});
    });

    beforeEach(function () {
      adapterManager.bidderRegistry[bidder] = appnexusAdapter;
    });

    afterEach(function () {
      delete adapterManager.bidderRegistry[bidder];
    });

    it('should call spec\'s onBidderError callback when callBidderError is called', function () {
      const bidRequests = getBidRequests();
      const bidderRequest = bidRequests.find(bidRequest => bidRequest.bidderCode === bidder);
      const xhrErrorMock = {
        status: 500,
        statusText: 'Internal Server Error'
      };
      adapterManager.callBidderError(bidder, xhrErrorMock, bidderRequest);
      sinon.assert.calledOnce(appnexusSpec.onBidderError);
      sinon.assert.calledWithExactly(appnexusSpec.onBidderError, { error: xhrErrorMock, bidderRequest });
    });
  }); // end onBidderError

  describe('S2S tests', function () {
    beforeEach(function () {
      config.setConfig({s2sConfig: CONFIG});
      adapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      prebidServerAdapterMock.callBids.resetHistory();
      prebidServerAdapterMock.callBids.resetBehavior();
    });

    const bidRequests = [{
      'bidderCode': 'appnexus',
      'auctionId': '1863e370099523',
      'bidderRequestId': '2946b569352ef2',
      'uniquePbsTid': '34566b569352ef2',
      'timeout': 1000,
      'src': 's2s',
      'adUnitsS2SCopy': [
        {
          'code': '/19968336/header-bid-tag1',
          'sizes': [
            {
              'w': 728,
              'h': 90
            },
            {
              'w': 970,
              'h': 90
            }
          ],
          'bids': [
            {
              'bidder': 'appnexus',
              'params': {
                'placementId': '543221',
                'test': 'me'
              },
              'adUnitCode': '/19968336/header-bid-tag1',
              'sizes': [
                [
                  728,
                  90
                ],
                [
                  970,
                  90
                ]
              ],
              'bidId': '68136e1c47023d',
              'bidderRequestId': '55e24a66bed717',
              'auctionId': '1ff753bd4ae5cb',
              'startTime': 1463510220995,
              'status': 1,
              'bid_id': '68136e1c47023d'
            }
          ]
        },
        {
          'code': '/19968336/header-bid-tag-0',
          'sizes': [
            {
              'w': 300,
              'h': 250
            },
            {
              'w': 300,
              'h': 600
            }
          ],
          'bids': [
            {
              'bidder': 'appnexus',
              'params': {
                'placementId': '5324321'
              },
              'adUnitCode': '/19968336/header-bid-tag-0',
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
              'bidId': '7e5d6af25ed188',
              'bidderRequestId': '55e24a66bed717',
              'auctionId': '1ff753bd4ae5cb',
              'startTime': 1463510220996,
              'bid_id': '7e5d6af25ed188'
            }
          ]
        }
      ],
      'bids': [
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '4799418',
            'test': 'me'
          },
          'adUnitCode': '/19968336/header-bid-tag1',
          'sizes': [
            [
              728,
              90
            ],
            [
              970,
              90
            ]
          ],
          'bidId': '392b5a6b05d648',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897462,
          'status': 1,
          'transactionId': 'fsafsa'
        },
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '4799418'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
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
          'bidId': '4dccdc37746135',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897463,
          'status': 1,
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897460
    }];

    it('invokes callBids on the S2S adapter', function () {
      adapterManager.callBids(
        getAdUnits(),
        bidRequests,
        () => {},
        () => () => {}
      );
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });

    // Enable this test when prebidServer adapter is made 1.0 compliant
    it('invokes callBids with only s2s bids', function () {
      const adUnits = getAdUnits();
      // adUnit without appnexus bidder
      adUnits.push({
        'code': '123',
        'sizes': [300, 250],
        'bids': [
          {
            'bidder': 'adequant',
            'params': {
              'publisher_id': '1234567',
              'bidfloor': 0.01
            }
          }
        ]
      });

      adapterManager.callBids(
        adUnits,
        bidRequests,
        () => {},
        () => () => {}
      );
      const requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
      expect(requestObj.ad_units.length).to.equal(2);
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });

    describe('BID_REQUESTED event', function () {
      // function to count BID_REQUESTED events
      let cnt; let count = () => cnt++;

      beforeEach(function () {
        prebidServerAdapterMock.callBids.resetHistory();
        prebidServerAdapterMock.callBids.resetBehavior();
        cnt = 0;
        events.on(EVENTS.BID_REQUESTED, count);
      });

      afterEach(function () {
        events.off(EVENTS.BID_REQUESTED, count);
      });

      it('should fire for s2s requests', function () {
        const adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => ['appnexus'].includes(bid.bidder));
          return adUnit;
        })
        const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(1);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      });

      it('should fire for simultaneous s2s and client requests', function () {
        adapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
        const adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => ['adequant', 'appnexus'].includes(bid.bidder));
          return adUnit;
        })
        const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(2);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
        sinon.assert.calledOnce(adequantAdapterMock.callBids);
        adequantAdapterMock.callBids.resetHistory();
        delete adapterManager.bidderRegistry['adequant'];
      });
    });
  }); // end s2s tests

  describe('Multiple S2S tests', function () {
    beforeEach(function () {
      config.setConfig({s2sConfig: [CONFIG, CONFIG2]});
      adapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      prebidServerAdapterMock.callBids.resetHistory();
      prebidServerAdapterMock.callBids.resetBehavior();
    });

    const bidRequests = [{
      'bidderCode': 'appnexus',
      'auctionId': '1863e370099523',
      'bidderRequestId': '2946b569352ef2',
      'uniquePbsTid': '34566b569352ef2',
      'timeout': 1000,
      'src': 's2s',
      'adUnitsS2SCopy': [
        {
          'code': '/19968336/header-bid-tag1',
          'sizes': [
            {
              'w': 728,
              'h': 90
            },
            {
              'w': 970,
              'h': 90
            }
          ],
          'bids': [
            {
              'bidder': 'appnexus',
              'params': {
                'placementId': '543221',
                'test': 'me'
              },
              'adUnitCode': '/19968336/header-bid-tag1',
              'sizes': [
                [
                  728,
                  90
                ],
                [
                  970,
                  90
                ]
              ],
              'bidId': '68136e1c47023d',
              'bidderRequestId': '55e24a66bed717',
              'auctionId': '1ff753bd4ae5cb',
              'startTime': 1463510220995,
              'status': 1,
              'bid_id': '68136e1c47023d'
            }
          ]
        },
        {
          'code': '/19968336/header-bid-tag-0',
          'sizes': [
            {
              'w': 300,
              'h': 250
            },
            {
              'w': 300,
              'h': 600
            }
          ],
          'bids': [
            {
              'bidder': 'appnexus',
              'params': {
                'placementId': '5324321'
              },
              'adUnitCode': '/19968336/header-bid-tag-0',
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
              'bidId': '7e5d6af25ed188',
              'bidderRequestId': '55e24a66bed717',
              'auctionId': '1ff753bd4ae5cb',
              'startTime': 1463510220996,
              'bid_id': '7e5d6af25ed188'
            }
          ]
        }
      ],
      'bids': [
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '4799418',
            'test': 'me'
          },
          'adUnitCode': '/19968336/header-bid-tag1',
          'sizes': [
            [
              728,
              90
            ],
            [
              970,
              90
            ]
          ],
          'bidId': '392b5a6b05d648',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897462,
          'status': 1,
          'transactionId': 'fsafsa'
        },
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '4799418'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
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
          'bidId': '4dccdc37746135',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897463,
          'status': 1,
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897460
    },
    {
      'bidderCode': 'pubmatic',
      'auctionId': '1863e370099523',
      'bidderRequestId': '2946b569352ef2',
      'uniquePbsTid': '2342342342lfi23',
      'timeout': 1000,
      'src': 's2s',
      'adUnitsS2SCopy': [
        {
          'code': '/19968336/header-bid-tag1',
          'sizes': [
            {
              'w': 728,
              'h': 90
            },
            {
              'w': 970,
              'h': 90
            }
          ],
          'bids': [
            {
              'bidder': 'pubmatic',
              'params': {
                'placementId': '543221',
                'test': 'me'
              },
              'adUnitCode': '/19968336/header-bid-tag1',
              'sizes': [
                [
                  728,
                  90
                ],
                [
                  970,
                  90
                ]
              ],
              'bidId': '68136e1c47023d',
              'bidderRequestId': '55e24a66bed717',
              'auctionId': '1ff753bd4ae5cb',
              'startTime': 1463510220995,
              'status': 1,
              'bid_id': '68136e1c47023d'
            }
          ]
        },
        {
          'code': '/19968336/header-bid-tag-0',
          'sizes': [
            {
              'w': 300,
              'h': 250
            },
            {
              'w': 300,
              'h': 600
            }
          ],
          'bids': [
            {
              'bidder': 'pubmatic',
              'params': {
                'placementId': '5324321'
              },
              'adUnitCode': '/19968336/header-bid-tag-0',
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
              'bidId': '7e5d6af25ed188',
              'bidderRequestId': '55e24a66bed717',
              'auctionId': '1ff753bd4ae5cb',
              'startTime': 1463510220996,
              'bid_id': '7e5d6af25ed188'
            }
          ]
        }
      ],
      'bids': [
        {
          'bidder': 'pubmatic',
          'params': {
            'placementId': '4799418',
            'test': 'me'
          },
          'adUnitCode': '/19968336/header-bid-tag1',
          'sizes': [
            [
              728,
              90
            ],
            [
              970,
              90
            ]
          ],
          'bidId': '392b5a6b05d648',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897462,
          'status': 1,
          'transactionId': '4r42r23r23'
        },
        {
          'bidder': 'pubmatic',
          'params': {
            'placementId': '4799418'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
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
          'bidId': '4dccdc37746135',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897463,
          'status': 1,
          'transactionId': '4r42r23r23'
        }
      ],
      'start': 1462918897460
    }];

    describe('invokes callBids on the S2S adapter', () => {
      let onTimelyResponse, timedOut, done;
      beforeEach(() => {
        done = sinon.stub();
        onTimelyResponse = sinon.stub();
        prebidServerAdapterMock.callBids.callsFake((_1, _2, _3, done) => {
          done(timedOut);
        });
      })

      function runTest() {
        adapterManager.callBids(
          getAdUnits(),
          bidRequests,
          () => {},
          done,
          undefined,
          undefined,
          onTimelyResponse
        );
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
        sinon.assert.calledTwice(done);
      }

      it('and marks requests as timely if the adapter says timedOut = false', function () {
        timedOut = false;
        runTest();
        bidRequests.forEach(br => sinon.assert.calledWith(onTimelyResponse, br.bidderRequestId));
      });

      it('and does NOT mark them as timely if it says timedOut = true', () => {
        timedOut = true;
        runTest();
        sinon.assert.notCalled(onTimelyResponse);
      })
    })

    // Enable this test when prebidServer adapter is made 1.0 compliant
    it('invokes callBids with only s2s bids', function () {
      const adUnits = getAdUnits();
      // adUnit without appnexus bidder
      adUnits.push({
        'code': '123',
        'sizes': [300, 250],
        'bids': [
          {
            'bidder': 'adequant',
            'params': {
              'publisher_id': '1234567',
              'bidfloor': 0.01
            }
          }
        ]
      });

      adapterManager.callBids(
        adUnits,
        bidRequests,
        () => {},
        () => () => {}
      );
      const requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
      expect(requestObj.ad_units.length).to.equal(2);
      sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
    });

    describe('BID_REQUESTED event', function () {
      // function to count BID_REQUESTED events
      let cnt; let count = () => cnt++;

      beforeEach(function () {
        prebidServerAdapterMock.callBids.resetHistory();
        prebidServerAdapterMock.callBids.resetBehavior();
        cnt = 0;
        events.on(EVENTS.BID_REQUESTED, count);
      });

      afterEach(function () {
        events.off(EVENTS.BID_REQUESTED, count);
      });

      it('should fire for s2s requests', function () {
        const adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => ['appnexus', 'pubmatic'].includes(bid.bidder));
          return adUnit;
        })
        const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(2);
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
      });

      it('should have one tid for ALL s2s bidRequests', function () {
        const adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => ['appnexus', 'pubmatic'].includes(bid.bidder));
          return adUnit;
        })
        const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
        const firstBid = prebidServerAdapterMock.callBids.firstCall.args[0];
        const secondBid = prebidServerAdapterMock.callBids.secondCall.args[0];

        // TIDS should be the same
        expect(firstBid.tid).to.equal(secondBid.tid);
      });

      it('should fire for simultaneous s2s and client requests', function () {
        adapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
        const adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => ['adequant', 'appnexus', 'pubmatic'].includes(bid.bidder));
          return adUnit;
        })
        const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(3);
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
        sinon.assert.calledOnce(adequantAdapterMock.callBids);
        adequantAdapterMock.callBids.resetHistory();
        delete adapterManager.bidderRegistry['adequant'];
      });
    });
  }); // end multiple s2s tests

  describe('s2sTesting', function () {
    const doneStub = sinon.stub();
    const ajaxStub = sinon.stub();

    function getTestAdUnits() {
      // copy adUnits
      // return JSON.parse(JSON.stringify(getAdUnits()));
      return utils.deepClone(getAdUnits()).map(adUnit => {
        adUnit.bids = adUnit.bids.filter(bid => ['adequant', 'appnexus', 'rubicon'].includes(bid.bidder));
        return adUnit;
      })
    }

    function callBids(adUnits = getTestAdUnits()) {
      const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      adapterManager.callBids(adUnits, bidRequests, doneStub, ajaxStub);
    }

    function checkServerCalled(numAdUnits, numBids) {
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      const requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
      expect(requestObj.ad_units.length).to.equal(numAdUnits);
      for (let i = 0; i < numAdUnits; i++) {
        expect(requestObj.ad_units[i].bids.filter((bid) => {
          return bid.bidder === 'appnexus' || bid.bidder === 'adequant';
        }).length).to.equal(numBids);
      }
    }

    function checkClientCalled(adapter, numBids) {
      sinon.assert.calledOnce(adapter.callBids);
      expect(adapter.callBids.firstCall.args[0].bids.length).to.equal(numBids);
    }

    const TESTING_CONFIG = utils.deepClone(CONFIG);
    Object.assign(TESTING_CONFIG, {
      bidders: ['appnexus', 'adequant'],
      testing: true
    });
    let stubGetSourceBidderMap;

    beforeEach(function () {
      config.setConfig({s2sConfig: TESTING_CONFIG});
      adapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      adapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
      adapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
      adapterManager.bidderRegistry['rubicon'] = rubiconAdapterMock;

      stubGetSourceBidderMap = sinon.stub(s2sTesting, 'getSourceBidderMap');

      prebidServerAdapterMock.callBids.resetHistory();
      prebidServerAdapterMock.callBids.resetBehavior();
      adequantAdapterMock.callBids.resetHistory();
      adequantAdapterMock.callBids.resetBehavior()
      appnexusAdapterMock.callBids.resetHistory();
      appnexusAdapterMock.callBids.resetBehavior()
      rubiconAdapterMock.callBids.resetHistory();
      rubiconAdapterMock.callBids.resetBehavior();
    });

    afterEach(function () {
      s2sTesting.getSourceBidderMap.restore();
    });

    it('calls server adapter if no sources defined', function () {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: [], [s2sTesting.SERVER]: []});
      callBids();

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client adapter if one client source defined', function () {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus'], [s2sTesting.SERVER]: []});
      callBids();

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client adapters if client sources defined', function () {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      callBids();

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('does not call server adapter for bidders that go to client', function () {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.CLIENT;
      adUnits[0].bids[1].finalSource = s2sTesting.CLIENT;
      adUnits[1].bids[0].finalSource = s2sTesting.CLIENT;
      adUnits[1].bids[1].finalSource = s2sTesting.CLIENT;
      callBids(adUnits);

      // server adapter
      sinon.assert.notCalled(prebidServerAdapterMock.callBids);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('does not call client adapters for bidders that go to server', function () {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.SERVER;
      adUnits[0].bids[1].finalSource = s2sTesting.SERVER;
      adUnits[1].bids[0].finalSource = s2sTesting.SERVER;
      adUnits[1].bids[1].finalSource = s2sTesting.SERVER;
      callBids(adUnits);

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client and server adapters for bidders that go to both', function () {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      var adUnits = getTestAdUnits();
      // adUnits[0].bids[0].finalSource = s2sTesting.BOTH;
      // adUnits[0].bids[1].finalSource = s2sTesting.BOTH;
      // adUnits[1].bids[0].finalSource = s2sTesting.BOTH;
      // adUnits[1].bids[1].finalSource = s2sTesting.BOTH;
      callBids(adUnits);

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('makes mixed client/server adapter calls for mixed bidder sources', function () {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.CLIENT;
      adUnits[0].bids[1].finalSource = s2sTesting.CLIENT;
      adUnits[1].bids[0].finalSource = s2sTesting.SERVER;
      adUnits[1].bids[1].finalSource = s2sTesting.SERVER;
      callBids(adUnits);

      // server adapter
      checkServerCalled(1, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 1);

      // adequant
      checkClientCalled(adequantAdapterMock, 1);
    });
  });

  describe('Multiple Server s2sTesting', function () {
    const doneStub = sinon.stub();
    const ajaxStub = sinon.stub();

    function getTestAdUnits() {
      // copy adUnits
      return utils.deepClone(getAdUnits()).map(adUnit => {
        adUnit.bids = adUnit.bids.filter(bid => {
          return ['adequant', 'appnexus', 'pubmatic', 'rubicon'].includes(bid.bidder);
        });
        return adUnit;
      })
    }

    function callBids(adUnits = getTestAdUnits()) {
      const bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      adapterManager.callBids(adUnits, bidRequests, doneStub, ajaxStub);
    }

    function checkServerCalled(numAdUnits, firstConfigNumBids, secondConfigNumBids) {
      const requestObjects = [];
      let configBids;
      if (firstConfigNumBids === 0 || secondConfigNumBids === 0) {
        configBids = Math.max(firstConfigNumBids, secondConfigNumBids)
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
        const requestObj1 = prebidServerAdapterMock.callBids.firstCall.args[0];
        requestObjects.push(requestObj1)
      } else {
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
        const requestObj1 = prebidServerAdapterMock.callBids.firstCall.args[0];
        const requestObj2 = prebidServerAdapterMock.callBids.secondCall.args[0];
        requestObjects.push(requestObj1, requestObj2);
      }

      requestObjects.forEach((requestObj, index) => {
        const numBids = configBids !== undefined ? configBids : index === 0 ? firstConfigNumBids : secondConfigNumBids
        expect(requestObj.ad_units.length).to.equal(numAdUnits);
        for (let i = 0; i < numAdUnits; i++) {
          expect(requestObj.ad_units[i].bids.filter((bid) => {
            return bid.bidder === 'appnexus' || bid.bidder === 'adequant' || bid.bidder === 'pubmatic';
          }).length).to.equal(numBids);
        }
      })
    }

    function checkClientCalled(adapter, numBids) {
      sinon.assert.calledOnce(adapter.callBids);
      expect(adapter.callBids.firstCall.args[0].bids.length).to.equal(numBids);
    }

    beforeEach(function () {
      adapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      adapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
      adapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
      adapterManager.bidderRegistry['rubicon'] = rubiconAdapterMock;
      adapterManager.bidderRegistry['pubmatic'] = pubmaticAdapterMock;

      prebidServerAdapterMock.callBids.resetHistory();
      adequantAdapterMock.callBids.resetHistory();
      appnexusAdapterMock.callBids.resetHistory();
      rubiconAdapterMock.callBids.resetHistory();
      pubmaticAdapterMock.callBids.resetHistory();
      prebidServerAdapterMock.callBids.resetBehavior();
      adequantAdapterMock.callBids.resetBehavior();
      appnexusAdapterMock.callBids.resetBehavior();
      rubiconAdapterMock.callBids.resetBehavior();
      pubmaticAdapterMock.callBids.resetBehavior();
    });

    it('calls server adapter if no sources defined for config where testing is true, ' +
    'calls client adapter for second config where testing is false', function () {
      const TEST_CONFIG = utils.deepClone(CONFIG);
      Object.assign(TEST_CONFIG, {
        bidders: ['appnexus', 'adequant'],
        testing: true,
      });
      const TEST_CONFIG2 = utils.deepClone(CONFIG2);
      Object.assign(TEST_CONFIG2, {
        bidders: ['pubmatic'],
        testing: true
      });

      config.setConfig({s2sConfig: [TEST_CONFIG, TEST_CONFIG2]});

      callBids();

      // server adapter
      checkServerCalled(2, 2, 1);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);

      // pubmatic
      sinon.assert.notCalled(pubmaticAdapterMock.callBids);

      // rubicon
      sinon.assert.called(rubiconAdapterMock.callBids);
    });

    it('calls client adapter if one client source defined for config where testing is true, ' +
    'calls client adapter for second config where testing is false', function () {
      const TEST_CONFIG = utils.deepClone(CONFIG);
      Object.assign(TEST_CONFIG, {
        bidders: ['appnexus', 'adequant'],
        bidderControl: {
          appnexus: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
        },
        testing: true,
      });
      const TEST_CONFIG2 = utils.deepClone(CONFIG2);
      Object.assign(TEST_CONFIG2, {
        bidders: ['pubmatic'],
        testing: true
      });

      config.setConfig({s2sConfig: [TEST_CONFIG, TEST_CONFIG2]});
      callBids();

      // server adapter
      checkServerCalled(2, 1, 1);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);

      // pubmatic
      sinon.assert.notCalled(pubmaticAdapterMock.callBids);

      // rubicon
      checkClientCalled(rubiconAdapterMock, 1);
    });

    it('calls client adapters if client sources defined in first config and server in second config', function () {
      const TEST_CONFIG = utils.deepClone(CONFIG);
      Object.assign(TEST_CONFIG, {
        bidders: ['appnexus', 'adequant'],
        bidderControl: {
          appnexus: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
          adequant: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
        },
        testing: true,
      });

      const TEST_CONFIG2 = utils.deepClone(CONFIG2);
      Object.assign(TEST_CONFIG2, {
        bidders: ['pubmatic'],
        testing: true
      });

      config.setConfig({s2sConfig: [TEST_CONFIG, TEST_CONFIG2]});

      callBids();

      // server adapter
      checkServerCalled(2, 0, 1);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);

      // pubmatic
      sinon.assert.notCalled(pubmaticAdapterMock.callBids);

      // rubicon
      checkClientCalled(rubiconAdapterMock, 1);
    });

    it('does not call server adapter for bidders that go to client when both configs are set to client', function () {
      const TEST_CONFIG = utils.deepClone(CONFIG);
      Object.assign(TEST_CONFIG, {
        bidders: ['appnexus', 'adequant'],
        bidderControl: {
          appnexus: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
          adequant: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
        },
        testing: true,
      });

      const TEST_CONFIG2 = utils.deepClone(CONFIG2);
      Object.assign(TEST_CONFIG2, {
        bidders: ['pubmatic'],
        bidderControl: {
          pubmatic: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
        },
        testing: true
      });

      config.setConfig({s2sConfig: [TEST_CONFIG, TEST_CONFIG2]});
      callBids();

      sinon.assert.notCalled(prebidServerAdapterMock.callBids);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);

      // pubmatic
      checkClientCalled(pubmaticAdapterMock, 2);

      // rubicon
      checkClientCalled(rubiconAdapterMock, 1);
    });

    it('does not call client adapters for bidders in either config when testServerOnly if true in first config', function () {
      const TEST_CONFIG = utils.deepClone(CONFIG);
      Object.assign(TEST_CONFIG, {
        bidders: ['appnexus', 'adequant'],
        testServerOnly: true,
        bidderControl: {
          appnexus: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
          adequant: {
            bidSource: { server: 100, client: 0 },
            includeSourceKvp: true,
          },
        },
        testing: true,
      });

      const TEST_CONFIG2 = utils.deepClone(CONFIG2);
      Object.assign(TEST_CONFIG2, {
        bidders: ['pubmatic'],
        bidderControl: {
          pubmatic: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          }
        },
        testing: true
      });

      config.setConfig({s2sConfig: [TEST_CONFIG, TEST_CONFIG2]});
      callBids();

      // server adapter
      checkServerCalled(2, 1, 0);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);

      // pubmatic
      sinon.assert.notCalled(pubmaticAdapterMock.callBids);

      // rubicon
      sinon.assert.notCalled(rubiconAdapterMock.callBids);
    });

    it('does not call client adapters for bidders in either config when testServerOnly if true in second config', function () {
      const TEST_CONFIG = utils.deepClone(CONFIG);
      Object.assign(TEST_CONFIG, {
        bidders: ['appnexus', 'adequant'],
        bidderControl: {
          appnexus: {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
          adequant: {
            bidSource: { server: 100, client: 0 },
            includeSourceKvp: true,
          },
        },
        testing: true,
      });

      const TEST_CONFIG2 = utils.deepClone(CONFIG2);
      Object.assign(TEST_CONFIG2, {
        bidders: ['pubmatic'],
        testServerOnly: true,
        bidderControl: {
          pubmatic: {
            bidSource: { server: 100, client: 0 },
            includeSourceKvp: true,
          }
        },
        testing: true
      });

      config.setConfig({s2sConfig: [TEST_CONFIG, TEST_CONFIG2]});
      callBids();

      // server adapter
      checkServerCalled(2, 1, 1);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);

      // pubmatic
      sinon.assert.notCalled(pubmaticAdapterMock.callBids);

      // rubicon
      sinon.assert.notCalled(rubiconAdapterMock.callBids);
    });
  });

  describe('aliasBidderAdaptor', function() {
    const CODE = 'sampleBidder';

    describe('using bidderFactory', function() {
      let spec;

      beforeEach(function () {
        spec = {
          code: CODE,
          isBidRequestValid: () => {},
          buildRequests: () => {},
          interpretResponse: () => {},
          getUserSyncs: () => {}
        };
      });

      it('should add alias to registry when original adapter is using bidderFactory', function() {
        const mediaType = FEATURES.VIDEO ? 'video' : 'banner'
        const thisSpec = Object.assign(spec, { supportedMediaTypes: [mediaType] });
        registerBidder(thisSpec);
        const alias = 'aliasBidder';
        adapterManager.aliasBidAdapter(CODE, alias);
        expect(adapterManager.bidderRegistry).to.have.property(alias);
        if (FEATURES.VIDEO) {
          expect(adapterManager.videoAdapters).to.include(alias);
        }
      });

      it('should use gvlid of original adapter when option set', () => {
        const gvlid = 'origvlid';
        const thisSpec = Object.assign(spec, { gvlid });
        registerBidder(thisSpec);
        const alias = 'bidderWithGvlid';
        adapterManager.aliasBidAdapter(CODE, alias, {useBaseGvlid: true});
        expect(adapterManager.bidderRegistry[alias].getSpec()?.gvlid).to.deep.eql(gvlid);
      })
    });

    describe('special case for s2s-only bidders', function () {
      beforeEach(function () {
        sinon.stub(utils, 'logError');
      });

      afterEach(function () {
        config.resetConfig();
        utils.logError.restore();
      });

      it('should allow an alias if alias is part of s2sConfig.bidders', function () {
        const testS2sConfig = utils.deepClone(CONFIG);
        testS2sConfig.bidders = ['s2sAlias'];
        config.setConfig({s2sConfig: testS2sConfig});

        adapterManager.aliasBidAdapter('s2sBidder', 's2sAlias');
        expect(adapterManager.aliasRegistry).to.have.property('s2sAlias');
      });

      it('should allow an alias if alias is part of s2sConfig.bidders for multiple s2sConfigs', function () {
        const testS2sConfig = utils.deepClone(CONFIG);
        testS2sConfig.bidders = ['s2sAlias'];
        config.setConfig({s2sConfig: [
          testS2sConfig, {
            enabled: true,
            endpoint: 'rp-pbs-endpoint-test.com',
            timeout: 500,
            maxBids: 1,
            adapter: 'prebidServer',
            bidders: ['s2sRpAlias'],
            accountId: 'def'
          }
        ]});

        adapterManager.aliasBidAdapter('s2sBidder', 's2sAlias');
        expect(adapterManager.aliasRegistry).to.have.property('s2sAlias');
        adapterManager.aliasBidAdapter('s2sBidder', 's2sRpAlias');
        expect(adapterManager.aliasRegistry).to.have.property('s2sRpAlias');
      });

      it('should throw an error if alias + bidder are unknown and not part of s2sConfig.bidders', function () {
        const testS2sConfig = utils.deepClone(CONFIG);
        testS2sConfig.bidders = ['s2sAlias'];
        config.setConfig({s2sConfig: testS2sConfig});

        adapterManager.aliasBidAdapter('s2sBidder1', 's2sAlias1');
        sinon.assert.calledOnce(utils.logError);
        expect(adapterManager.aliasRegistry).to.not.have.property('s2sAlias1');
      });
    });
  });

  describe('makeBidRequests', function () {
    let adUnits, twinAdUnits;
    beforeEach(function () {
      resetAdUnitCounters();
      adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
        adUnit.bids = adUnit.bids.filter(bid => ['appnexus', 'rubicon'].includes(bid.bidder));
        return adUnit;
      })
      twinAdUnits = getTwinAdUnits();
    });

    function makeBidRequests(au = adUnits) {
      return adapterManager.makeBidRequests(
        au,
        Date.now(),
        utils.getUniqueIdentifierStr(),
        function callback() {
        },
        []
      );
    }

    if (FEATURES.NATIVE) {
      it('should add nativeParams to adUnits after BEFORE_REQUEST_BIDS', () => {
        function beforeReqBids(adUnits) {
          adUnits.forEach(adUnit => {
            adUnit.mediaTypes.native = {
              type: 'image',
            }
          })
        }

        events.on(EVENTS.BEFORE_REQUEST_BIDS, beforeReqBids);
        makeBidRequests();
        events.off(EVENTS.BEFORE_REQUEST_BIDS, beforeReqBids);
        expect(adUnits.map((u) => u.nativeParams).some(i => i == null)).to.be.false;
      });
    }

    it('should make separate bidder request objects for each bidder', () => {
      adUnits = [utils.deepClone(getAdUnits()[0])];

      const bidRequests = makeBidRequests();

      const sizes1 = bidRequests[1].bids[0].sizes;
      const sizes2 = bidRequests[0].bids[0].sizes;

      // mutate array
      sizes1.splice(0, 1);

      expect(sizes1).not.to.deep.equal(sizes2);
    });

    it('should transfer deferBilling from ad unit', () => {
      adUnits[0].deferBilling = true;
      const requests = makeBidRequests();
      requests.flatMap(req => req.bids).forEach(bidRequest => {
        expect(bidRequest.deferBilling).to.equal(bidRequest.adUnitCode === adUnits[0].code);
      })
    })

    it('should set and increment bidRequestsCounter', () => {
      const [au1, au2] = adUnits;
      makeBidRequests([au1, au2]).flatMap(br => br.bids).forEach(bid => {
        expect(bid.bidRequestsCount).to.eql(1);
      })
      makeBidRequests([au1]);
      makeBidRequests([au1, au2]).flatMap(br => br.bids).forEach(bid => {
        expect(bid.bidRequestsCount).to.eql(bid.adUnitCode === au1.code ? 3 : 2);
      });
    })

    describe('bidderRequestsCounter', () => {
      it('should be set and incremented', () => {
        const [au1, au2] = adUnits;
        makeBidRequests([au1, au2]).flatMap(br => br.bids).forEach(bid => {
          expect(bid.bidderRequestsCount).to.eql(1);
        });
        const au3 = {
          ...au2,
          bids: [
            au2.bids[0]
          ]
        }
        makeBidRequests([au3]);
        const counts = Object.fromEntries(
          makeBidRequests([au1, au2])
            .map(br => [br.bidderCode, Object.fromEntries(br.bids.map(bid => [bid.adUnitCode, bid.bidderRequestsCount]))])
        );
        expect(counts).to.eql({
          rubicon: {
            [au2.code]: 2
          },
          appnexus: {
            [au1.code]: 2,
            [au2.code]: 3
          },
        });
      });

      it('should NOT be incremented for s2s bids', () => {
        config.setConfig({
          s2sConfig: {
            enabled: true,
            adapter: 'rubicon',
            bidders: ['appnexus']
          }
        });
        function expectBidderCounts(bidders) {
          makeBidRequests().forEach(br => {
            br.bids.forEach(bid => expect(bid.bidderRequestsCount).to.exist.and.eql(bidders[br.bidderCode]));
          })
        }
        expectBidderCounts({
          appnexus: 0,
          rubicon: 1
        });
        config.resetConfig();
        expectBidderCounts({
          appnexus: 1,
          rubicon: 2
        })
      })
    });

    describe('adUnitAuctionsCounter', () => {
      it('should set and increment auctionsCount at adUnitCode level', () => {
        const [au1, au2] = adUnits;
        makeBidRequests([au1]).flatMap(br => br.bids).forEach(bid => {
          expect(bid.auctionsCount).to.eql(1);
        });
        makeBidRequests([au1]).flatMap(br => br.bids).forEach(bid => {
          expect(bid.auctionsCount).to.eql(2);
        });
        makeBidRequests([au1, au2]).flatMap(br => br.bids).forEach(bid => {
          expect(bid.auctionsCount).to.eql(bid.adUnitCode === au1.code ? 3 : 1);
        });
      });

      it('should increment the auctionsCount of each adUnitCode exactly once per auction for twin ad units', () => {
        const [au1, au2] = twinAdUnits;
        makeBidRequests([au1, au2]).flatMap(br => br.bids).forEach(bid => {
          expect(bid.auctionsCount).to.eql(1);
        });
        makeBidRequests([au1, au2]).flatMap(br => br.bids).forEach(bid => {
          expect(bid.auctionsCount).to.eql(2);
        });
      });
    });

    describe('and activity controls', () => {
      let redactOrtb2;
      let redactBidRequest;
      const MOCK_BIDDERS = ['1', '2', '3', '4', '5'].map((n) => `mockBidder${n}`);

      beforeEach(() => {
        sinon.stub(dep, 'isAllowed');
        redactOrtb2 = sinon.stub().callsFake(ob => ob);
        redactBidRequest = sinon.stub().callsFake(ob => ob);
        sinon.stub(dep, 'redact').callsFake(() => ({
          ortb2: redactOrtb2,
          bidRequest: redactBidRequest
        }))
        MOCK_BIDDERS.forEach((bidder) => adapterManager.bidderRegistry[bidder] = {});
      });
      afterEach(() => {
        dep.isAllowed.restore();
        dep.redact.restore();
        MOCK_BIDDERS.forEach(bidder => { delete adapterManager.bidderRegistry[bidder] });
        config.resetConfig();
      })
      it('should not generate requests for bidders that cannot fetchBids', () => {
        adUnits = [
          {code: 'one', bids: ['mockBidder1', 'mockBidder2', 'mockBidder3'].map((bidder) => ({bidder}))},
          {code: 'two', bids: ['mockBidder4', 'mockBidder5', 'mockBidder4'].map((bidder) => ({bidder}))}
        ];
        const allowed = ['mockBidder2', 'mockBidder5'];
        dep.isAllowed.callsFake((activity, {componentType, componentName}) => {
          return activity === ACTIVITY_FETCH_BIDS &&
            componentType === MODULE_TYPE_BIDDER &&
            allowed.includes(componentName);
        });
        const reqs = makeBidRequests();
        const bidders = Array.from(new Set(reqs.flatMap(br => br.bids).map(bid => bid.bidder)).keys());
        expect(bidders).to.have.members(allowed);
      });

      it('should redact ortb2 and bid request objects', () => {
        dep.isAllowed.callsFake(() => true);
        adUnits = [
          {code: 'one', bids: [{bidder: 'mockBidder1'}]}
        ];
        const reqs = makeBidRequests();
        sinon.assert.calledWith(redactBidRequest, reqs[0].bids[0]);
        sinon.assert.calledWith(redactOrtb2, reqs[0].ortb2);
      })

      describe('with multiple s2s configs', () => {
        beforeEach(() => {
          config.setConfig({
            s2sConfig: [
              {
                enabled: true,
                adapter: 'mockS2SDefault',
                bidders: ['mockBidder1', 'mockBidder2', 'mockBidder3']
              },
              {
                enabled: true,
                adapter: 'mockS2S1',
                name: 'mock1',
                bidders: ['mockBidder1', 'mockBidder2']
              },
              {
                enabled: true,
                adapter: 'mockS2S2',
                // for backwards compatibility, allow "configName" instead of the more sensible "name"
                configName: 'mock2',
                bidders: ['mockBidder1']
              }
            ]
          });
        });

        it('should allow routing to specific s2s instances using s2sConfigName', () => {
          adUnits = [
            {
              code: 'one', bids: [
                {bidder: 'mockBidder1', s2sConfigName: ['mock1', 'mock2']},
                {bidder: 'mockBidder2', s2sConfigName: 'mock1'},
                {bidder: 'mockBidder3'}
              ]
            },
          ];
          dep.isAllowed.returns(true);
          const requests = makeBidRequests();
          const pbsAdUnits = requests.reduce((acc, request) => {
            if (acc[request.uniquePbsTid] == null) {
              acc[request.uniquePbsTid] = request.adUnitsS2SCopy;
            } else {
              expect(acc[request.uniquePbsTid]).to.eql(request.adUnitsS2SCopy);
            }
            return acc;
          }, {});
          expect(
            Object.values(pbsAdUnits)
              .map(adUnits => adUnits.flatMap(au => au.bids).map(bid => bid.bidder))
          ).to.deep.include.members([
            ['mockBidder3'], // default (unnamed) config - picks up only bidder3 as the rest routes differently
            ['mockBidder1', 'mockBidder2'], // mock1 config
            ['mockBidder1'], // mock2 config
          ])
        });

        it('should keep stored impressions, even if everything else is denied', () => {
          adUnits = [
            {code: 'one', bids: [{bidder: null}]},
            {code: 'two', bids: [{module: 'pbsBidAdapter', params: {configName: 'mock1'}}, {module: 'pbsBidAdapter', params: {configName: 'mock2'}}]}
          ]
          dep.isAllowed.callsFake(({componentType}) => componentType !== 'bidder');
          const bidRequests = makeBidRequests();
          expect(new Set(bidRequests.map(br => br.uniquePbsTid)).size).to.equal(3);
        });

        it('should check if the s2s adapter itself is allowed to fetch bids', () => {
          adUnits = [
            {
              code: 'au',
              bids: [
                {bidder: null},
                {module: 'pbsBidAdapter', params: {configName: 'mock1'}},
                {module: 'pbsBidAdapter', params: {configName: 'mock2'}},
                {bidder: 'mockBidder1'}
              ]
            }
          ];
          dep.isAllowed.callsFake((_, {configName, componentName}) => !(componentName === 'pbsBidAdapter' && configName === 'mock1'));
          const bidRequests = makeBidRequests();
          expect(new Set(bidRequests.map(br => br.uniquePbsTid)).size).to.eql(2)
        });
      });
    });

    it('should make FPD available under `ortb2`', () => {
      const global = {
        k1: 'v1',
        k2: {
          k3: 'v3',
          k4: 'v4'
        }
      };
      const bidder = {
        'appnexus': {
          ka: 'va',
          k2: {
            k3: 'override',
            k5: 'v5'
          }
        }
      };
      const requests = Object.fromEntries(
        adapterManager.makeBidRequests(adUnits, 123, 'auction-id', 123, [], {global, bidder})
          .map((r) => [r.bidderCode, r])
      );
      sinon.assert.match(requests, {
        rubicon: {
          ortb2: global
        },
        appnexus: {
          ortb2: {
            k1: 'v1',
            ka: 'va',
            k2: {
              k3: 'override',
              k4: 'v4',
              k5: 'v5',
            }
          }
        }
      });
      requests.rubicon.bids.forEach((bid) => expect(bid.ortb2).to.eql(requests.rubicon.ortb2));
      requests.appnexus.bids.forEach((bid) => expect(bid.ortb2).to.eql(requests.appnexus.ortb2));
    });

    describe('transaction IDs', () => {
      beforeEach(() => {
        sinon.stub(dep, 'redact').returns({
          ortb2: (o) => o,
          bidRequest: (b) => b,
        });
      });
      afterEach(() => {
        dep.redact.restore();
      });

      function makeRequests(ortb2Fragments = {}) {
        return adapterManager.makeBidRequests(adUnits, 0, 'mockAuctionId', 1000, [], ortb2Fragments);
      }

      it('should NOT populate source.tid with auctionId', () => {
        const reqs = makeRequests();
        expect(reqs[0].ortb2.source.tid).to.not.equal('mockAuctionId');
      });
      it('should override source.tid if specified in FPD', () => {
        const reqs = makeRequests({
          global: {
            source: {
              tid: 'tid'
            }
          },
          rubicon: {
            source: {
              tid: 'tid'
            }
          }
        });
        reqs.forEach(req => {
          expect(req.ortb2.source.tid).to.exist;
          expect(req.ortb2.source.tid).to.not.eql('tid');
        });
        expect(reqs[0].ortb2.source.tid).to.not.eql(reqs[1].ortb2.source.tid);
      });
      it('should generate ortb2Imp.ext.tid', () => {
        const reqs = makeRequests();
        const tids = new Set(reqs.flatMap(br => br.bids).map(b => b.ortb2Imp?.ext?.tid));
        expect(tids.size).to.eql(3);
      });
      it('should override ortb2Imp.ext.tid if specified in FPD', () => {
        adUnits[0].ortb2Imp = adUnits[1].ortb2Imp = {
          ext: {
            tid: 'tid'
          }
        };
        const reqs = makeRequests();
        expect(reqs[0].bids[0].ortb2Imp.ext.tid).to.not.eql('tid');
      });
      it('should use matching ext.tid if transactionId match', () => {
        adUnits[1].transactionId = adUnits[0].transactionId;
        const reqs = makeRequests();
        reqs.forEach(br => {
          expect(new Set(br.bids.map(b => b.ortb2Imp.ext.tid)).size).to.eql(1);
        })
      });
      describe('when the same bidder is routed to both client and server', () => {
        function route(next) {
          next.bail({
            [PARTITIONS.CLIENT]: ['rubicon'],
            [PARTITIONS.SERVER]: ['rubicon']
          })
        }
        before(() => {
          partitionBidders.before(route, 99)
        });
        after(() => {
          partitionBidders.getHooks({hook: route}).remove();
        });
        beforeEach(() => {
          config.setConfig({
            s2sConfig: {
              enabled: true,
              bidders: ['rubicon']
            }
          })
        })
        it('should use the same source.tid', () => {
          const reqs = makeRequests();
          expect(reqs[0].ortb2.source.tid).to.eql(reqs[1].ortb2.source.tid);
        })
      })
    });

    it('should merge in bid-level ortb2Imp with adUnit-level ortb2Imp', () => {
      const adUnit = {
        ...adUnits[1],
        ortb2Imp: {oneone: {twoone: 'val'}, onetwo: 'val'}
      };
      adUnit.bids[0].ortb2Imp = {oneone: {twotwo: 'val'}, onethree: 'val', onetwo: 'val2'};
      const reqs = Object.fromEntries(
        adapterManager.makeBidRequests([adUnit], 123, 'auction-id', 123, [], {})
          .map((req) => [req.bidderCode, req])
      );
      sinon.assert.match(reqs[adUnit.bids[0].bidder].bids[0].ortb2Imp, {
        oneone: {
          twoone: 'val',
          twotwo: 'val',
        },
        onetwo: 'val2',
        onethree: 'val'
      })
      sinon.assert.match(reqs[adUnit.bids[1].bidder].bids[0].ortb2Imp, adUnit.ortb2Imp)
    })

    it('picks ortb2Imp from "module" when only one s2sConfig is set', () => {
      config.setConfig({
        s2sConfig: [
          {
            enabled: true,
            adapter: 'mockS2S1',
          }
        ]
      });
      const adUnit = {
        code: 'mockau',
        ortb2Imp: {
          p1: 'adUnit'
        },
        bids: [
          {
            module: 'pbsBidAdapter',
            ortb2Imp: {
              p2: 'module'
            }
          }
        ]
      };
      const req = adapterManager.makeBidRequests([adUnit], 123, 'auction-id', 123, [], {})[0];
      [req.adUnitsS2SCopy[0].ortb2Imp, req.bids[0].ortb2Imp].forEach(imp => {
        sinon.assert.match(imp, {
          p1: 'adUnit',
          p2: 'module'
        });
      });
    });

    describe('with named s2s configs', () => {
      beforeEach(() => {
        config.setConfig({
          s2sConfig: [
            {
              enabled: true,
              adapter: 'mockS2S1',
              configName: 'one',
              bidders: ['A']
            },
            {
              enabled: true,
              adapter: 'mockS2S2',
              configName: 'two',
              bidders: ['B']
            }
          ]
        })
      });

      it('generates requests for "module" bids', () => {
        const adUnit = {
          code: 'mockau',
          ortb2Imp: {
            p1: 'adUnit'
          },
          bids: [
            {
              module: 'pbsBidAdapter',
              params: {configName: 'one'},
              ortb2Imp: {
                p2: 'one'
              }
            },
            {
              module: 'pbsBidAdapter',
              params: {configName: 'two'},
              ortb2Imp: {
                p2: 'two'
              }
            }
          ]
        };
        const reqs = adapterManager.makeBidRequests([adUnit], 123, 'auction-id', 123, [], {});
        [reqs[0].adUnitsS2SCopy[0].ortb2Imp, reqs[0].bids[0].ortb2Imp].forEach(imp => {
          sinon.assert.match(imp, {
            p1: 'adUnit',
            p2: 'one'
          })
        });
        [reqs[1].adUnitsS2SCopy[0].ortb2Imp, reqs[1].bids[0].ortb2Imp].forEach(imp => {
          sinon.assert.match(imp, {
            p1: 'adUnit',
            p2: 'two'
          })
        });
      });

      it('applies module-level ortb2Imp to "normal" s2s requests', () => {
        const adUnit = {
          code: 'mockau',
          ortb2Imp: {
            p1: 'adUnit'
          },
          bids: [
            {
              module: 'pbsBidAdapter',
              params: {configName: 'one'},
              ortb2Imp: {
                p2: 'one'
              }
            },
            {
              bidder: 'A',
              ortb2Imp: {
                p3: 'bidderA'
              }
            }
          ]
        };
        const reqs = adapterManager.makeBidRequests([adUnit], 123, 'auction-id', 123, [], {});
        expect(reqs.length).to.equal(1);
        sinon.assert.match(reqs[0].adUnitsS2SCopy[0].ortb2Imp, {
          p1: 'adUnit',
          p2: 'one'
        })
        sinon.assert.match(reqs[0].bids[0].ortb2Imp, {
          p1: 'adUnit',
          p2: 'one',
          p3: 'bidderA'
        })
      });
    });

    describe('when calling the s2s adapter', () => {
      beforeEach(() => {
        config.setConfig({
          s2sConfig: {
            enabled: true,
            adapter: 'mockS2S',
            bidders: ['appnexus']
          }
        })
        adapterManager.bidderRegistry.mockS2S = {
          callBids: sinon.stub()
        };
      });
      afterEach(() => {
        config.resetConfig();
        delete adapterManager.bidderRegistry.mockS2S;
      })

      it('should pass FPD', () => {
        const ortb2Fragments = {};
        const req = {
          bidderCode: 'appnexus',
          src: S2S.SRC,
          adUnitsS2SCopy: adUnits,
          bids: [{
            bidder: 'appnexus',
            src: S2S.SRC
          }]
        };
        adapterManager.callBids(adUnits, [req], sinon.stub(), sinon.stub(), {request: sinon.stub(), done: sinon.stub()}, 1000, sinon.stub(), ortb2Fragments);
        sinon.assert.calledWith(adapterManager.bidderRegistry.mockS2S.callBids, sinon.match({
          ortb2Fragments: sinon.match.same(ortb2Fragments)
        }));
      });
    })

    describe('setBidderSequence', function () {
      beforeEach(function () {
        sinon.spy(utils, 'shuffle');
      });

      afterEach(function () {
        config.resetConfig();
        utils.shuffle.restore();
      });

      it('setting to `random` uses shuffled order of adUnits', function () {
        config.setConfig({ bidderSequence: 'random' });
        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );
        sinon.assert.calledOnce(utils.shuffle);
      });
    });

    describe('sizeMapping', function () {
      let sandbox;
      beforeEach(function () {
        sandbox = sinon.createSandbox();
        // always have matchMedia return true for us
        sandbox.stub(utils.getWindowTop(), 'matchMedia').callsFake(() => ({matches: true}));
      });

      afterEach(function () {
        sandbox.restore();
        config.resetConfig();
        setSizeConfig([]);
      });

      it('should not filter banner bids w/ no labels', function () {
        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );

        expect(bidRequests.length).to.equal(2);
        const rubiconBidRequests = bidRequests.find(bidRequest => bidRequest.bidderCode === 'rubicon');
        expect(rubiconBidRequests.bids.length).to.equal(1);
        expect(rubiconBidRequests.bids[0].mediaTypes).to.deep.equal(adUnits.find(adUnit => adUnit.code === rubiconBidRequests.bids[0].adUnitCode).mediaTypes);

        const appnexusBidRequests = bidRequests.find(bidRequest => bidRequest.bidderCode === 'appnexus');
        expect(appnexusBidRequests.bids.length).to.equal(2);
        expect(appnexusBidRequests.bids[0].mediaTypes).to.deep.equal(adUnits.find(adUnit => adUnit.code === appnexusBidRequests.bids[0].adUnitCode).mediaTypes);
        expect(appnexusBidRequests.bids[1].mediaTypes).to.deep.equal(adUnits.find(adUnit => adUnit.code === appnexusBidRequests.bids[1].adUnitCode).mediaTypes);
      });

      it('should not filter native bids', function () {
        setSizeConfig([{
          'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
          'sizesSupported': [
            [728, 90],
            [300, 250]
          ],
          'labels': ['tablet', 'phone']
        }]);

        const nativeAdUnits = [{
          code: 'test_native',
          sizes: [[1, 1]],
          mediaTypes: {
            native: {
              title: { required: true },
              body: { required: false },
              image: { required: true },
              icon: { required: false },
              sponsoredBy: { required: true },
              clickUrl: { required: true },
            },
          },
          bids: [
            {
              bidder: 'appnexus',
              params: { placementId: 13232354 }
            },
          ]
        }];
        const bidRequests = adapterManager.makeBidRequests(
          nativeAdUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );
        expect(bidRequests[0].bids[0].sizes).to.deep.equal([]);
      });

      it('should filter sizes using size config', function () {
        const validSizes = [
          [728, 90],
          [300, 250]
        ];

        const validSizeMap = validSizes.map(size => size.toString()).reduce((map, size) => {
          map[size] = true;
          return map;
        }, {});

        setSizeConfig([{
          'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
          'sizesSupported': validSizes,
          'labels': ['tablet', 'phone']
        }]);

        let bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );

        // only valid sizes as specified in size config should show up in bidRequests
        bidRequests.forEach(bidRequest => {
          bidRequest.bids.forEach(bid => {
            bid.sizes.forEach(size => {
              expect(validSizeMap[size]).to.equal(true);
            });
          });
        });

        setSizeConfig([{
          'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
          'sizesSupported': [],
          'labels': ['tablet', 'phone']
        }]);

        bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );

        // if no valid sizes, all bidders should be filtered out
        expect(bidRequests.length).to.equal(0);
      });

      it('should filter adUnits/bidders based on applied labels', function () {
        adUnits[0].labelAll = ['visitor-uk', 'mobile'];
        adUnits[1].labelAny = ['visitor-uk', 'desktop'];
        adUnits[1].bids[0].labelAny = ['mobile'];
        adUnits[1].bids[1].labelAll = ['desktop'];

        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          ['visitor-uk', 'desktop']
        );

        // only one adUnit and one bid from that adUnit should make it through the applied labels above
        expect(bidRequests.length).to.equal(1);
        expect(bidRequests[0].bidderCode).to.equal('rubicon');
        expect(bidRequests[0].bids.length).to.equal(1);
        expect(bidRequests[0].bids[0].adUnitCode).to.equal(adUnits[1].code);
      });

      it('should filter adUnits/bidders based on applid labels for s2s requests', function () {
        adUnits[0].labelAll = ['visitor-uk', 'mobile'];
        adUnits[1].labelAny = ['visitor-uk', 'desktop'];
        adUnits[1].bids[0].labelAny = ['mobile'];
        adUnits[1].bids[1].labelAll = ['desktop'];

        const TESTING_CONFIG = utils.deepClone(CONFIG);
        TESTING_CONFIG.bidders = ['appnexus', 'rubicon'];
        config.setConfig({ s2sConfig: TESTING_CONFIG });

        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          ['visitor-uk', 'desktop']
        );

        expect(bidRequests.length).to.equal(1);
        expect(bidRequests[0].adUnitsS2SCopy.length).to.equal(1);
        expect(bidRequests[0].adUnitsS2SCopy[0].bids.length).to.equal(1);
        expect(bidRequests[0].adUnitsS2SCopy[0].bids[0].bidder).to.equal('rubicon');
        expect(bidRequests[0].adUnitsS2SCopy[0].labelAny).to.deep.equal(['visitor-uk', 'desktop']);
      });
    });

    describe('gdpr consent module', function () {
      it('inserts gdprConsent object to bidRequest only when module was enabled', function () {
        gdprDataHandler.setConsentData({
          consentString: 'abc123def456',
          consentRequired: true
        });

        let bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );
        expect(bidRequests[0].gdprConsent.consentString).to.equal('abc123def456');
        expect(bidRequests[0].gdprConsent.consentRequired).to.be.true;

        gdprDataHandler.setConsentData(null);

        bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );
        expect(bidRequests[0].gdprConsent).to.be.undefined;
      });
    });
    describe('coppa consent module', function () {
      afterEach(() => {
        config.resetConfig();
      });
      it('test coppa configuration with value false', function () {
        config.setConfig({ coppa: 0 });
        const coppa = coppaDataHandler.getCoppa();
        expect(coppa).to.be.false;
      });
      it('test coppa configuration with value true', function () {
        config.setConfig({ coppa: 1 });
        const coppa = coppaDataHandler.getCoppa();
        expect(coppa).to.be.true;
      });
      it('test coppa configuration', function () {
        const coppa = coppaDataHandler.getCoppa();
        expect(coppa).to.be.false;
      });
    });
    describe('s2sTesting - testServerOnly', () => {
      beforeEach(() => {
        config.setConfig({ s2sConfig: getServerTestingConfig(CONFIG) });
        s2sTesting.bidSource = {};
      });

      afterEach(() => {
        config.resetConfig();
      });

      const makeBidRequests = ads => {
        const bidRequests = adapterManager.makeBidRequests(
          ads, 1111, 2222, 1000
        );

        bidRequests.sort((a, b) => {
          if (a.bidderCode < b.bidderCode) return -1;
          if (a.bidderCode > b.bidderCode) return 1;
          return 0;
        });

        return bidRequests;
      };

      const removeAdUnitsBidSource = adUnits => adUnits.map(adUnit => {
        const newAdUnit = { ...adUnit };
        newAdUnit.bids = newAdUnit.bids.map(bid => {
          if (bid.bidSource) delete bid.bidSource;
          return bid;
        });
        return newAdUnit;
      });

      it('suppresses all client bids if there are server bids resulting from bidSource at the adUnit Level', () => {
        const bidRequests = makeBidRequests(getServerTestingsAds());

        expect(bidRequests).lengthOf(2);

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[0].bids[0].bidder).equals('openx');
        expect(bidRequests[0].bids[0].finalSource).equals('server');

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[1].bids[0].bidder).equals('rubicon');
        expect(bidRequests[1].bids[0].finalSource).equals('server');
      });

      // todo: update description
      it('suppresses all, and only, client bids if there are bids resulting from bidSource at the adUnit Level', () => {
        const ads = getServerTestingsAds();

        // change this adUnit to be server based
        ads[1].bids[1].bidSource.client = 0;
        ads[1].bids[1].bidSource.server = 100;

        const bidRequests = makeBidRequests(ads);

        expect(bidRequests).lengthOf(3);

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[0].bids[0].bidder).equals('appnexus');
        expect(bidRequests[0].bids[0].finalSource).equals('server');

        expect(bidRequests[1].bids).lengthOf(1);
        expect(bidRequests[1].bids[0].bidder).equals('openx');
        expect(bidRequests[1].bids[0].finalSource).equals('server');

        expect(bidRequests[2].bids).lengthOf(1);
        expect(bidRequests[2].bids[0].bidder).equals('rubicon');
        expect(bidRequests[2].bids[0].finalSource).equals('server');
      });

      // we have a server call now
      it('does not suppress client bids if no "test case" bids result in a server bid', () => {
        const ads = getServerTestingsAds();

        // change this adUnit to be client based
        ads[0].bids[0].bidSource.client = 100;
        ads[0].bids[0].bidSource.server = 0;

        const bidRequests = makeBidRequests(ads);

        expect(bidRequests).lengthOf(4);

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[0].bids[0].bidder).equals('adequant');
        expect(bidRequests[0].bids[0].finalSource).equals('client');

        expect(bidRequests[1].bids).lengthOf(2);
        expect(bidRequests[1].bids[0].bidder).equals('appnexus');
        expect(bidRequests[1].bids[0].finalSource).equals('client');
        expect(bidRequests[1].bids[1].bidder).equals('appnexus');
        expect(bidRequests[1].bids[1].finalSource).equals('client');

        expect(bidRequests[2].bids).lengthOf(1);
        expect(bidRequests[2].bids[0].bidder).equals('openx');
        expect(bidRequests[2].bids[0].finalSource).equals('server');

        expect(bidRequests[3].bids).lengthOf(2);
        expect(bidRequests[3].bids[0].bidder).equals('rubicon');
        expect(bidRequests[3].bids[0].finalSource).equals('client');
        expect(bidRequests[3].bids[1].bidder).equals('rubicon');
        expect(bidRequests[3].bids[1].finalSource).equals('client');
      });

      it(
        'should surpress client side bids if no ad unit bidSources are set, ' +
        'but bidderControl resolves to server',
        () => {
          const ads = removeAdUnitsBidSource(getServerTestingsAds());

          const bidRequests = makeBidRequests(ads);

          expect(bidRequests).lengthOf(2);

          expect(bidRequests[0].bids).lengthOf(1);
          expect(bidRequests[0].bids[0].bidder).equals('openx');
          expect(bidRequests[0].bids[0].finalSource).equals('server');

          expect(bidRequests[1].bids).lengthOf(2);
          expect(bidRequests[1].bids[0].bidder).equals('rubicon');
          expect(bidRequests[1].bids[0].finalSource).equals('server');
        }
      );
    });

    describe('Multiple s2sTesting - testServerOnly', () => {
      beforeEach(() => {
        config.setConfig({s2sConfig: [getServerTestingConfig(CONFIG), CONFIG2]});
      });

      afterEach(() => {
        config.resetConfig()
        s2sTesting.bidSource = {};
      });

      const makeBidRequests = ads => {
        const bidRequests = adapterManager.makeBidRequests(
          ads, 1111, 2222, 1000
        );

        bidRequests.sort((a, b) => {
          if (a.bidderCode < b.bidderCode) return -1;
          if (a.bidderCode > b.bidderCode) return 1;
          return 0;
        });

        return bidRequests;
      };

      const removeAdUnitsBidSource = adUnits => adUnits.map(adUnit => {
        const newAdUnit = { ...adUnit };
        newAdUnit.bids = newAdUnit.bids.map(bid => {
          if (bid.bidSource) delete bid.bidSource;
          return bid;
        });
        return newAdUnit;
      });

      it('suppresses all client bids if there are server bids resulting from bidSource at the adUnit Level', () => {
        const ads = getServerTestingsAds();
        ads.push({
          code: 'test_div_5',
          sizes: [[300, 250]],
          bids: [{ bidder: 'pubmatic' }]
        })
        const bidRequests = makeBidRequests(ads);

        expect(bidRequests).lengthOf(3);

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[0].bids[0].bidder).equals('openx');
        expect(bidRequests[0].bids[0].finalSource).equals('server');

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[1].bids[0].bidder).equals('pubmatic');
        expect(bidRequests[1].bids[0].finalSource).equals('server');

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[2].bids[0].bidder).equals('rubicon');
        expect(bidRequests[2].bids[0].finalSource).equals('server');
      });

      it('should not surpress client side bids if testServerOnly is true in one config, ' +
      ',bidderControl resolves to server in another config' +
      'and there are no bid with bidSource at the adUnit Level', () => {
        const testConfig1 = utils.deepClone(getServerTestingConfig(CONFIG));
        const testConfig2 = utils.deepClone(CONFIG2);
        testConfig1.testServerOnly = false;
        testConfig2.testServerOnly = true;
        testConfig2.testing = true;
        testConfig2.bidderControl = {
          'pubmatic': {
            bidSource: { server: 0, client: 100 },
            includeSourceKvp: true,
          },
        };
        config.setConfig({s2sConfig: [testConfig1, testConfig2]});

        const ads = [
          {
            code: 'test_div_1',
            sizes: [[300, 250]],
            bids: [{ bidder: 'adequant' }]
          },
          {
            code: 'test_div_2',
            sizes: [[300, 250]],
            bids: [{ bidder: 'openx' }]
          },
          {
            code: 'test_div_3',
            sizes: [[300, 250]],
            bids: [{ bidder: 'pubmatic' }]
          },
        ];
        const bidRequests = makeBidRequests(ads);

        expect(bidRequests).lengthOf(3);

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[0].bids[0].bidder).equals('adequant');
        expect(bidRequests[0].bids[0].finalSource).equals('client');

        expect(bidRequests[1].bids).lengthOf(1);
        expect(bidRequests[1].bids[0].bidder).equals('openx');
        expect(bidRequests[1].bids[0].finalSource).equals('server');

        expect(bidRequests[2].bids).lengthOf(1);
        expect(bidRequests[2].bids[0].bidder).equals('pubmatic');
        expect(bidRequests[2].bids[0].finalSource).equals('client');
      });

      // todo: update description
      it('suppresses all, and only, client bids if there are bids resulting from bidSource at the adUnit Level', () => {
        const ads = getServerTestingsAds();

        // change this adUnit to be server based
        ads[1].bids[1].bidSource.client = 0;
        ads[1].bids[1].bidSource.server = 100;

        const bidRequests = makeBidRequests(ads);

        expect(bidRequests).lengthOf(3);

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[0].bids[0].bidder).equals('appnexus');
        expect(bidRequests[0].bids[0].finalSource).equals('server');

        expect(bidRequests[1].bids).lengthOf(1);
        expect(bidRequests[1].bids[0].bidder).equals('openx');
        expect(bidRequests[1].bids[0].finalSource).equals('server');

        expect(bidRequests[2].bids).lengthOf(1);
        expect(bidRequests[2].bids[0].bidder).equals('rubicon');
        expect(bidRequests[2].bids[0].finalSource).equals('server');
      });

      // we have a server call now
      it('does not suppress client bids if no "test case" bids result in a server bid', () => {
        const ads = getServerTestingsAds();

        // change this adUnit to be client based
        ads[0].bids[0].bidSource.client = 100;
        ads[0].bids[0].bidSource.server = 0;

        const bidRequests = makeBidRequests(ads);

        expect(bidRequests).lengthOf(4);

        expect(bidRequests[0].bids).lengthOf(1);
        expect(bidRequests[0].bids[0].bidder).equals('adequant');
        expect(bidRequests[0].bids[0].finalSource).equals('client');

        expect(bidRequests[1].bids).lengthOf(2);
        expect(bidRequests[1].bids[0].bidder).equals('appnexus');
        expect(bidRequests[1].bids[0].finalSource).equals('client');
        expect(bidRequests[1].bids[1].bidder).equals('appnexus');
        expect(bidRequests[1].bids[1].finalSource).equals('client');

        expect(bidRequests[2].bids).lengthOf(1);
        expect(bidRequests[2].bids[0].bidder).equals('openx');
        expect(bidRequests[2].bids[0].finalSource).equals('server');

        expect(bidRequests[3].bids).lengthOf(2);
        expect(bidRequests[3].bids[0].bidder).equals('rubicon');
        expect(bidRequests[3].bids[0].finalSource).equals('client');
        expect(bidRequests[3].bids[1].bidder).equals('rubicon');
        expect(bidRequests[3].bids[1].finalSource).equals('client');
      });

      it(
        'should surpress client side bids if no ad unit bidSources are set, ' +
        'but bidderControl resolves to server',
        () => {
          const ads = removeAdUnitsBidSource(getServerTestingsAds());

          const bidRequests = makeBidRequests(ads);

          expect(bidRequests).lengthOf(2);

          expect(bidRequests[0].bids).lengthOf(1);
          expect(bidRequests[0].bids[0].bidder).equals('openx');
          expect(bidRequests[0].bids[0].finalSource).equals('server');

          expect(bidRequests[1].bids).lengthOf(2);
          expect(bidRequests[1].bids[0].bidder).equals('rubicon');
          expect(bidRequests[1].bids[0].finalSource).equals('server');
        }
      );
    });
  });

  describe('getS2SBidderSet', () => {
    it('should always return the "null" bidder', () => {
      expect([...getS2SBidderSet({bidders: []})]).to.eql([null]);
    });

    it('should not consider disabled s2s adapters', () => {
      const actual = getS2SBidderSet([{enabled: false, bidders: ['A', 'B']}, {enabled: true, bidders: ['C']}]);
      expect([...actual]).to.include.members(['C']);
      expect([...actual]).not.to.include.members(['A', 'B']);
    });

    it('should accept both single config objects and an array of them', () => {
      const conf = {enabled: true, bidders: ['A', 'B']};
      expect(getS2SBidderSet(conf)).to.eql(getS2SBidderSet([conf]));
    });
  });

  describe('separation of client and server bidders', () => {
    let s2sBidders, getS2SBidders;
    beforeEach(() => {
      s2sBidders = null;
      getS2SBidders = sinon.stub();
      getS2SBidders.callsFake(() => s2sBidders);
    })

    describe('partitionBidders', () => {
      let adUnits;

      beforeEach(() => {
        adUnits = [{
          bids: [{
            bidder: 'A'
          }, {
            bidder: 'B'
          }]
        }, {
          bids: [{
            bidder: 'A',
          }, {
            bidder: 'C'
          }]
        }];
      });

      function partition(adUnits, s2sConfigs) {
        return _partitionBidders(adUnits, s2sConfigs, {getS2SBidders})
      }

      Object.entries({
        'all client': {
          s2s: [],
          expected: {
            [PARTITIONS.CLIENT]: ['A', 'B', 'C'],
            [PARTITIONS.SERVER]: []
          }
        },
        'all server': {
          s2s: ['A', 'B', 'C'],
          expected: {
            [PARTITIONS.CLIENT]: [],
            [PARTITIONS.SERVER]: ['A', 'B', 'C']
          }
        },
        'mixed': {
          s2s: ['B', 'C'],
          expected: {
            [PARTITIONS.CLIENT]: ['A'],
            [PARTITIONS.SERVER]: ['B', 'C']
          }
        }
      }).forEach(([test, {s2s, expected}]) => {
        it(`should partition ${test} requests`, () => {
          s2sBidders = new Set(s2s);
          const s2sConfig = {};
          expect(partition(adUnits, s2sConfig)).to.eql(expected);
          sinon.assert.calledWith(getS2SBidders, sinon.match.same(s2sConfig));
        });
      });
    });

    describe('filterBidsForAdUnit', () => {
      before(() => {
        filterBidsForAdUnit.removeAll();
      })
      function filterBids(bids, s2sConfig) {
        return filterBidsForAdUnit(bids, s2sConfig, {getS2SBidders});
      }
      it('should not filter any bids when s2sConfig == null', () => {
        const bids = ['untouched', 'data'];
        expect(filterBids(bids)).to.eql(bids);
      });

      it('should remove bids that have bidder not present in s2sConfig', () => {
        s2sBidders = new Set('A', 'B');
        const s2sConfig = {};
        expect(filterBids(['A', 'C', 'D'].map((code) => ({bidder: code})), s2sConfig)).to.eql([{bidder: 'A'}]);
        sinon.assert.calledWith(getS2SBidders, sinon.match.same(s2sConfig));
      })

      describe('when bids specify s2sConfigName', () => {
        let bids;
        beforeEach(() => {
          getS2SBidders.returns(new Set(['A', 'B', 'C']));
          bids = [
            {
              bidder: 'A',
              s2sConfigName: 'server1'
            },
            {
              bidder: 'B',
              s2sConfigName: ['server1', 'server2']
            },
            {
              bidder: 'C'
            }
          ]
        })
        Object.entries({
          server1: ['A', 'B', 'C'],
          server2: ['B', 'C'],
          server3: ['C']
        }).forEach(([configName, expectedBidders]) => {
          it(`should remove bidders that specify a different s2sConfig name (${configName} => ${expectedBidders.join(',')})`, () => {
            expect(filterBids(bids, {name: configName}).map(bid => bid.bidder)).to.eql(expectedBidders);
          });
        })
      })
    });
  });

  describe('callDataDeletionRequest', () => {
    function delMethodForBidder(bidderCode) {
      const del = sinon.stub();
      adapterManager.registerBidAdapter({
        callBids: sinon.stub(),
        getSpec() {
          return {
            onDataDeletionRequest: del
          }
        }
      }, bidderCode);
      return del;
    }

    function delMethodForAnalytics(provider) {
      const del = sinon.stub();
      adapterManager.registerAnalyticsAdapter({
        code: provider,
        adapter: {
          enableAnalytics: sinon.stub(),
          onDataDeletionRequest: del,
        },
      })
      return del;
    }

    Object.entries({
      'bid adapters': delMethodForBidder,
      'analytics adapters': delMethodForAnalytics
    }).forEach(([t, getDelMethod]) => {
      describe(t, () => {
        it('invokes onDataDeletionRequest', () => {
          const del = getDelMethod('mockAdapter');
          adapterManager.callDataDeletionRequest();
          sinon.assert.calledOnce(del);
        });

        it('does not choke if onDeletionRequest throws', () => {
          const del1 = getDelMethod('mockAdapter1');
          const del2 = getDelMethod('mockAdapter2');
          del1.throws(new Error());
          adapterManager.callDataDeletionRequest();
          sinon.assert.calledOnce(del1);
          sinon.assert.calledOnce(del2);
        });
      })
    })

    describe('for bid adapters', () => {
      let bidderRequests;

      beforeEach(() => {
        bidderRequests = [];
        ['mockBidder', 'mockBidder1', 'mockBidder2'].forEach(bidder => {
          adapterManager.registerBidAdapter({callBids: sinon.stub(), getSpec: () => ({code: bidder})}, bidder);
        })
        sinon.stub(auctionManager, 'getBidsRequested').callsFake(() => bidderRequests);
      })
      afterEach(() => {
        auctionManager.getBidsRequested.restore();
      })

      it('can resolve aliases', () => {
        adapterManager.aliasBidAdapter('mockBidder', 'mockBidderAlias');
        expect(adapterManager.resolveAlias('mockBidderAlias')).to.eql('mockBidder');
      });
      it('does not stuck in alias cycles', () => {
        adapterManager.aliasRegistry['alias1'] = 'alias2';
        adapterManager.aliasRegistry['alias2'] = 'alias2';
        expect(adapterManager.resolveAlias('alias2')).to.eql('alias2');
      })
      it('returns self when not an alias', () => {
        delete adapterManager.aliasRegistry['missing'];
        expect(adapterManager.resolveAlias('missing')).to.eql('missing');
      })

      it('does not invoke onDataDeletionRequest on aliases', () => {
        const del = delMethodForBidder('mockBidder');
        adapterManager.aliasBidAdapter('mockBidder', 'mockBidderAlias');
        adapterManager.aliasBidAdapter('mockBidderAlias2', 'mockBidderAlias');
        adapterManager.callDataDeletionRequest();
        sinon.assert.calledOnce(del);
      });

      it('passes known bidder requests', () => {
        const del1 = delMethodForBidder('mockBidder1');
        const del2 = delMethodForBidder('mockBidder2');
        adapterManager.aliasBidAdapter('mockBidder1', 'mockBidder1Alias');
        adapterManager.aliasBidAdapter('mockBidder1Alias', 'mockBidder1Alias2')
        bidderRequests = [
          {
            bidderCode: 'mockBidder1',
            id: 0
          },
          {
            bidderCode: 'mockBidder2',
            id: 1,
          },
          {
            bidderCode: 'mockBidder1Alias',
            id: 2,
          },
          {
            bidderCode: 'someOtherBidder',
            id: 3
          },
          {
            bidderCode: 'mockBidder1Alias2',
            id: 4
          }
        ];
        adapterManager.callDataDeletionRequest();
        sinon.assert.calledWith(del1, [bidderRequests[0], bidderRequests[2], bidderRequests[4]]);
        sinon.assert.calledWith(del2, [bidderRequests[1]]);
      })
    })
  });

  describe('reportAnalytics check', () => {
    beforeEach(() => {
      sinon.stub(dep, 'isAllowed');
    });
    afterEach(() => {
      dep.isAllowed.restore();
    });

    it('should check for reportAnalytics before registering analytics adapter', () => {
      const enabled = {};
      ['mockAnalytics1', 'mockAnalytics2'].forEach((code) => {
        adapterManager.registerAnalyticsAdapter({
          code,
          adapter: {
            enableAnalytics: sinon.stub().callsFake(() => { enabled[code] = true })
          }
        })
      })

      const anlCfg = [
        {
          provider: 'mockAnalytics1',
          random: 'values'
        },
        {
          provider: 'mockAnalytics2'
        }
      ]
      dep.isAllowed.callsFake((activity, {component, _config}) => {
        return activity === ACTIVITY_REPORT_ANALYTICS &&
          component === `${MODULE_TYPE_ANALYTICS}.${anlCfg[0].provider}` &&
          _config === anlCfg[0]
      })

      adapterManager.enableAnalytics(anlCfg);
      expect(enabled).to.eql({mockAnalytics1: true});
    });
  });

  describe('registers GVL IDs', () => {
    beforeEach(() => {
      sinon.stub(GDPR_GVLIDS, 'register');
    });
    afterEach(() => {
      GDPR_GVLIDS.register.restore();
    });

    it('for bid adapters', () => {
      adapterManager.registerBidAdapter({getSpec: () => ({gvlid: 123}), callBids: sinon.stub()}, 'mock');
      sinon.assert.calledWith(GDPR_GVLIDS.register, MODULE_TYPE_BIDDER, 'mock', 123);
    });

    it('for analytics adapters', () => {
      adapterManager.registerAnalyticsAdapter({adapter: {enableAnalytics: sinon.stub()}, code: 'mock', gvlid: 123});
      sinon.assert.calledWith(GDPR_GVLIDS.register, MODULE_TYPE_ANALYTICS, 'mock', 123);
    });
  });
});
