import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
var s2sTesting = require('../../../../modules/s2sTesting');

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
  callBids: sinon.stub(),
  setConfig: sinon.stub(),
  queueSync: sinon.stub()
};
var adequantAdapterMock = {
  bidder: 'adequant',
  callBids: sinon.stub(),
  setConfig: sinon.stub(),
  queueSync: sinon.stub()
};
var appnexusAdapterMock = {
  bidder: 'appnexus',
  callBids: sinon.stub(),
  setConfig: sinon.stub(),
  queueSync: sinon.stub()
};

describe('adapterManager tests', () => {
  describe('S2S tests', () => {
    beforeEach(() => {
      config.setConfig({s2sConfig: CONFIG});
      AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;

      prebidServerAdapterMock.callBids.reset();
    });

    // Enable this test when prebidServer adapter is made 1.0 compliant
    it.skip('invokes callBids on the S2S adapter', () => {
      let bidRequests = [{
        'bidderCode': 'appnexus',
        'requestId': '1863e370099523',
        'bidderRequestId': '2946b569352ef2',
        'tid': '34566b569352ef2',
        'src': 's2s',
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

      AdapterManager.callBids(getAdUnits(), bidRequests);
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });

    // Enable this test when prebidServer adapter is made 1.0 compliant
    it.skip('invokes callBids with only s2s bids', () => {
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
      AdapterManager.callBids(adUnits, bidRequests);
      const requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
      expect(requestObj.ad_units.length).to.equal(2);
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });
  }); // end s2s tests

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
  });
});
