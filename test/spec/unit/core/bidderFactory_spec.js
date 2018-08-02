import { newBidder, registerBidder } from 'src/adapters/bidderFactory';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import { expect } from 'chai';
import { STATUS } from 'src/constants';
import { userSync } from 'src/userSync'
import * as utils from 'src/utils';
import { config } from 'src/config';

const CODE = 'sampleBidder';
const MOCK_BIDS_REQUEST = {
  bids: [
    {
      bidId: 1,
      auctionId: 'first-bid-id',
      adUnitCode: 'mock/placement',
      params: {
        param: 5
      }
    },
    {
      bidId: 2,
      auctionId: 'second-bid-id',
      adUnitCode: 'mock/placement2',
      params: {
        badParam: 6
      }
    }
  ]
}

describe('bidders created by newBidder', () => {
  let spec;
  let bidder;
  let addBidResponseStub;
  let doneStub;

  beforeEach(() => {
    spec = {
      code: CODE,
      isBidRequestValid: sinon.stub(),
      buildRequests: sinon.stub(),
      interpretResponse: sinon.stub(),
      getUserSyncs: sinon.stub()
    };

    addBidResponseStub = sinon.stub();
    doneStub = sinon.stub();
  });

  describe('when the ajax response is irrelevant', () => {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax');
      addBidResponseStub.reset();
      doneStub.reset();
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('should handle bad bid requests gracefully', () => {
      const bidder = newBidder(spec);

      spec.getUserSyncs.returns([]);

      bidder.callBids({});
      bidder.callBids({ bids: 'nothing useful' }, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.called).to.equal(false);
      expect(spec.buildRequests.called).to.equal(false);
      expect(spec.interpretResponse.called).to.equal(false);
    });

    it('should call buildRequests(bidRequest) the params are valid', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal(MOCK_BIDS_REQUEST.bids);
    });

    it('should not call buildRequests the params are invalid', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.called).to.equal(false);
    });

    it('should filter out invalid bids before calling buildRequests', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.onFirstCall().returns(true);
      spec.isBidRequestValid.onSecondCall().returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal([MOCK_BIDS_REQUEST.bids[0]]);
    });

    it('should make no server requests if the spec doesn\'t return any', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(url);
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'text/plain',
        withCredentials: true
      });
    });

    it('should make the appropriate POST request when options are passed', () => {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      const options = { contentType: 'application/json' };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: url,
        data: data,
        options: options
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(url);
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'application/json',
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2&`);
      expect(ajaxStub.firstCall.args[2]).to.be.undefined;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'GET',
        withCredentials: true
      });
    });

    it('should make the appropriate GET request when options are passed', () => {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      const opt = { withCredentials: false }
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'GET',
        url: url,
        data: data,
        options: opt
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2&`);
      expect(ajaxStub.firstCall.args[2]).to.be.undefined;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'GET',
        withCredentials: false
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(ajaxStub.calledTwice).to.equal(true);
    });

    it('should not add bids for each placement code if no requests are given', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(addBidResponseStub.callCount).to.equal(0);
    });
  });

  describe('when the ajax call succeeds', () => {
    let ajaxStub;
    let userSyncStub;
    let logErrorSpy;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
        const fakeResponse = sinon.stub();
        fakeResponse.returns('headerContent');
        callbacks.success('response body', { getResponseHeader: fakeResponse });
      });
      addBidResponseStub.reset();
      doneStub.resetBehavior();
      userSyncStub = sinon.stub(userSync, 'registerSync')
      logErrorSpy = sinon.spy(utils, 'logError');
    });

    afterEach(() => {
      ajaxStub.restore();
      userSyncStub.restore();
      utils.logError.restore();
    });

    it('should call spec.interpretResponse() with the response content', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(spec.interpretResponse.calledOnce).to.equal(true);
      const response = spec.interpretResponse.firstCall.args[0]
      expect(response.body).to.equal('response body')
      expect(response.headers.get('some-header')).to.equal('headerContent');
      expect(spec.interpretResponse.firstCall.args[1]).to.deep.equal({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      expect(doneStub.calledOnce).to.equal(true);
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(spec.interpretResponse.calledTwice).to.equal(true);
      expect(doneStub.calledOnce).to.equal(true);
    });

    it('should only add bids for valid adUnit code into the auction, even if the bidder doesn\'t bid on all of them', () => {
      const bidder = newBidder(spec);

      const bid = {
        creativeId: 'creative-id',
        requestId: '1',
        ad: 'ad-url.com',
        cpm: 0.5,
        height: 200,
        width: 300,
        adUnitCode: 'mock/placement',
        currency: 'USD',
        netRevenue: true,
        ttl: 300
      };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      spec.interpretResponse.returns(bid);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      expect(doneStub.calledOnce).to.equal(true);
      expect(logErrorSpy.callCount).to.equal(0);
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1].length).to.equal(1);
      expect(spec.getUserSyncs.firstCall.args[1][0].body).to.equal('response body');
      expect(spec.getUserSyncs.firstCall.args[1][0].headers).to.have.property('get');
      expect(spec.getUserSyncs.firstCall.args[1][0].headers.get).to.be.a('function');
    });

    it('should register usersync pixels', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);
      spec.getUserSyncs.returns([{
        type: 'iframe',
        url: 'usersync.com'
      }]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(userSyncStub.called).to.equal(true);
      expect(userSyncStub.firstCall.args[0]).to.equal('iframe');
      expect(userSyncStub.firstCall.args[1]).to.equal(spec.code);
      expect(userSyncStub.firstCall.args[2]).to.equal('usersync.com');
    });

    it('should logError when required bid response params are missing', () => {
      const bidder = newBidder(spec);

      const bid = {
        requestId: '1',
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(logErrorSpy.calledOnce).to.equal(true);
    });

    it('should logError when required bid response params are undefined', () => {
      const bidder = newBidder(spec);

      const bid = {
        'ad': 'creative',
        'cpm': '1.99',
        'width': 300,
        'height': 250,
        'requestId': '1',
        'creativeId': 'some-id',
        'currency': undefined,
        'netRevenue': true,
        'ttl': 360
      };

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      spec.interpretResponse.returns(bid);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(logErrorSpy.calledOnce).to.equal(true);
    });
  });

  describe('when the ajax call fails', () => {
    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
        callbacks.error('ajax call failed.');
      });
      addBidResponseStub.reset();
      doneStub.reset();
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(spec.interpretResponse.called).to.equal(false);
      expect(doneStub.calledOnce).to.equal(true);
    });

    it('should not add bids for each adunit code into the auction', () => {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(addBidResponseStub.callCount).to.equal(0);
      expect(doneStub.calledOnce).to.equal(true);
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal([]);
      expect(doneStub.calledOnce).to.equal(true);
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

describe('validate bid response: ', () => {
  let spec;
  let bidder;
  let addBidResponseStub;
  let doneStub;
  let ajaxStub;
  let logErrorSpy;

  let bids = [{
    'ad': 'creative',
    'cpm': '1.99',
    'width': 300,
    'height': 250,
    'requestId': '1',
    'creativeId': 'some-id',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 360
  }];

  beforeEach(() => {
    spec = {
      code: CODE,
      isBidRequestValid: sinon.stub(),
      buildRequests: sinon.stub(),
      interpretResponse: sinon.stub(),
    };

    spec.isBidRequestValid.returns(true);
    spec.buildRequests.returns({
      method: 'POST',
      url: 'test.url.com',
      data: {}
    });

    addBidResponseStub = sinon.stub();
    doneStub = sinon.stub();
    ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
      const fakeResponse = sinon.stub();
      fakeResponse.returns('headerContent');
      callbacks.success('response body', { getResponseHeader: fakeResponse });
    });
    logErrorSpy = sinon.spy(utils, 'logError');
  });

  afterEach(() => {
    ajaxStub.restore();
    logErrorSpy.restore();
  });

  it('should add native bids that do have required assets', () => {
    let bidRequest = {
      bids: [{
        bidId: 1,
        auctionId: 'first-bid-id',
        adUnitCode: 'mock/placement',
        params: {
          param: 5
        },
        nativeParams: {
          title: {'required': true},
        },
        mediaType: 'native',
      }]
    };

    let bids1 = Object.assign({},
      bids[0],
      {
        'mediaType': 'native',
        'native': {
          'title': 'Native Creative',
          'clickUrl': 'https://www.link.example',
        }
      }
    );

    const bidder = newBidder(spec);

    spec.interpretResponse.returns(bids1);
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });

  it('should not add native bids that do not have required assets', () => {
    let bidRequest = {
      bids: [{
        bidId: 1,
        auctionId: 'first-bid-id',
        adUnitCode: 'mock/placement',
        params: {
          param: 5
        },
        nativeParams: {
          title: {'required': true},
        },
        mediaType: 'native',
      }]
    };

    let bids1 = Object.assign({},
      bids[0],
      {
        bidderCode: CODE,
        mediaType: 'native',
        native: {
          title: undefined,
          clickUrl: 'https://www.link.example',
        }
      }
    );

    const bidder = newBidder(spec);
    spec.interpretResponse.returns(bids1);
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub);

    expect(addBidResponseStub.calledOnce).to.equal(false);
    expect(logErrorSpy.callCount).to.equal(1);
  });

  it('should add bid when renderer is present on outstream bids', () => {
    let bidRequest = {
      bids: [{
        bidId: 1,
        auctionId: 'first-bid-id',
        adUnitCode: 'mock/placement',
        params: {
          param: 5
        },
        mediaTypes: {
          video: {context: 'outstream'}
        }
      }]
    };

    let bids1 = Object.assign({},
      bids[0],
      {
        bidderCode: CODE,
        mediaType: 'video',
        renderer: {render: () => true, url: 'render.js'},
      }
    );

    const bidder = newBidder(spec);

    spec.interpretResponse.returns(bids1);
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });

  it('should add banner bids that have no width or height but single adunit size', () => {
    let bidRequest = {
      bids: [{
        bidder: CODE,
        bidId: 1,
        auctionId: 'first-bid-id',
        adUnitCode: 'mock/placement',
        params: {
          param: 5
        },
        sizes: [[300, 250]],
      }]
    };

    let bids1 = Object.assign({},
      bids[0],
      {
        width: undefined,
        height: undefined
      }
    );

    const bidder = newBidder(spec);

    spec.interpretResponse.returns(bids1);
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });
});
