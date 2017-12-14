import {expect} from 'chai';
import RealVuAdapter from '../../../modules/realvuBidAdapter';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';

describe('RealVu Adapter Test', () => {
  // let adapter;
  const YES_REQUEST = {
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
        placementCode: 'ad_inside',
        // renderer:undefined,
        sizes: [[300, 250]],
        transactionId: '0d67ddab-1502-4897-a7bf-e8078e983405'
      }
    ],
    start: 1504628062271
  };

  const NO_REQUEST = {
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
        placementCode: 'ad_outside',
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

  var adapter = new RealVuAdapter();

  it('callBids() "yes"', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad_inside';
    ad_div.style = 'width:300px; height:250px;';
    document.body.appendChild(ad_div);
    adapter.callBids(YES_REQUEST);
    expect(adloaderStub.getCall(0).args[0]).to.contain('id=9339508');
    document.body.removeChild(ad_div);
  });

  it('callBid "no"', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad_outside';
    ad_div.style = 'width:300px; height:250px;position:fixed;top:5000px;';
    document.body.appendChild(ad_div);
    adapter.callBids(NO_REQUEST);
    expect(bidResponseStub.getCall(0).args[1].getStatusCode()).to.equal(2);
    document.body.removeChild(ad_div);
  });
});
