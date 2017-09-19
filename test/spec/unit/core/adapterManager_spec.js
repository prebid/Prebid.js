import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { StorageManager } from 'src/storagemanager';
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
    var stubGetStorageItem;
    var stubSetStorageItem;

    beforeEach(() => {
      AdapterManager.setS2SConfig(CONFIG);
      AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;

      stubGetStorageItem = sinon.stub(StorageManager, 'get');
      stubSetStorageItem = sinon.stub(StorageManager, 'set');
      stubSetStorageItem = sinon.stub(StorageManager, 'add');
      stubSetStorageItem = sinon.stub(StorageManager, 'remove');

      stubGetStorageItem.returns(['appnexus']);

      prebidServerAdapterMock.callBids.reset();
    });

    afterEach(() => {
      StorageManager.get.restore();
      StorageManager.set.restore();
      StorageManager.add.restore();
      StorageManager.remove.restore();
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
      for (let i=0; i<numAdUnits; i++) {
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
    var stubGetStorageItem;
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

      stubGetStorageItem = sinon.stub(StorageManager, 'get');
      sinon.stub(StorageManager, 'set');
      sinon.stub(StorageManager, 'add');
      sinon.stub(StorageManager, 'remove');
      stubGetSourceBidderMap = sinon.stub(s2sTesting, 'getSourceBidderMap');

      stubGetStorageItem.returns(['appnexus', 'adequant']);

      prebidServerAdapterMock.callBids.reset();
      adequantAdapterMock.callBids.reset();
      appnexusAdapterMock.callBids.reset();
    });

    afterEach(() => {
      StorageManager.get.restore();
      StorageManager.set.restore();
      StorageManager.add.restore();
      StorageManager.remove.restore();
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
});
