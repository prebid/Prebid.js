import {expect} from 'chai';
import RealVuAdapter from '../../../modules/realvuBidAdapter';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';

describe('RealVu Adapter Test', () => {
  let adapter;

  const REQUEST = {
    bidderCode: 'realvu',
    requestId: '0d67ddab-1502-4897-a7bf-e8078e983405',
    bidderRequestId: '1b5e314fe79b1d',
    bids: [
      {
        bidId: '2d86a04312d95d',
        bidder: 'realvu',
        bidderRequestId: '1b5e314fe79b1d',
        // mediaType:undefined,
        params: {
          partnerId: '1Y',
          placementId: '9339508',
        },
        placementCode: 'ad_container_1',
        // renderer:undefined,
        sizes: [[300, 250]],
        transactionId: '0d67ddab-1502-4897-a7bf-e8078e983405'
      }
    ],
    start: 1504628062271
  };

  var bidResponseStub;
  var adloaderStub;

  beforeEach(function() {
    bidResponseStub = sinon.stub(bidmanager, 'addBidResponse');
    adloaderStub = sinon.stub(adloader, 'loadScript');
  });

  afterEach(function() {
    adloaderStub.restore();
    bidResponseStub.restore();
  });

  adapter = new RealVuAdapter();

  it('load boost', () => {
    adapter.callBids(REQUEST);
    expect(adloaderStub.getCall(0).args[0]).to.contain('realvu_boost.js');
  });

  it('callBid "yes"', () => {
    adapter.boostCall({realvu: 'yes', pin: {pbjs_bid: REQUEST.bids[0]}});
    expect(adloaderStub.getCall(0).args[0]).to.contain('id=9339508');
  });

  it('callBid "no"', () => {
    adapter.boostCall({realvu: 'no', pin: {pbjs_bid: REQUEST.bids[0]}});
    expect(bidResponseStub.getCall(0).args[1].getStatusCode()).to.equal(2);
  });
});
