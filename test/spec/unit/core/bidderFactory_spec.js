import newBidder from 'src/adapters/bidderFactory';
import bidmanager from 'src/bidmanager';
import * as ajax from 'src/ajax';
import { expect } from 'chai';
import { STATUS } from 'src/constants';

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

describe('The bidder factory', () => {
  let spec;
  let bidder;
  let addBidRequestStub;

  beforeEach(() => {
    spec = {
      code: CODE,
      areParamsValid: sinon.stub(),
      buildRequests: sinon.stub(),
      interpretResponse: sinon.stub()
    };
    bidder = newBidder(spec);
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
      bidder.callBids({});
      bidder.callBids({ bids: 'nothing useful' });

      expect(ajaxStub.called).to.equal(false);
      expect(spec.areParamsValid.called).to.equal(false);
      expect(spec.buildRequests.called).to.equal(false);
      expect(spec.interpretResponse.called).to.equal(false);
    });

    it('should call buildRequests(bidRequest) the params are valid', () => {
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.areParamsValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal(MOCK_BIDS_REQUEST.bids);
    });

    it('should not call buildRequests the params are invalid', () => {
      spec.areParamsValid.returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.areParamsValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.called).to.equal(false);
    });

    it('should filter out invalid bids before calling buildRequests', () => {
      spec.areParamsValid.onFirstCall().returns(true);
      spec.areParamsValid.onSecondCall().returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.areParamsValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal([MOCK_BIDS_REQUEST.bids[0]]);
    });

    it("should make no server requests if the spec doesn't return any", () => {
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.called).to.equal(false);
    });

    it('should make the appropriate POST request', () => {
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns({
        type: 'POST',
        endpoint: url,
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
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns({
        type: 'GET',
        endpoint: url,
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
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns([
        {
          type: 'POST',
          endpoint: url,
          data: data
        },
        {
          type: 'GET',
          endpoint: url,
          data: data
        }
      ]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(ajaxStub.calledTwice).to.equal(true);
    });
  });

  describe('when the ajax call succeeds', () => {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax', function(url, callbacks) {
        callbacks.success('response body');
      });
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('should call spec.interpretResponse() with the response body content', () => {
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns({
        type: 'POST',
        endpoint: 'test.url.com',
        data: {}
      });

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.interpretResponse.calledOnce).to.equal(true);
      expect(spec.interpretResponse.firstCall.args[0]).to.equal('response body');
    });

    it('should call spec.interpretResponse() once for each request made', () => {
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns([
        {
          type: 'POST',
          endpoint: 'test.url.com',
          data: {}
        },
        {
          type: 'POST',
          endpoint: 'test.url.com',
          data: {}
        },
      ]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.interpretResponse.calledTwice).to.equal(true);
    });

    it("should add bids for each placement code into the bidmanager, even if the bidder doesn't bid on all of them", () => {
      const bid = {
        requestId: 'some-id',
        ad: 'ad-url.com',
        cpm: 0.5,
        height: 200,
        width: 300,
        placementCode: 'mock/placement'
      };
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns({
        type: 'POST',
        endpoint: 'test.url.com',
        data: {}
      });
      spec.interpretResponse.returns(bid);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(bidmanager.addBidResponse.calledTwice).to.equal(true);
      const placementsWithBids =
        [bidmanager.addBidResponse.firstCall.args[0], bidmanager.addBidResponse.secondCall.args[0]];
      expect(placementsWithBids).to.contain('mock/placement');
      expect(placementsWithBids).to.contain('mock/placement2');
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
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns({
        type: 'POST',
        endpoint: 'test.url.com',
        data: {}
      });

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(spec.interpretResponse.called).to.equal(false);
    });

    it('should add bids for each placement code into the bidmanager', () => {
      spec.areParamsValid.returns(true);
      spec.buildRequests.returns({
        type: 'POST',
        endpoint: 'test.url.com',
        data: {}
      });
      spec.interpretResponse.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST);

      expect(bidmanager.addBidResponse.calledTwice).to.equal(true);
      const placementsWithBids =
        [bidmanager.addBidResponse.firstCall.args[0], bidmanager.addBidResponse.secondCall.args[0]];
      expect(placementsWithBids).to.contain('mock/placement');
      expect(placementsWithBids).to.contain('mock/placement2');
    });
  });
});
