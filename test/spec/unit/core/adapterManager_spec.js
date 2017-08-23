import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';
import { StorageManager } from 'src/storagemanager';

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
});
