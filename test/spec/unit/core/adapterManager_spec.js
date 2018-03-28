import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
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
  describe('callBids', () => {
    beforeEach(() => {
      sinon.stub(utils, 'logError');
    });

    afterEach(() => {
      utils.logError.restore();
    });

    it('should log an error if a bidder is used that does not exist', () => {
      const adUnits = [{
        code: 'adUnit-code',
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'fakeBidder', params: {placementId: 'id'}}
        ]
      }];

      AdapterManager.callBids({adUnits});

      sinon.assert.called(utils.logError);
    });

    it('should emit BID_REQUESTED event', () => {
      // function to count BID_REQUESTED events
      let cnt = 0;
      let count = () => cnt++;
      events.on(CONSTANTS.EVENTS.BID_REQUESTED, count);
      AdapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;
      AdapterManager.callBids({adUnits: getAdUnits()});
      expect(cnt).to.equal(1);
      sinon.assert.calledOnce(appnexusAdapterMock.callBids);
      appnexusAdapterMock.callBids.reset();
      delete AdapterManager.bidderRegistry['appnexus'];
      events.off(CONSTANTS.EVENTS.BID_REQUESTED, count);
    });
  });

  describe('S2S tests', () => {
    beforeEach(() => {
      AdapterManager.setS2SConfig(CONFIG);
      AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;

      prebidServerAdapterMock.callBids.reset();
    });

    it('invokes callBids on the S2S adapter', () => {
      AdapterManager.callBids({adUnits: getAdUnits()});
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
    });

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
      AdapterManager.callBids({adUnits: adUnits});
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
        AdapterManager.callBids({adUnits: getAdUnits()});
        expect(cnt).to.equal(1);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      });

      it('should fire for simultaneous s2s and client requests', () => {
        AdapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
        AdapterManager.callBids({adUnits: getAdUnits()});
        expect(cnt).to.equal(2);
        sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
        sinon.assert.calledOnce(adequantAdapterMock.callBids);
        adequantAdapterMock.callBids.reset();
        delete AdapterManager.bidderRegistry['adequant'];
      });
    });
  }); // end s2s tests

  describe('The setBidderSequence() function', () => {
    let spy;

    beforeEach(() => {
      spy = sinon.spy(utils, 'logWarn')
    });

    afterEach(() => {
      utils.logWarn.restore();
    });

    it('should log a warning on invalid values', () => {
      AdapterManager.setBidderSequence('unrecognized sequence');
      expect(spy.calledOnce).to.equal(true);
    });

    it('should not log warnings when given recognized values', () => {
      AdapterManager.setBidderSequence('fixed');
      AdapterManager.setBidderSequence('random');
      expect(spy.called).to.equal(false);
    });
  })

  describe('s2sTesting', () => {
    function getTestAdUnits() {
      // copy adUnits
      return JSON.parse(JSON.stringify(getAdUnits()));
    }

    function checkServerCalled(numAdUnits, numBids) {
      sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
      var requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
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

    var TESTING_CONFIG;
    var stubGetSourceBidderMap;

    beforeEach(() => {
      TESTING_CONFIG = Object.assign(CONFIG, {
        bidders: ['appnexus', 'adequant'],
        testing: true
      });

      AdapterManager.setS2SConfig(CONFIG);
      AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
      AdapterManager.bidderRegistry['adequant'] = adequantAdapterMock;
      AdapterManager.bidderRegistry['appnexus'] = appnexusAdapterMock;

      stubGetSourceBidderMap = sinon.stub(s2sTesting, 'getSourceBidderMap');

      prebidServerAdapterMock.callBids.reset();
      adequantAdapterMock.callBids.reset();
      appnexusAdapterMock.callBids.reset();
    });

    afterEach(() => {
      s2sTesting.getSourceBidderMap.restore();
    });

    it('calls server adapter if no sources defined', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: [], [s2sTesting.SERVER]: []});
      AdapterManager.setS2SConfig(TESTING_CONFIG);
      AdapterManager.callBids({adUnits: getTestAdUnits()});

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client adapter if one client source defined', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus'], [s2sTesting.SERVER]: []});
      AdapterManager.setS2SConfig(TESTING_CONFIG);
      AdapterManager.callBids({adUnits: getTestAdUnits()});

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client adapters if client sources defined', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      AdapterManager.setS2SConfig(TESTING_CONFIG);
      AdapterManager.callBids({adUnits: getTestAdUnits()});

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('does not call server adapter for bidders that go to client', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      AdapterManager.setS2SConfig(TESTING_CONFIG);
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.CLIENT;
      adUnits[0].bids[1].finalSource = s2sTesting.CLIENT;
      adUnits[1].bids[0].finalSource = s2sTesting.CLIENT;
      adUnits[1].bids[1].finalSource = s2sTesting.CLIENT;
      AdapterManager.callBids({adUnits});

      // server adapter
      sinon.assert.notCalled(prebidServerAdapterMock.callBids);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('does not call client adapters for bidders that go to server', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      AdapterManager.setS2SConfig(TESTING_CONFIG);
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.SERVER;
      adUnits[0].bids[1].finalSource = s2sTesting.SERVER;
      adUnits[1].bids[0].finalSource = s2sTesting.SERVER;
      adUnits[1].bids[1].finalSource = s2sTesting.SERVER;
      AdapterManager.callBids({adUnits});

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      sinon.assert.notCalled(appnexusAdapterMock.callBids);

      // adequant
      sinon.assert.notCalled(adequantAdapterMock.callBids);
    });

    it('calls client and server adapters for bidders that go to both', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      AdapterManager.setS2SConfig(TESTING_CONFIG);
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.BOTH;
      adUnits[0].bids[1].finalSource = s2sTesting.BOTH;
      adUnits[1].bids[0].finalSource = s2sTesting.BOTH;
      adUnits[1].bids[1].finalSource = s2sTesting.BOTH;
      AdapterManager.callBids({adUnits});

      // server adapter
      checkServerCalled(2, 2);

      // appnexus
      checkClientCalled(appnexusAdapterMock, 2);

      // adequant
      checkClientCalled(adequantAdapterMock, 2);
    });

    it('makes mixed client/server adapter calls for mixed bidder sources', () => {
      stubGetSourceBidderMap.returns({[s2sTesting.CLIENT]: ['appnexus', 'adequant'], [s2sTesting.SERVER]: []});
      AdapterManager.setS2SConfig(TESTING_CONFIG);
      var adUnits = getTestAdUnits();
      adUnits[0].bids[0].finalSource = s2sTesting.CLIENT;
      adUnits[0].bids[1].finalSource = s2sTesting.CLIENT;
      adUnits[1].bids[0].finalSource = s2sTesting.SERVER;
      adUnits[1].bids[1].finalSource = s2sTesting.SERVER;
      AdapterManager.callBids({adUnits});

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
  });
});
