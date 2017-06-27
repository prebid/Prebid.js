import { expect } from 'chai';
import AdapterManager from 'src/adaptermanager';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';

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
  setConfig: sinon.stub()
};

describe('adapterManager tests', () => {
  beforeEach(() => {
    AdapterManager.setS2SConfig(CONFIG);
    AdapterManager.bidderRegistry['prebidServer'] = prebidServerAdapterMock;
    prebidServerAdapterMock.callBids.reset();
  });

  it('invokes callBids on the adapter', () => {
    AdapterManager.callBids({adUnits: getAdUnits()});
    sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
  });

  it('invokes callBids with the correct bidders', () => {
    AdapterManager.callBids({adUnits: getAdUnits()});
    const requestObj = prebidServerAdapterMock.callBids.firstCall.args[0];
    expect(requestObj.ad_units.length).to.equal(2);
    sinon.assert.calledOnce(prebidServerAdapterMock.callBids);
  });
});
