import {
  expect
} from 'chai';
import * as utils from 'src/utils';
import InvibesAdapter from 'modules/invibesBidAdapter';
import bidmanager from 'src/bidmanager';

let getDefaultBidRequest = () => {
  return {
    bidderCode: 'invibes',
    requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
    bidderRequestId: '7101db09af0db2',
    start: new Date().getTime(),
    bids: [{
      bidder: 'invibes',
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      requestId: 'd3e07445-ab06-44c8-a9dd-5ef9af06d2a6',
      placementCode: 'test-div',
      params: {
        placementId: '1234567',
        customEndpoint: 'https://static.r66net.com/bid/testEndpoint.js'
      }
    }]
  };
};

describe('InvibesAdapter', () => {
  let adapter;

  function createBidderRequest({
    bids,
    params
  } = {}) {
    var bidderRequest = getDefaultBidRequest();
    if (bids && Array.isArray(bids)) {
      bidderRequest.bids = bids;
    }
    if (params) {
      bidderRequest.bids.forEach(bid => bid.params = params);
    }
    return bidderRequest;
  }

  beforeEach(() => adapter = new InvibesAdapter());

  describe('callBids()', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    describe('bid request', () => {
      beforeEach(() => {
        sinon.stub(utils, 'createContentToExecuteExtScriptInFriendlyFrame', function() {
          return '';
        });
      });

      afterEach(() => {
        utils.createContentToExecuteExtScriptInFriendlyFrame.restore();
      });

      it('requires parameters to be made', () => {
        adapter.callBids({});
        utils.createContentToExecuteExtScriptInFriendlyFrame.calledOnce.should.be.false;
      });

      it('valid placement test creative', () => {
        var bidRequest = createBidderRequest();
        adapter.callBids(bidRequest);
        var callURL = utils.createContentToExecuteExtScriptInFriendlyFrame.getCall(0).args[0];
        expect(bidRequest.bids[0].params.placementId).to.equal('1234567');
        expect(callURL).to.contain('placementIds');
      });
    });

    describe('#handleInvibesCallback: ', () => {
      beforeEach(() => {
        sinon.stub(utils, 'createContentToExecuteExtScriptInFriendlyFrame', function() {
          return '';
        });
        sinon.stub(bidmanager, 'addBidResponse');
      });

      afterEach(() => {
        utils.createContentToExecuteExtScriptInFriendlyFrame.restore();
        bidmanager.addBidResponse.restore();
      });

      it('exists and is a function', () => {
        expect($$PREBID_GLOBAL$$.handleInvibesCallback).to.exist.and.to.be.a('function');
      });

      it('empty response, arguments not passed', () => {
        adapter.callBids(createBidderRequest());
        $$PREBID_GLOBAL$$.handleInvibesCallback();
        expect(bidmanager.addBidResponse.callCount).to.equal(0);
      });

      it('not empty response', () => {
        adapter.callBids(createBidderRequest());
        $$PREBID_GLOBAL$$.handleInvibesCallback({
          bidstatus: '1',
          bid: 0.01,
          placementId: '1234567'
        });
        sinon.assert.called(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('test-div');
        var theBid = bidmanager.addBidResponse.firstCall.args[1];
        expect(theBid.bidderCode).to.equal('invibes');
        expect(theBid.cpm).to.equal(0.01);
      });

      it('not empty response but invalid status', () => {
        adapter.callBids(createBidderRequest());
        $$PREBID_GLOBAL$$.handleInvibesCallback({
          bidstatus: '0',
          placementId: '1234567'
        });
        sinon.assert.called(bidmanager.addBidResponse);
        expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('test-div');
        var theBid = bidmanager.addBidResponse.firstCall.args[1];
        expect(theBid.bidderCode).to.equal('invibes');
      });
    });
  });
});
