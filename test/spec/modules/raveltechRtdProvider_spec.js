import {hook} from '../../../src/hook.js';
import {BANNER} from '../../../src/mediaTypes.js';
import {raveltechSubmodule} from 'modules/raveltechRtdProvider';
import adapterManager from '../../../src/adapterManager.js';
import {registerBidder} from 'src/adapters/bidderFactory.js';

describe('raveltechRtdProvider', () => {
  const fakeBuildRequests = sinon.spy((valibBidRequests) => {
    return { method: 'POST', data: { count: valibBidRequests.length, uids: valibBidRequests[0]?.userIdAsEids }, url: 'https://www.fakebidder.com' }
  });

  const fakeZkad = sinon.spy((id) => id.substr(0, 3));
  const fakeAjax = sinon.spy();

  const fakeBidReq = {
    adUnitCode: 'adunit',
    adUnitId: '123',
    auctionId: 'abc',
    bidId: 'abc123',
    userIdAsEids: [
      { source: 'usersource.com', uids: [ { id: 'testid123', atype: 1 } ] }
    ]
  };

  before(() => {
    hook.ready();
    // Setup fake bidder
    const stubBidder = {
      code: 'test',
      supportedMediaTypes: [BANNER],
      buildRequests: fakeBuildRequests,
      interpretResponse: () => [],
      isBidRequestValid: () => true
    };
    registerBidder(stubBidder);
    adapterManager.aliasBidAdapter('test', 'alias1');
    adapterManager.aliasBidAdapter('test', 'alias2');

    // Init module
    raveltechSubmodule.init({ params: { bidders: [ 'alias1', 'test' ], preserveOriginalBid: true } });
  })

  afterEach(() => {
    fakeBuildRequests.resetHistory();
    fakeZkad.resetHistory();
    fakeAjax.resetHistory();
  })

  it('do not wrap bidder not in bidders params', () => {
    adapterManager.getBidAdapter('alias2').callBids({
      auctionId: '123',
      bidderCode: 'alias2',
      bidderRequestId: 'abc',
      bids: [ { ...fakeBidReq, bidder: 'alias2' } ]
    }, sinon.stub(), sinon.stub(), fakeAjax, sinon.stub(), sinon.stub());
    expect(fakeAjax.calledOnce).to.be.true;
    expect(fakeZkad.called).to.be.false;
    expect(fakeBuildRequests.calledOnce).to.be.true;
    expect(fakeAjax.getCall(0).args[2]).to.contain('"id":"testid123"');
    expect(fakeAjax.getCall(0).args[2]).not.to.contain('"pbjsAdapter":"test"');
  })

  it('wrap bidder only by alias', () => {
    adapterManager.getBidAdapter('alias2').callBids({
      auctionId: '123',
      bidderCode: 'test',
      bidderRequestId: 'abc',
      bids: [ { ...fakeBidReq, bidder: 'test' } ]
    }, sinon.stub(), sinon.stub(), fakeAjax, sinon.stub(), sinon.stub());
    expect(fakeAjax.calledOnce).to.be.true;
    expect(fakeZkad.called).to.be.false;
    expect(fakeBuildRequests.calledOnce).to.be.true;
    expect(fakeAjax.getCall(0).args[2]).to.contain('"id":"testid123"');
    expect(fakeAjax.getCall(0).args[2]).not.to.contain('"pbjsAdapter":"test"');
  })

  it('do not call ravel when ZKAD unavailable', () => {
    adapterManager.getBidAdapter('alias1').callBids({
      auctionId: '123',
      bidderCode: 'test',
      bidderRequestId: 'abc',
      bids: [ { ...fakeBidReq, bidder: 'test' } ]
    }, sinon.stub(), sinon.stub(), fakeAjax, sinon.stub(), sinon.stub());
    expect(fakeAjax.calledOnce).to.be.true;
    expect(fakeZkad.called).to.be.false;
    expect(fakeBuildRequests.calledOnce).to.be.true;
    expect(fakeAjax.getCall(0).args[2]).to.contain('"id":"testid123"');
    expect(fakeAjax.getCall(0).args[2]).not.to.contain('"pbjsAdapter":"test"');
  })

  it('successfully replace uids with ZKAD', () => {
    window.ZKAD = { anonymizeID: fakeZkad, ready: true };
    adapterManager.getBidAdapter('alias1').callBids({
      auctionId: '123',
      bidderCode: 'test',
      bidderRequestId: 'abc',
      bids: [ { ...fakeBidReq, bidder: 'test' } ]
    }, sinon.stub(), sinon.stub(), fakeAjax, sinon.stub(), sinon.stub());
    expect(fakeAjax.calledTwice).to.be.true;
    expect(fakeZkad.calledOnce).to.be.true;
    expect(fakeBuildRequests.calledTwice).to.be.true;
    expect(fakeAjax.getCall(0).args[2]).to.contain('"id":"testid123"');
    expect(fakeAjax.getCall(1).args[2]).not.to.contain('"id":"testid123"');
    expect(fakeAjax.getCall(1).args[2]).to.contain('"id":"tes"');
    expect(fakeAjax.getCall(0).args[2]).not.to.contain('"pbjsAdapter":"test"');
    expect(fakeAjax.getCall(1).args[2]).to.contain('"pbjsAdapter":"test"');
  })
})
