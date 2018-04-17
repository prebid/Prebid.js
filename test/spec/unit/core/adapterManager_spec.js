import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
import { checkBidRequestSizes } from 'src/adaptermanager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
import { setSizeConfig } from 'src/sizeMapping';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';
var s2sTesting = require('../../../../modules/s2sTesting');
var events = require('../../../../src/events');
const adloader = require('../../../../src/adloader');

const CONFIG = {
  enabled: true,
  endpoint: CONSTANTS.S2S.DEFAULT_ENDPOINT,
  timeout: 1000,
  maxBids: 1,
  adapter: 'prebidServer',
  bidders: ['appnexus']
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
let loadScriptStub;

describe('adapterManager tests', () => {
  let orgAppnexusAdapter;
  let orgAdequantAdapter;
  let orgPrebidServerAdapter;
  let orgRubiconAdapter;
  before(() => {
    orgAppnexusAdapter = AdapterManager.bidderRegistry['appnexus'];
    orgAdequantAdapter = AdapterManager.bidderRegistry['adequant'];
    orgPrebidServerAdapter = AdapterManager.bidderRegistry['prebidServer'];
    orgRubiconAdapter = AdapterManager.bidderRegistry['rubicon'];
    loadScriptStub = sinon.stub(adloader, 'loadScript').callsFake((...args) => {
      args[1]();
    });
  });

  after(() => {
    AdapterManager.bidderRegistry['appnexus'] = orgAppnexusAdapter;
    AdapterManager.bidderRegistry['adequant'] = orgAdequantAdapter;
    AdapterManager.bidderRegistry['prebidServer'] = orgPrebidServerAdapter;
    AdapterManager.bidderRegistry['rubicon'] = orgRubiconAdapter;
    loadScriptStub.restore();
    config.setConfig({s2sConfig: { enabled: false }});
  });

  describe('callBids', () => {
    before(() => {
      config.setConfig({s2sConfig: { enabled: false }});
    });

    beforeEach(() => {
      sinon.stub(utils, 'logError');
      appnexusAdapterMock.callBids.reset();
      AdapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
    });

    afterEach(() => {
      utils.logError.restore();
      delete AdapterManager.bidderRegistry['appnexus'];
    });

    it('should log an error if a bidder is used that does not exist', () => {
      const adUnits = [{
        code: 'adUnit-code',
        sizes: [[728, 90]],
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'fakeBidder', params: {placementId: 'id'}}
        ]
      }];

      let bidRequests = AdapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      AdapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
      sinon.assert.called(utils.logError);
    });

    it('should emit BID_REQUESTED event', () => {
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
      AdapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
      expect(cnt).to.equal(1);
      sinon.assert.calledOnce(appnexusAdapterMock.callBids);
      events.off(CONSTANTS.EVENTS.BID_REQUESTED, count);
    });
  });

  describe('S2S tests', () => {
    beforeEach(() => {
      config.setConfig({s2sConfig: CONFIG});
      AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      prebidServerAdapterMock.callBids.reset();
    });

    it('invokes callBids on the S2S adapter', () => {
      let bidRequests = [{
        'bidderCode': 'appnexus',
        'auctionId': '1863e370099523',
        'bidderRequestId': '2946b569352ef2',
        'tid': '34566b569352ef2',
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
                'placementCode': '/19968336/header-bid-tag1',
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
                'placementCode': '/19968336/header-bid-tag-0',
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

      AdapterManager.callBids(
        getAdUnits(),
        bidRequests,
        () => {},
        () => () => {}
      );
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });

    // Enable this test when prebidServer adapter is made 1.0 compliant
    it('invokes callBids with only s2s bids', () => {
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
                'placementCode': '/19968336/header-bid-tag1',
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
                'placementCode': '/19968336/header-bid-tag-0',
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
      AdapterManager.callBids(
        adUnits,
        bidRequests,
        () => {},
        () => () => {}
      );
      const requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
      expect(requestObj.ad_units.length).to.equal(2);
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });

    describe('BID_REQUESTED event', () => {
      // function to count BID_REQUESTED events
      let cnt, count = () => cnt++;

      beforeEach(() => {
        prebidServerAdapterMock.callBids.reset();
        cnt = 0;
        events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      afterEach(() => {
        events.off(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      it('should fire for s2s requests', () => {
        let adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['appnexus'], bid.bidder));
          return adUnit;
        })
        let bidRequests = AdapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        AdapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(1);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      });

      it('should fire for simultaneous s2s and client requests', () => {
        AdapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
        let adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['adequant', 'appnexus'], bid.bidder));
          return adUnit;
        })
        let bidRequests = AdapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        AdapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(2);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
        sinon.assert.calledOnce(adequantAdapterMock.callBids);
        adequantAdapterMock.callBids.reset();
        delete AdapterManager.bidderRegistry['adequant'];
      });
    });
  }); // end s2s tests

  describe('s2sTesting', () => {
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
      let bidRequests = AdapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      AdapterManager.callBids(adUnits, bidRequests, doneStub, ajaxStub);
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

    beforeEach(() => {
      config.setConfig({s2sConfig: TESTING_CONFIG});
      AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      AdapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
      AdapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
      AdapterManager.bidderRegistry['rubicon'] = rubiconAdapterMock;

      stubGetSourceBidderMap = sinon.stub(s2sTesting, 'getSourceBidderMap');

      prebidServerAdapterMock.callBids.reset();
      adequantAdapterMock.callBids.reset();
      appnexusAdapterMock.callBids.reset();
      rubiconAdapterMock.callBids.reset();
    });

    afterEach(() => {
      config.setConfig({s2sConfig: {}});
      s2sTesting.getSourceBidderMap.restore();
    });

    it('calls server adapter if no sources defined', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: [], [s2sTesting.SERVER]: []});
      callBids();

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client adapter if one client source defined', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus'], [s2sTesting.SERVER]: []});
      callBids();

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client adapters if client sources defined', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      callBids();

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('calls client adapters if client sources defined', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      callBids();

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('does not call server adapter for bidders that go to client', () => {
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

    it('does not call client adapters for bidders that go to server', () => {
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

    it('calls client and server adapters for bidders that go to both', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.BOTH;
      adUnits[0].bids[1].finalSource = s2sTesting.BOTH;
      adUnits[1].bids[0].finalSource = s2sTesting.BOTH;
      adUnits[1].bids[1].finalSource = s2sTesting.BOTH;
      callBids(adUnits);

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('makes mixed client/server adapter calls for mixed bidder sources', () => {
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

      beforeEach(() => {
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
        AdapterManager.aliasBidAdapter(CODE, alias);
        expect(AdapterManager.bidderRegistry).to.have.property(alias);
        expect(AdapterManager.videoAdapters).to.include(alias);
      });
    });

    describe('makeBidRequests', () => {
      let adUnits;
      beforeEach(() => {
        adUnits = utils.deepClone(getAdUnits()).map(adUnit => {
          adUnit.bids = adUnit.bids.filter(bid => includes(['appnexus', 'rubicon'], bid.bidder));
          return adUnit;
        })
      });

      describe('setBidderSequence', () => {
        beforeEach(() => {
          sinon.spy(utils, 'shuffle');
        });

        afterEach(() => {
          config.resetConfig();
          utils.shuffle.restore();
        });

        it('setting to `random` uses shuffled order of adUnits', () => {
          config.setConfig({ bidderSequence: 'random' });
          let bidRequests = AdapterManager.makeBidRequests(
            adUnits,
            Date.now(),
            utils.getUniqueIdentifierStr(),
            function callback() {},
            []
          );
          sinon.assert.calledOnce(utils.shuffle);
        });
      });

      describe('sizeMapping', () => {
        beforeEach(() => {
          sinon.stub(window, 'matchMedia').callsFake(() => ({matches: true}));
        });

        afterEach(() => {
          matchMedia.restore();
          setSizeConfig([]);
        });

        it('should not filter bids w/ no labels', () => {
          let bidRequests = AdapterManager.makeBidRequests(
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

        it('should filter sizes using size config', () => {
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

          let bidRequests = AdapterManager.makeBidRequests(
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

          bidRequests = AdapterManager.makeBidRequests(
            adUnits,
            Date.now(),
            utils.getUniqueIdentifierStr(),
            function callback() {},
            []
          );

          // if no valid sizes, all bidders should be filtered out
          expect(bidRequests.length).to.equal(0);
        });

        it('should filter adUnits/bidders based on applied labels', () => {
          adUnits[0].labelAll = ['visitor-uk', 'mobile'];
          adUnits[1].labelAny = ['visitor-uk', 'desktop'];
          adUnits[1].bids[0].labelAny = ['mobile'];
          adUnits[1].bids[1].labelAll = ['desktop'];

          let bidRequests = AdapterManager.makeBidRequests(
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
      });
    });
  });

  describe('isValidBidRequest', () => {
    describe('positive tests for validating bid request', () => {
      beforeEach(() => {
        sinon.stub(utils, 'logInfo');
      });

      afterEach(() => {
        utils.logInfo.restore();
      });

      it('should maintain adUnit structure and adUnits.sizes is replaced', () => {
        let fullAdUnit = [{
          sizes: [[300, 250], [300, 600]],
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            },
            video: {
              playerSize: [[640, 480]]
            },
            native: {
              image: {
                sizes: [150, 150],
                aspect_ratios: [140, 140]
              },
              icon: {
                sizes: [75, 75]
              }
            }
          }
        }];
        let result = checkBidRequestSizes(fullAdUnit);
        expect(result[0].sizes).to.deep.equal([[640, 480]]);
        expect(result[0].mediaTypes.video.playerSize).to.deep.equal([[640, 480]]);
        expect(result[0].mediaTypes.native.image.sizes).to.deep.equal([150, 150]);
        expect(result[0].mediaTypes.native.icon.sizes).to.deep.equal([75, 75]);
        expect(result[0].mediaTypes.native.image.aspect_ratios).to.deep.equal([140, 140]);

        let noOptnlFieldAdUnit = [{
          sizes: [[300, 250], [300, 600]],
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            },
            video: {
              context: 'outstream'
            },
            native: {
              image: {
                required: true
              },
              icon: {
                required: true
              }
            }
          }
        }];
        result = checkBidRequestSizes(noOptnlFieldAdUnit);
        expect(result[0].sizes).to.deep.equal([[300, 250]]);
        expect(result[0].mediaTypes.video).to.exist;

        let mixedAdUnit = [{
          sizes: [[300, 250], [300, 600]],
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [[400, 350]]
            },
            native: {
              image: {
                aspect_ratios: [200, 150],
                required: true
              }
            }
          }
        }];
        result = checkBidRequestSizes(mixedAdUnit);
        expect(result[0].sizes).to.deep.equal([[400, 350]]);
        expect(result[0].mediaTypes.video).to.exist;

        let altVideoPlayerSize = [{
          sizes: [[600, 600]],
          mediaTypes: {
            video: {
              playerSize: [640, 480]
            }
          }
        }];
        result = checkBidRequestSizes(altVideoPlayerSize);
        expect(result[0].sizes).to.deep.equal([[640, 480]]);
        expect(result[0].mediaTypes.video.playerSize).to.deep.equal([[640, 480]]);
        expect(result[0].mediaTypes.video).to.exist;
        sinon.assert.calledOnce(utils.logInfo);
      });
    });

    describe('negative tests for validating bid requests', () => {
      beforeEach(() => {
        sinon.stub(utils, 'logError');
      });

      afterEach(() => {
        utils.logError.restore();
      });

      it('should throw error message and delete an object/property', () => {
        let badBanner = [{
          sizes: [[300, 250], [300, 600]],
          mediaTypes: {
            banner: {
              name: 'test'
            }
          }
        }];
        let result = checkBidRequestSizes(badBanner);
        expect(result[0].sizes).to.deep.equal([[300, 250], [300, 600]]);
        expect(result[0].mediaTypes.banner).to.be.undefined;
        sinon.assert.called(utils.logError);

        let badVideo1 = [{
          sizes: [[600, 600]],
          mediaTypes: {
            video: {
              playerSize: ['600x400']
            }
          }
        }];
        result = checkBidRequestSizes(badVideo1);
        expect(result[0].sizes).to.deep.equal([[600, 600]]);
        expect(result[0].mediaTypes.video.playerSize).to.be.undefined;
        expect(result[0].mediaTypes.video).to.exist;
        sinon.assert.called(utils.logError);

        let badVideo2 = [{
          sizes: [[600, 600]],
          mediaTypes: {
            video: {
              playerSize: [['300', '200']]
            }
          }
        }];
        result = checkBidRequestSizes(badVideo2);
        expect(result[0].sizes).to.deep.equal([[600, 600]]);
        expect(result[0].mediaTypes.video.playerSize).to.be.undefined;
        expect(result[0].mediaTypes.video).to.exist;
        sinon.assert.called(utils.logError);

        let badNativeImgSize = [{
          mediaTypes: {
            native: {
              image: {
                sizes: '300x250'
              }
            }
          }
        }];
        result = checkBidRequestSizes(badNativeImgSize);
        expect(result[0].mediaTypes.native.image.sizes).to.be.undefined;
        expect(result[0].mediaTypes.native.image).to.exist;
        sinon.assert.called(utils.logError);

        let badNativeImgAspRat = [{
          mediaTypes: {
            native: {
              image: {
                aspect_ratios: '300x250'
              }
            }
          }
        }];
        result = checkBidRequestSizes(badNativeImgAspRat);
        expect(result[0].mediaTypes.native.image.aspect_ratios).to.be.undefined;
        expect(result[0].mediaTypes.native.image).to.exist;
        sinon.assert.called(utils.logError);

        let badNativeIcon = [{
          mediaTypes: {
            native: {
              icon: {
                sizes: '300x250'
              }
            }
          }
        }];
        result = checkBidRequestSizes(badNativeIcon);
        expect(result[0].mediaTypes.native.icon.sizes).to.be.undefined;
        expect(result[0].mediaTypes.native.icon).to.exist;
        sinon.assert.called(utils.logError);
      });
    });
  });
});
