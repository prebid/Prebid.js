import { expect } from 'chai';
import adapterManager, {
  gdprDataHandler
} from 'src/adapterManager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
import { setSizeConfig } from 'src/sizeMapping';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';
import s2sTesting from 'modules/s2sTesting';
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

describe('adapterManager tests', function () {
  let orgAppnexusAdapter;
  let orgAdequantAdapter;
  let orgPrebidServerAdapter;
  let orgRubiconAdapter;
  before(function () {
    orgAppnexusAdapter = adapterManager.bidderRegistry['appnexus'];
    orgAdequantAdapter = adapterManager.bidderRegistry['adequant'];
    orgPrebidServerAdapter = adapterManager.bidderRegistry['prebidServer'];
    orgRubiconAdapter = adapterManager.bidderRegistry['rubicon'];
  });

  after(function () {
    adapterManager.bidderRegistry['appnexus'] = orgAppnexusAdapter;
    adapterManager.bidderRegistry['adequant'] = orgAdequantAdapter;
    adapterManager.bidderRegistry['prebidServer'] = orgPrebidServerAdapter;
    adapterManager.bidderRegistry['rubicon'] = orgRubiconAdapter;
    config.setConfig({s2sConfig: { enabled: false }});
  });

  describe('callBids', function () {
    before(function () {
      config.setConfig({s2sConfig: { enabled: false }});
    });

    beforeEach(function () {
      sinon.stub(utils, 'logError');
      appnexusAdapterMock.callBids.reset();
      adapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
    });

    afterEach(function () {
      utils.logError.restore();
      delete adapterManager.bidderRegistry['appnexus'];
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

    it('should emit BID_REQUESTED event', function () {
      // function to count BID_REQUESTED events
      let cnt = 0;
      let count = () => cnt++;
      events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      let bidRequests = [{
        'bidderCode': 'appnexus',
        'auctionId': '1863e370099523',
        'bidderRequestId': '2946b569352ef2',
        'tid': '34566b569352ef2',
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

  describe('S2S tests', function () {
    beforeEach(function () {
      config.setConfig({s2sConfig: CONFIG});
      adapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      prebidServerAdapterMock.callBids.reset();
    });

    it('invokes callBids on the S2S adapter', function () {
      let bidRequests = [{
        'bidderCode': 'appnexus',
        'auctionId': '1863e370099523',
        'bidderRequestId': '2946b569352ef2',
        'tid': '34566b569352ef2',
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

      let bidRequests = [{
        'bidderCode': 'appnexus',
        'auctionId': '1863e370099523',
        'bidderRequestId': '2946b569352ef2',
        'tid': '34566b569352ef2',
        'src': 's2s',
        'timeout': 1000,
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
                'bid_id': '378a8914450b334'
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
                'bid_id': '387d9d9c32ca47c'
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
      config.setConfig({s2sConfig: {}});
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

    describe('sizeMapping', function () {
      beforeEach(function () {
        sinon.stub(window, 'matchMedia').callsFake(() => ({matches: true}));
      });

      afterEach(function () {
        matchMedia.restore();
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
        expect(rubiconBidRequests.bids[0].sizes).to.deep.equal(find(adUnits, adUnit => adUnit.code === rubiconBidRequests.bids[0].adUnitCode).sizes);

        let appnexusBidRequests = find(bidRequests, bidRequest => bidRequest.bidderCode === 'appnexus');
        expect(appnexusBidRequests.bids.length).to.equal(2);
        expect(appnexusBidRequests.bids[0].sizes).to.deep.equal(find(adUnits, adUnit => adUnit.code === appnexusBidRequests.bids[0].adUnitCode).sizes);
        expect(appnexusBidRequests.bids[1].sizes).to.deep.equal(find(adUnits, adUnit => adUnit.code === appnexusBidRequests.bids[1].adUnitCode).sizes);
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
        expect(bidRequests[0].adUnitsS2SCopy[0].bids[0].adUnitCode).to.equal(adUnits[1].code);
        expect(bidRequests[0].adUnitsS2SCopy[0].bids[0].bid_id).to.equal(bidRequests[0].bids[0].bid_id);
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
  });
});
