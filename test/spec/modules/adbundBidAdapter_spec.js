import { expect } from 'chai';
import Adapter from '../../../modules/adbundBidAdapter';
import bidManager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('adbund adapter tests', function () {
  let sandbox;
  let adapter;
  let server;

  const request = {
    bidderCode: 'adbund',
    bids: [{
      bidder: 'adbund',
      params: {
        sid: '110238',
        bidfloor: 0.036
      },
      placementCode: 'adbund',
      sizes: [[300, 250]],
      bidId: 'adbund_bidId',
      bidderRequestId: 'adbund_bidderRequestId',
      requestId: 'adbund_requestId'
    }]
  };

  const response = {
    bidderCode: 'adbund',
    cpm: 1.06,
    height: 250,
    width: 300
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('adbund callBids validation', () => {
    beforeEach(() => {
      adapter = new Adapter();
    });

    afterEach(() => {
    });

    it('Valid bid-request', () => {
      let bidderRequest;

      sandbox.stub(adapter, 'callBids');
      adapter.callBids(request);

      bidderRequest = adapter.callBids.getCall(0).args[0];

      expect(bidderRequest).to.have.property('bids')
        .that.is.an('array')
        .with.lengthOf(1);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .to.have.property('bidder', 'adbund');

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('sizes')
        .that.is.an('array')
        .with.lengthOf(1)
        .that.deep.equals(request.bids[0].sizes);

      expect(bidderRequest).to.have.deep.property('bids[0]')
        .with.property('params')
        .to.have.property('bidfloor', 0.036);
    });

    it('Valid bid-response', () => {
      var bidderResponse;

      sandbox.stub(bidManager, 'addBidResponse');
      adapter.callBids(request);
      bidderResponse = bidManager.addBidResponse.getCall(0) ||
    bidManager.addBidResponse.getCall(1);

      if (bidderResponse && bidderResponse.args && bidderResponse.args[1]) {
        bidderResponse = bidderResponse.args[1];
        expect(bidderResponse.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
        expect(bidderResponse.bidderCode).to.equal(response.bidderCode);
        expect(bidderResponse.width).to.equal(response.width);
        expect(bidderResponse.height).to.equal(response.height);
        expect(bidderResponse.cpm).to.equal(response.cpm);
      }
    });
  });
});
