import {expect} from 'chai';
import Adapter from '../../../modules/antsBidAdapter';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('Ants Adapter', () => {
  let adapter;

  const REQUEST = {
    bidderCode: 'ants',
    bids: [
      {
        bidder: 'ants',
        params: {
          zoneId: '583906268'
        },
        placementCode: 'ants_583906268',
        sizes: [[300, 250]],
        bidId: 'ants_1234',
        requestId: 'ants_5678'
      }
    ]
  };

  sinon.stub(bidManager, 'addBidResponse');
  const adLoaderStub = sinon.stub(adLoader, 'loadScript');

  describe('callBids', () => {
    adapter = new Adapter();
    adapter.callBids(REQUEST);
    expect(adLoaderStub.getCall(0).args[0]).to.contain('hb/583906268.json');
  });
});
