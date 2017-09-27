import { newBidder, registerBidder } from 'src/adapters/bidderFactory';
import bidmanager from 'src/bidmanager';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import { expect } from 'chai';
import { STATUS } from 'src/constants';
import { userSync } from 'src/userSync'

const CODE = 'sampleBidder';
const MOCK_BIDS_REQUEST = {
  bids: [
    {
      requestId: 'first-bid-id',
      placementCode: 'mock/placement',
      params: {
        param: 5
      }
    },
    {
      requestId: 'second-bid-id',
      placementCode: 'mock/placement2',
      params: {
        badParam: 6
      }
    }
  ]
}

describe('bidders created by newBidder', () => {
  let spec;
  let addBidRequestStub;
  let bidder;

  beforeEach(() => {
    spec = {
      code: CODE,
      isBidRequestValid: sinon.stub(),
      buildRequests: sinon.stub(),
      interpretResponse: sinon.stub(),
      getUserSyncs: sinon.stub()
    };
    addBidRequestStub = sinon.stub(bidmanager, 'addBidResponse');
  });

  afterEach(() => {
    addBidRequestStub.restore();
  });

  describe('when the ajax response is irrelevant', () => {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax');
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('should handle bad bid requests gracefully', () => {
      const bidder = newBidder(spec);

      spec.getUserSyncs.returns([]);

      bidder.callBids({});
      bidder.callBids({ bids: 'nothing useful' });

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.called).to.equal(false);
      expect(spec.buildRequests.called).to.equal(false);
      expect(spec.interpretResponse.called).to.equal(false);
    });

    it('should call buildRequests(bidRequest) the params are valid', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal(MOCK_BIDS_REQUEST.bids);
    });

    it('should not call buildRequests the params are invalid', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.called).to.equal(false);
    });

    it('should filter out invalid bids before calling buildRequests', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.onFirstCall().returns(true);
      spec.isBidRequestValid.onSecondCall().returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal([MOCK_BIDS_REQUEST.bids[0]]);
    });

    it("should make no server requests if the spec doesn't return any", () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
    });

    it('should make the appropriate POST request', () => {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: url,
        data: data
      });

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(url);
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'text/plain',
        withCredentials: true
      });
    });

    it('should make the appropriate GET request', () => {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'GET',
        url: url,
        data: data
      });

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2&`);
      expect(ajaxStub.firstCall.args[2]).to.be.undefined;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'GET',
        withCredentials: true
      });
    });

    it('should make multiple calls if the spec returns them', () => {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([
        {
          method: 'POST',
          url: url,
          data: data
        },
        {
          method: 'GET',
          url: url,
          data: data
        }
      ]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.calledTwice).to.equal(true);
    });

    it('should add bids for each placement code if no requests are given', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(bidmanager.addBidResponse.calledTwice).to.equal(true);
      const placementsWithBids =
        [bidmanager.addBidResponse.firstCall.args[0], bidmanager.addBidResponse.secondCall.args[0]];
      expect(placementsWithBids).to.contain('mock/placement');
      expect(placementsWithBids).to.contain('mock/placement2');
    });
  });

  describe('when the ajax call succeeds', () => {
    let ajaxStub;
    let userSyncStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax', function(url, callbacks) {
        callbacks.success('response body');
      });
      userSyncStub = sinon.stub(userSync, 'registerSync')
    });

    afterEach(() => {
      ajaxStub.restore();
      userSyncStub.restore();
    });

    it('should call spec.interpretResponse() with the response body content', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.interpretResponse.calledOnce).to.equal(true);
      expect(spec.interpretResponse.firstCall.args[0]).to.equal('response body');
      expect(spec.interpretResponse.firstCall.args[1]).to.deep.equal({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
    });

    it('should call spec.interpretResponse() once for each request made', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([
        {
          method: 'POST',
          url: 'test.url.com',
          data: {}
        },
        {
          method: 'POST',
          url: 'test.url.com',
          data: {}
        },
      ]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.interpretResponse.calledTwice).to.equal(true);
    });

    it("should add bids for each placement code into the bidmanager, even if the bidder doesn't bid on all of them", () => {
      const bidder = newBidder(spec);

      const bid = {
        requestId: 'some-id',
        ad: 'ad-url.com',
        cpm: 0.5,
        height: 200,
        width: 300,
        placementCode: 'mock/placement'
      };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      spec.interpretResponse.returns(bid);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(bidmanager.addBidResponse.calledTwice).to.equal(true);
      const placementsWithBids =
        [bidmanager.addBidResponse.firstCall.args[0], bidmanager.addBidResponse.secondCall.args[0]];
      expect(placementsWithBids).to.contain('mock/placement');
      expect(placementsWithBids).to.contain('mock/placement2');
    });

    it('should call spec.getUserSyncs() with the response', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal(['response body']);
    });

    it('should register usersync pixels', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);
      spec.getUserSyncs.returns([{
        type: 'iframe',
        url: 'usersync.com'
      }]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(userSyncStub.called).to.equal(true);
      expect(userSyncStub.firstCall.args[0]).to.equal('iframe');
      expect(userSyncStub.firstCall.args[1]).to.equal(spec.code);
      expect(userSyncStub.firstCall.args[2]).to.equal('usersync.com');
    });
  });

  describe('when the ajax call fails', () => {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax', function(url, callbacks) {
        callbacks.error('ajax call failed.');
      });
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('should not spec.interpretResponse()', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.interpretResponse.called).to.equal(false);
    });

    it('should add bids for each placement code into the bidmanager', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(bidmanager.addBidResponse.calledTwice).to.equal(true);
      const placementsWithBids =
        [bidmanager.addBidResponse.firstCall.args[0], bidmanager.addBidResponse.secondCall.args[0]];
      expect(placementsWithBids).to.contain('mock/placement');
      expect(placementsWithBids).to.contain('mock/placement2');
    });

    it('should call spec.getUserSyncs() with no responses', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal([]);
    });
  });
});

describe('registerBidder', () => {
  let registerBidAdapterStub;
  let aliasBidAdapterStub;

  beforeEach(() => {
    registerBidAdapterStub = sinon.stub(adaptermanager, 'registerBidAdapter');
    aliasBidAdapterStub = sinon.stub(adaptermanager, 'aliasBidAdapter');
  });

  afterEach(() => {
    registerBidAdapterStub.restore();
    aliasBidAdapterStub.restore();
  });

  function newEmptySpec() {
    return {
      code: CODE,
      isBidRequestValid: function() { },
      buildRequests: function() { },
      interpretResponse: function() { },
    };
  }

  it('should register a bidder with the adapterManager', () => {
    registerBidder(newEmptySpec());
    expect(registerBidAdapterStub.calledOnce).to.equal(true);
    expect(registerBidAdapterStub.firstCall.args[0]).to.have.property('callBids');
    expect(registerBidAdapterStub.firstCall.args[0].callBids).to.be.a('function');

    expect(registerBidAdapterStub.firstCall.args[1]).to.equal(CODE);
    expect(registerBidAdapterStub.firstCall.args[2]).to.be.undefined;
  });

  it('should register a bidder with the appropriate mediaTypes', () => {
    const thisSpec = Object.assign(newEmptySpec(), { supportedMediaTypes: ['video'] });
    registerBidder(thisSpec);
    expect(registerBidAdapterStub.calledOnce).to.equal(true);
    expect(registerBidAdapterStub.firstCall.args[2]).to.deep.equal({supportedMediaTypes: ['video']});
  });

  it('should register bidders with the appropriate aliases', () => {
    const thisSpec = Object.assign(newEmptySpec(), { aliases: ['foo', 'bar'] });
    registerBidder(thisSpec);

    expect(registerBidAdapterStub.calledThrice).to.equal(true);

    // Make sure our later calls don't override the bidder code from previous calls.
    expect(registerBidAdapterStub.firstCall.args[0].getBidderCode()).to.equal(CODE);
    expect(registerBidAdapterStub.secondCall.args[0].getBidderCode()).to.equal('foo')
    expect(registerBidAdapterStub.thirdCall.args[0].getBidderCode()).to.equal('bar')

    expect(registerBidAdapterStub.firstCall.args[1]).to.equal(CODE);
    expect(registerBidAdapterStub.secondCall.args[1]).to.equal('foo')
    expect(registerBidAdapterStub.thirdCall.args[1]).to.equal('bar')
  });
})
