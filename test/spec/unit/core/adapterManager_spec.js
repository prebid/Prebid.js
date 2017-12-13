import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
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

describe('adapterManager tests', () => {
  describe('callBids', () => {
    beforeEach(() => {
      sinon.stub(utils, 'logError');
    });

    afterEach(() => {
      utils.logError.restore();
    });

    it('should log an error if a bidder is used that does not exist', () => {
      let bidRequests = [{
        'bidderCode': 'appnexus',
        'requestId': '1863e370099523',
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
            'requestId': '1863e370099523',
            'startTime': 1462918897462,
            'status': 1,
            'transactionId': 'fsafsa'
          },
          {
            'bidder': 'fakeBidder',
            'params': {
              'placementId': '4799418'
            },
            'adUnitCode': '/19968336/header-bid-tag-0',
            'sizes': [[300, 250], [300, 600]],
            'bidId': '4dccdc37746135',
            'bidderRequestId': '2946b569352ef2',
            'requestId': '1863e370099523',
            'startTime': 1462918897463,
            'status': 1,
            'transactionId': 'fsafsa'
          }
        ],
        'start': 1462918897460
      }];
      const adUnits = [{
        code: 'adUnit-code',
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'fakeBidder', params: {placementId: 'id'}}
        ]
      }];

      AdapterManager.callBids(adUnits, bidRequests);

      sinon.assert.called(utils.logError);
    });

    it('should emit BID_REQUESTED event', () => {
      // function to count BID_REQUESTED events
      let cnt = 0;
      let count = () => cnt++;
      events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      AdapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
      let adUnits = getAdUnits();
      let bidRequests = AdapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      AdapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
      expect(cnt).to.equal(1);
      sinon.assert.calledOnce(appnexusAdapterMock.callBids);
      appnexusAdapterMock.callBids.reset();
      delete AdapterManager.bidderRegistry['appnexus'];
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
        'requestId': '1863e370099523',
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
                'requestId': '1ff753bd4ae5cb',
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
                'requestId': '1ff753bd4ae5cb',
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
            'requestId': '1863e370099523',
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
            'requestId': '1863e370099523',
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
        'requestId': '1863e370099523',
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
                'requestId': '1ff753bd4ae5cb',
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
                'requestId': '1ff753bd4ae5cb',
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
            'requestId': '1863e370099523',
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
            'requestId': '1863e370099523',
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
        cnt = 0;
        events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      afterEach(() => {
        events.off(CONSTANTS.EVENTS.BID_REQUESTED, count);
      });

      it('should fire for s2s requests', () => {
        let adUnits = getAdUnits();
        let bidRequests = AdapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
        AdapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
        expect(cnt).to.equal(1);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      });

      it('should fire for simultaneous s2s and client requests', () => {
        AdapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
        let adUnits = getAdUnits();
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
    function getTestAdUnits() {
      // copy adUnits
      return JSON.parse(JSON.stringify(getAdUnits()));
    }

    function callBids(adUnits = getTestAdUnits()) {
      let bidRequests = AdapterManager.makeBidRequests(adUnits, 1111, 2222, 1000);
      AdapterManager.callBids(adUnits, bidRequests, () => {}, () => {});
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

      stubGetSourceBidderMap = sinon.stub(s2sTesting, 'getSourceBidderMap');

      prebidServerAdapterMock.callBids.reset();
      adequantAdapterMock.callBids.reset();
      appnexusAdapterMock.callBids.reset();
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

    // Note: remove this describe once Prebid is 1.0
    describe('old way', function() {
      let originalRegistry;

      function SampleAdapter() {
        return Object.assign(this, {
          callBids: sinon.stub(),
          setBidderCode: sinon.stub()
        });
      }

      before(() => {
        originalRegistry = AdapterManager.bidderRegistry;
        AdapterManager.bidderRegistry[CODE] = new SampleAdapter();
      });

      after(() => {
        AdapterManager.bidderRegistry = originalRegistry;
      });

      it('should add alias to registry', () => {
        const alias = 'testalias';
        AdapterManager.aliasBidAdapter(CODE, alias);
        expect(AdapterManager.bidderRegistry).to.have.property(alias);
      });
    });

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

      describe('sizeMapping', () => {
        beforeEach(() => {
          sinon.stub(window, 'matchMedia', () => ({matches: true}));
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
      })
    });
  });
});
