import newBidder from 'src/adapters/bidderFactory';
import bidmanager from 'src/bidmanager';
import * as ajax from 'src/ajax';
import { expect } from 'chai';

const CODE = 'sampleBidder';
const MOCK_BIDS_REQUEST = {
  bids: [
    {
      placementCode: 'mock/placement',
      params: {
        param: 5
      }
    },
    {
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
  let ajaxMock;

  beforeEach(() => {
    spec = {
      code: CODE,
      areParamsValid: sinon.stub(),
      buildRequests: sinon.stub(),
      interpretResponse: sinon.stub()
    };
    bidder = newBidder(spec);
    addBidRequestStub = sinon.stub(bidmanager, 'addBidResponse');
    ajaxMock = sinon.mock(ajax);
  });

  afterEach(() => {
    addBidRequestStub.restore();
    ajaxMock.restore();
  })

  it('should handle bad bid requests gracefully', () => {
    ajaxMock.expects('ajax').never();

    bidder.callBids({});
    bidder.callBids({ bids: 'nothing useful' });

    ajaxMock.verify();
    expect(spec.areParamsValid.called).to.equal(false);
    expect(spec.buildRequests.called).to.equal(false);
    expect(spec.interpretResponse.called).to.equal(false);
  });

  it('should call buildRequests(bidRequest) the params are valid', () => {
    spec.areParamsValid.returns(true);
    spec.buildRequests.returns([]);
    ajaxMock.expects('ajax').never();

    bidder.callBids(MOCK_BIDS_REQUEST);

    ajaxMock.verify();
    expect(spec.areParamsValid.calledTwice).to.equal(true);
    expect(spec.buildRequests.calledOnce).to.equal(true);
    expect(spec.buildRequests.firstCall.args[0]).to.deep.equal(MOCK_BIDS_REQUEST.bids);
  });

  it('should not call buildRequests the params are invalid', () => {
    spec.areParamsValid.returns(false);
    spec.buildRequests.returns([]);
    ajaxMock.expects('ajax').never();

    bidder.callBids(MOCK_BIDS_REQUEST);

    ajaxMock.verify();
    expect(spec.areParamsValid.calledTwice).to.equal(true);
    expect(spec.buildRequests.called).to.equal(false);
  });

  it('should filter out invalid bids before calling buildRequests', () => {
    spec.areParamsValid.onFirstCall().returns(true);
    spec.areParamsValid.onSecondCall().returns(false);
    spec.buildRequests.returns([]);
    ajaxMock.expects('ajax').never();

    bidder.callBids(MOCK_BIDS_REQUEST);

    ajaxMock.verify();
    expect(spec.areParamsValid.calledTwice).to.equal(true);
    expect(spec.buildRequests.calledOnce).to.equal(true);
    expect(spec.buildRequests.firstCall.args[0]).to.deep.equal([MOCK_BIDS_REQUEST.bids[0]]);
  });

  it("should make no server requests if the spec doesn't return any", () => {
    spec.areParamsValid.returns(true);
    spec.buildRequests.returns([]);
    ajaxMock.expects('ajax').never();

    bidder.callBids(MOCK_BIDS_REQUEST);

    ajaxMock.verify();
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
    ajaxMock.expects('ajax').once().withArgs(url, sinon.match.object, JSON.stringify(data), {
      method: 'POST',
      contentType: 'text/plain',
      withCredentials: true
    });

    bidder.callBids(MOCK_BIDS_REQUEST);

    ajaxMock.verify();
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
    ajaxMock.expects('ajax').once().withArgs(`${url}?arg=2&`, sinon.match.object, undefined, {
      method: 'GET',
      withCredentials: true
    });

    bidder.callBids(MOCK_BIDS_REQUEST);

    ajaxMock.verify();
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

    ajaxMock.expects('ajax').twice();

    bidder.callBids(MOCK_BIDS_REQUEST);

    ajaxMock.verify();
  });

  // TODO: Pending the sinon 3.0 upgrade, mock the ajax calls and make sure it calls interpretResponse on each.
});
