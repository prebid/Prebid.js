import { expect } from 'chai';
import adapterManager, {
  gdprDataHandler,
  coppaDataHandler,
  _partitionBidders,
  PARTITIONS,
  getS2SBidderSet, _filterBidsForAdUnit
} from 'src/adapterManager.js';
import {
  getAdUnits,
  getServerTestingConfig,
  getServerTestingsAds,
  getBidRequests
} from 'test/fixtures/fixtures.js';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { setSizeConfig } from 'src/sizeMapping.js';
import {find, includes} from 'src/polyfill.js';
import s2sTesting from 'modules/s2sTesting.js';
import {hook} from '../../../../src/hook.js';
import {auctionManager} from '../../../../src/auctionManager.js';
var events = require('../../../../src/events');

const CONFIG = {
  enabled: true,
  endpoint: CONSTANTS.S2S.DEFAULT_ENDPOINT,
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

  afterEach(() => {
    s2sTesting.clientTestBidders.clear();
  });

  describe('callBids', function () {
    before(function () {
      config.setConfig({s2sConfig: { enabled: false }});
      hook.ready();
    });

    beforeEach(function () {
      sinon.stub(utils, 'logError');
      appnexusAdapterMock.callBids.reset();
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

      let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
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
      let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);

      let doneBidders = [];
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
      let count = () => cnt++;
      events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      let bidRequests = [{
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

      let adUnits = [{
        code: 'adUnit-code',
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
        ]
      }];
      adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
      expect(cnt).to.equal(1);
      sinon.assert.calledOnce(appnexusAdapterMock.callBids);
      events.off(CONSTANTS.EVENTS.BID_REQUESTED, count);
    });

    it('should give bidders access to bidder-specific config', function(done) {
      let mockBidders = ['rubicon', 'appnexus', 'pubmatic'];
      let bidderRequest = getBidRequests().filter(bidRequest => includes(mockBidders, bidRequest.bidderCode));
      let adUnits = getAdUnits();

      let bidders = {};
      let results = {};
      let cbCount = 0;

      function mock(bidder) {
        bidders[bidder] = adapterManager.bidderRegistry[bidder];
        adapterManager.bidderRegistry[bidder] = {
          callBids: function(bidRequest, addBidResponse, done, ajax, timeout, configCallback) {
            let myResults = results[bidRequest.bidderCode] = [];
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

  describe('onBidWon', function () {
    var criteoSpec = { onBidWon: sinon.stub() }
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

    it('should call spec\'s onBidWon callback when a bid is won', function () {
      const bids = [
        {bidder: 'criteo', params: {placementId: 'id'}},
      ];
      const adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids
      }];

      adapterManager.callBidWonBidder(bids[0].bidder, bids[0], adUnits);
      sinon.assert.called(criteoSpec.onBidWon);
    });
  }); // end onBidWon

  describe('onSetTargeting', function () {
    var criteoSpec = { onSetTargeting: sinon.stub() }
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

    it('should call spec\'s onSetTargeting callback when setTargeting is called', function () {
      const bids = [
        {bidder: 'criteo', params: {placementId: 'id'}},
      ];
      const adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids
      }];
      adapterManager.callSetTargetingBidder(bids[0].bidder, bids[0], adUnits);
      sinon.assert.called(criteoSpec.onSetTargeting);
    });
  }); // end onSetTargeting

  describe('onBidViewable', function () {
    var criteoSpec = { onBidViewable: sinon.stub() }
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

    it('should call spec\'s onBidViewable callback when callBidViewableBidder is called', function () {
      const bids = [
        {bidder: 'criteo', params: {placementId: 'id'}},
      ];
      const adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids
      }];
      adapterManager.callBidViewableBidder(bids[0].bidder, bids[0]);
      sinon.assert.called(criteoSpec.onBidViewable);
    });
  }); // end onBidViewable

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
      const bidderRequest = find(bidRequests, bidRequest => bidRequest.bidderCode === bidder);
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
      prebidServerAdapterMock.callBids.reset();
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
      let cnt, count = () => cnt++;

      beforeEach(function () {
        prebidServerAdapterMock.callBids.reset();
        cnt = 0;
        events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      afterEach(function () {
        events.off(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      it('should fire for s2s requests', function () {
        let adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['appnexus'], bid.bidder));
          return adUnit;
        })
        let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(1);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      });

      it('should fire for simultaneous s2s and client requests', function () {
        adapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
        let adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['adequant', 'appnexus'], bid.bidder));
          return adUnit;
        })
        let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(2);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
        sinon.assert.calledOnce(adequantAdapterMock.callBids);
        adequantAdapterMock.callBids.reset();
        delete adapterManager.bidderRegistry['adequant'];
      });
    });
  }); // end s2s tests

  describe('Multiple S2S tests', function () {
    beforeEach(function () {
      config.setConfig({s2sConfig: [CONFIG, CONFIG2]});
      adapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      prebidServerAdapterMock.callBids.reset();
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

    it('invokes callBids on the S2S adapter', function () {
      adapterManager.callBids(
        getAdUnits(),
        bidRequests,
        () => {},
        () => () => {}
      );
      sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
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
      sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
    });

    describe('BID_REQUESTED event', function () {
      // function to count BID_REQUESTED events
      let cnt, count = () => cnt++;

      beforeEach(function () {
        prebidServerAdapterMock.callBids.reset();
        cnt = 0;
        events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      afterEach(function () {
        events.off(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      it('should fire for s2s requests', function () {
        let adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['appnexus', 'pubmatic'], bid.bidder));
          return adUnit;
        })
        let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(2);
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
      });

      it('should have one tid for ALL s2s bidRequests', function () {
        let adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['appnexus', 'pubmatic'], bid.bidder));
          return adUnit;
        })
        let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
        const firstBid = prebidServerAdapterMock.callBids.firstCall.args[0];
        const secondBid = prebidServerAdapterMock.callBids.secondCall.args[0];

        // TIDS should be the same
        expect(firstBid.tid).to.equal(secondBid.tid);
      });

      it('should fire for simultaneous s2s and client requests', function () {
        adapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
        let adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['adequant', 'appnexus', 'pubmatic'], bid.bidder));
          return adUnit;
        })
        let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        adapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(3);
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
        sinon.assert.calledOnce(adequantAdapterMock.callBids);
        adequantAdapterMock.callBids.reset();
        delete adapterManager.bidderRegistry['adequant'];
      });
    });
  }); // end multiple s2s tests

  describe('s2sTesting', function () {
    let doneStub = sinon.stub();
    let ajaxStub = sinon.stub();

    function getTestAdUnits() {
      // copy adUnits
      // return JSON.parse(JSON.stringify(getAdUnits()));
      return utils.deepClone(getAdUnits()).map(adUnit => {
        adUnit.bids = adUnit.bids.filter(bid => includes(['adequant', 'appnexus', 'rubicon'], bid.bidder));
        return adUnit;
      })
    }

    function callBids(adUnits = getTestAdUnits()) {
      let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      adapterManager.callBids(adUnits, bidRequests, doneStub, ajaxStub);
    }

    function checkServerCalled(numAdUnits, numBids) {
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      let requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
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

    let TESTING_CONFIG = utils.deepClone(CONFIG);
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

      prebidServerAdapterMock.callBids.reset();
      adequantAdapterMock.callBids.reset();
      appnexusAdapterMock.callBids.reset();
      rubiconAdapterMock.callBids.reset();
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
    let doneStub = sinon.stub();
    let ajaxStub = sinon.stub();

    function getTestAdUnits() {
      // copy adUnits
      return utils.deepClone(getAdUnits()).map(adUnit => {
        adUnit.bids = adUnit.bids.filter(bid => {
          return includes(['adequant', 'appnexus', 'pubmatic', 'rubicon'],
            bid.bidder);
        });
        return adUnit;
      })
    }

    function callBids(adUnits = getTestAdUnits()) {
      let bidRequests = adapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      adapterManager.callBids(adUnits, bidRequests, doneStub, ajaxStub);
    }

    function checkServerCalled(numAdUnits, firstConfigNumBids, secondConfigNumBids) {
      let requestObjects = [];
      let configBids;
      if (firstConfigNumBids === 0 || secondConfigNumBids === 0) {
        configBids = Math.max(firstConfigNumBids, secondConfigNumBids)
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
        let requestObj1 = prebidServerAdapterMock.callBids.firstCall.args[0];
        requestObjects.push(requestObj1)
      } else {
        sinon.assert.calledTwice(prebidServerAdapterMock.callBids);
        let requestObj1 = prebidServerAdapterMock.callBids.firstCall.args[0];
        let requestObj2 = prebidServerAdapterMock.callBids.secondCall.args[0];
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

      prebidServerAdapterMock.callBids.reset();
      adequantAdapterMock.callBids.reset();
      appnexusAdapterMock.callBids.reset();
      rubiconAdapterMock.callBids.reset();
      pubmaticAdapterMock.callBids.reset();
    });

    it('calls server adapter if no sources defined for config where testing is true, ' +
    'calls client adapter for second config where testing is false', function () {
      let TEST_CONFIG = utils.deepClone(CONFIG);
      Object.assign(TEST_CONFIG, {
        bidders: ['appnexus', 'adequant'],
        testing: true,
      });
      let TEST_CONFIG2 = utils.deepClone(CONFIG2);
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
      let TEST_CONFIG = utils.deepClone(CONFIG);
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
      let TEST_CONFIG2 = utils.deepClone(CONFIG2);
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
      let TEST_CONFIG = utils.deepClone(CONFIG);
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

      let TEST_CONFIG2 = utils.deepClone(CONFIG2);
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
      let TEST_CONFIG = utils.deepClone(CONFIG);
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

      let TEST_CONFIG2 = utils.deepClone(CONFIG2);
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
      let TEST_CONFIG = utils.deepClone(CONFIG);
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

      let TEST_CONFIG2 = utils.deepClone(CONFIG2);
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
      let TEST_CONFIG = utils.deepClone(CONFIG);
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

      let TEST_CONFIG2 = utils.deepClone(CONFIG2);
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
        let thisSpec = Object.assign(spec, { supportedMediaTypes: ['video'] });
        registerBidder(thisSpec);
        const alias = 'aliasBidder';
        adapterManager.aliasBidAdapter(CODE, alias);
        expect(adapterManager.bidderRegistry).to.have.property(alias);
        expect(adapterManager.videoAdapters).to.include(alias);
      });
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
        let testS2sConfig = utils.deepClone(CONFIG);
        testS2sConfig.bidders = ['s2sAlias'];
        config.setConfig({s2sConfig: testS2sConfig});

        adapterManager.aliasBidAdapter('s2sBidder', 's2sAlias');
        expect(adapterManager.aliasRegistry).to.have.property('s2sAlias');
      });

      it('should allow an alias if alias is part of s2sConfig.bidders for multiple s2sConfigs', function () {
        let testS2sConfig = utils.deepClone(CONFIG);
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
        let testS2sConfig = utils.deepClone(CONFIG);
        testS2sConfig.bidders = ['s2sAlias'];
        config.setConfig({s2sConfig: testS2sConfig});

        adapterManager.aliasBidAdapter('s2sBidder1', 's2sAlias1');
        sinon.assert.calledOnce(utils.logError);
        expect(adapterManager.aliasRegistry).to.not.have.property('s2sAlias1');
      });
    });
  });

  describe('makeBidRequests', function () {
    let adUnits;
    beforeEach(function () {
      adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
        adUnit.bids = adUnit.bids.filter(bid => includes(['appnexus', 'rubicon'], bid.bidder));
        return adUnit;
      })
    });

    if (FEATURES.NATIVE) {
      it('should add nativeParams to adUnits after BEFORE_REQUEST_BIDS', () => {
        function beforeReqBids(adUnits) {
          adUnits.forEach(adUnit => {
            adUnit.mediaTypes.native = {
              type: 'image',
            }
          })
        }

        events.on(CONSTANTS.EVENTS.BEFORE_REQUEST_BIDS, beforeReqBids);
        adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {
          },
          []
        );
        events.off(CONSTANTS.EVENTS.BEFORE_REQUEST_BIDS, beforeReqBids);
        expect(adUnits.map((u) => u.nativeParams).some(i => i == null)).to.be.false;
      });
    }

    it('should make separate bidder request objects for each bidder', () => {
      adUnits = [utils.deepClone(getAdUnits()[0])];

      let bidRequests = adapterManager.makeBidRequests(
        adUnits,
        Date.now(),
        utils.getUniqueIdentifierStr(),
        function callback() {},
        []
      );

      let sizes1 = bidRequests[1].bids[0].sizes;
      let sizes2 = bidRequests[0].bids[0].sizes;

      // mutate array
      sizes1.splice(0, 1);

      expect(sizes1).not.to.deep.equal(sizes2);
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
          src: CONSTANTS.S2S.SRC,
          adUnitsS2SCopy: adUnits,
          bids: [{
            bidder: 'appnexus',
            src: CONSTANTS.S2S.SRC
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
        let bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );
        sinon.assert.calledOnce(utils.shuffle);
      });
    });

    describe('fledgeEnabled', function () {
      const origRunAdAuction = navigator?.runAdAuction;
      before(function () {
        // navigator.runAdAuction doesn't exist, so we can't stub it normally with
        // sinon.stub(navigator, 'runAdAuction') or something
        navigator.runAdAuction = sinon.stub();
      });

      after(function() {
        navigator.runAdAuction = origRunAdAuction;
      })

      afterEach(function () {
        config.resetConfig();
      });

      it('should set fledgeEnabled correctly per bidder', function () {
        config.setConfig({bidderSequence: 'fixed'})
        config.setBidderConfig({
          bidders: ['appnexus'],
          config: {
            fledgeEnabled: true,
          }
        });

        const adUnits = [{
          'code': '/19968336/header-bid-tag1',
          'mediaTypes': {
            'banner': {
              'sizes': [[728, 90]]
            },
          },
          'bids': [
            {
              'bidder': 'appnexus',
            },
            {
              'bidder': 'rubicon',
            },
          ]
        }];

        const bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );

        expect(bidRequests[0].bids[0].bidder).equals('appnexus');
        expect(bidRequests[0].fledgeEnabled).to.be.true;

        expect(bidRequests[1].bids[0].bidder).equals('rubicon');
        expect(bidRequests[1].fledgeEnabled).to.be.undefined;
      });
    });

    describe('sizeMapping', function () {
      let sandbox;
      beforeEach(function () {
        sandbox = sinon.sandbox.create();
        // always have matchMedia return true for us
        sandbox.stub(utils.getWindowTop(), 'matchMedia').callsFake(() => ({matches: true}));
      });

      afterEach(function () {
        sandbox.restore();
        config.resetConfig();
        setSizeConfig([]);
      });

      it('should not filter banner bids w/ no labels', function () {
        let bidRequests = adapterManager.makeBidRequests(
          adUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );

        expect(bidRequests.length).to.equal(2);
        let rubiconBidRequests = find(bidRequests, bidRequest => bidRequest.bidderCode === 'rubicon');
        expect(rubiconBidRequests.bids.length).to.equal(1);
        expect(rubiconBidRequests.bids[0].mediaTypes).to.deep.equal(find(adUnits, adUnit => adUnit.code === rubiconBidRequests.bids[0].adUnitCode).mediaTypes);

        let appnexusBidRequests = find(bidRequests, bidRequest => bidRequest.bidderCode === 'appnexus');
        expect(appnexusBidRequests.bids.length).to.equal(2);
        expect(appnexusBidRequests.bids[0].mediaTypes).to.deep.equal(find(adUnits, adUnit => adUnit.code === appnexusBidRequests.bids[0].adUnitCode).mediaTypes);
        expect(appnexusBidRequests.bids[1].mediaTypes).to.deep.equal(find(adUnits, adUnit => adUnit.code === appnexusBidRequests.bids[1].adUnitCode).mediaTypes);
      });

      it('should not filter video bids', function () {
        setSizeConfig([{
          'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
          'sizesSupported': [
            [728, 90],
            [300, 250]
          ],
          'labels': ['tablet', 'phone']
        }]);

        let videoAdUnits = [{
          code: 'test_video',
          mediaTypes: {
            video: {
              playerSize: [300, 300],
              context: 'outstream'
            }
          },
          bids: [{
            bidder: 'appnexus',
            params: {
              placementId: 13232385,
              video: {
                skippable: true,
                playback_method: ['auto_play_sound_off']
              }
            }
          }]
        }];
        let bidRequests = adapterManager.makeBidRequests(
          videoAdUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );
        expect(bidRequests[0].bids[0].sizes).to.deep.equal([300, 300]);
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

        let nativeAdUnits = [{
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
        let bidRequests = adapterManager.makeBidRequests(
          nativeAdUnits,
          Date.now(),
          utils.getUniqueIdentifierStr(),
          function callback() {},
          []
        );
        expect(bidRequests[0].bids[0].sizes).to.deep.equal([]);
      });

      it('should filter sizes using size config', function () {
        let validSizes = [
          [728, 90],
          [300, 250]
        ];

        let validSizeMap = validSizes.map(size => size.toString()).reduce((map, size) => {
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

        let bidRequests = adapterManager.makeBidRequests(
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

        let TESTING_CONFIG = utils.deepClone(CONFIG);
        TESTING_CONFIG.bidders = ['appnexus', 'rubicon'];
        config.setConfig({ s2sConfig: TESTING_CONFIG });

        let bidRequests = adapterManager.makeBidRequests(
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
        let bidRequests = adapterManager.makeBidRequests(
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
        let bidRequests = adapterManager.makeBidRequests(
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
        let ads = getServerTestingsAds();
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
        let testConfig1 = utils.deepClone(getServerTestingConfig(CONFIG));
        let testConfig2 = utils.deepClone(CONFIG2);
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

        let ads = [
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
      function filterBids(bids, s2sConfig) {
        return _filterBidsForAdUnit(bids, s2sConfig, {getS2SBidders});
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
        sinon.stub(auctionManager, 'getBidsRequested').callsFake(() => bidderRequests);
      })
      afterEach(() => {
        auctionManager.getBidsRequested.restore();
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
});
