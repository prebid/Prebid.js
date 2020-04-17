import { newBidder, registerBidder, preloadBidderMappingFile, storage } from 'src/adapters/bidderFactory.js';
import adapterManager from 'src/adapterManager.js';
import * as ajax from 'src/ajax.js';
import { expect } from 'chai';
import { userSync } from 'src/userSync.js'
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';

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

function onTimelyResponseStub() {

}

let wrappedCallback = config.callbackWithBidder(CODE);

describe('bidders created by newBidder', function () {
  let spec;
  let bidder;
  let addBidResponseStub;
  let doneStub;

  beforeEach(function () {
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

  describe('when the ajax response is irrelevant', function () {
    let ajaxStub;
    let getConfigSpy;

    beforeEach(function () {
      ajaxStub = sinon.stub(ajax, 'ajax');
      addBidResponseStub.reset();
      getConfigSpy = sinon.spy(config, 'getConfig');
      doneStub.reset();
    });

    afterEach(function () {
      ajaxStub.restore();
      getConfigSpy.restore();
    });

    it('should let registerSyncs run with invalid alias and aliasSync enabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: true
        }
      });
      spec.code = 'fakeBidder';
      const bidder = newBidder(spec);
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(true);
    });

    it('should let registerSyncs run with valid alias and aliasSync enabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: true
        }
      });
      spec.code = 'aliasBidder';
      const bidder = newBidder(spec);
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(true);
    });

    it('should let registerSyncs run with invalid alias and aliasSync disabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: false
        }
      });
      spec.code = 'fakeBidder';
      const bidder = newBidder(spec);
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(true);
    });

    it('should not let registerSyncs run with valid alias and aliasSync disabled', function () {
      config.setConfig({
        userSync: {
          aliasSyncEnabled: false
        }
      });
      spec.code = 'aliasBidder';
      const bidder = newBidder(spec);
      bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      expect(getConfigSpy.withArgs('userSync.filterSettings').calledOnce).to.equal(false);
    });

    it('should handle bad bid requests gracefully', function () {
      const bidder = newBidder(spec);

      spec.getUserSyncs.returns([]);

      bidder.callBids({});
      bidder.callBids({ bids: 'nothing useful' }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.called).to.equal(false);
      expect(spec.buildRequests.called).to.equal(false);
      expect(spec.interpretResponse.called).to.equal(false);
    });

    it('should call buildRequests(bidRequest) the params are valid', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal(MOCK_BIDS_REQUEST.bids);
    });

    it('should not call buildRequests the params are invalid', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.called).to.equal(false);
    });

    it('should filter out invalid bids before calling buildRequests', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.onFirstCall().returns(true);
      spec.isBidRequestValid.onSecondCall().returns(false);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
      expect(spec.isBidRequestValid.calledTwice).to.equal(true);
      expect(spec.buildRequests.calledOnce).to.equal(true);
      expect(spec.buildRequests.firstCall.args[0]).to.deep.equal([MOCK_BIDS_REQUEST.bids[0]]);
    });

    it('should make no server requests if the spec doesn\'t return any', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.called).to.equal(false);
    });

    it('should make the appropriate POST request', function () {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: url,
        data: data
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(url);
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'text/plain',
        withCredentials: true
      });
    });

    it('should make the appropriate POST request when options are passed', function () {
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(url);
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'application/json',
        withCredentials: true
      });
    });

    it('should make the appropriate GET request', function () {
      const bidder = newBidder(spec);
      const url = 'test.url.com';
      const data = { arg: 2 };
      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'GET',
        url: url,
        data: data
      });

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2`);
      expect(ajaxStub.firstCall.args[2]).to.be.undefined;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'GET',
        withCredentials: true
      });
    });

    it('should make the appropriate GET request when options are passed', function () {
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2`);
      expect(ajaxStub.firstCall.args[2]).to.be.undefined;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'GET',
        withCredentials: false
      });
    });

    it('should make multiple calls if the spec returns them', function () {
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(ajaxStub.calledTwice).to.equal(true);
    });

    it('should not add bids for each placement code if no requests are given', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns([]);
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.callCount).to.equal(0);
    });
  });

  describe('when the ajax call succeeds', function () {
    let ajaxStub;
    let userSyncStub;
    let logErrorSpy;

    beforeEach(function () {
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

    afterEach(function () {
      ajaxStub.restore();
      userSyncStub.restore();
      utils.logError.restore();
    });

    it('should call spec.interpretResponse() with the response content', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

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

    it('should call spec.interpretResponse() once for each request made', function () {
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.interpretResponse.calledTwice).to.equal(true);
      expect(doneStub.calledOnce).to.equal(true);
    });

    it('should only add bids for valid adUnit code into the auction, even if the bidder doesn\'t bid on all of them', function () {
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      let bidObject = addBidResponseStub.firstCall.args[1];
      // checking the fields added by our code
      expect(bidObject.originalCpm).to.equal(bid.cpm);
      expect(bidObject.originalCurrency).to.equal(bid.currency);
      expect(doneStub.calledOnce).to.equal(true);
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should call spec.getUserSyncs() with the response', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1].length).to.equal(1);
      expect(spec.getUserSyncs.firstCall.args[1][0].body).to.equal('response body');
      expect(spec.getUserSyncs.firstCall.args[1][0].headers).to.have.property('get');
      expect(spec.getUserSyncs.firstCall.args[1][0].headers.get).to.be.a('function');
    });

    it('should register usersync pixels', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(false);
      spec.buildRequests.returns([]);
      spec.getUserSyncs.returns([{
        type: 'iframe',
        url: 'usersync.com'
      }]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(userSyncStub.called).to.equal(true);
      expect(userSyncStub.firstCall.args[0]).to.equal('iframe');
      expect(userSyncStub.firstCall.args[1]).to.equal(spec.code);
      expect(userSyncStub.firstCall.args[2]).to.equal('usersync.com');
    });

    it('should logError when required bid response params are missing', function () {
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(logErrorSpy.calledOnce).to.equal(true);
    });

    it('should logError when required bid response params are undefined', function () {
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

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(logErrorSpy.calledOnce).to.equal(true);
    });
  });

  describe('when the ajax call fails', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
        callbacks.error('ajax call failed.');
      });
      addBidResponseStub.reset();
      doneStub.reset();
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should not spec.interpretResponse()', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.interpretResponse.called).to.equal(false);
      expect(doneStub.calledOnce).to.equal(true);
    });

    it('should not add bids for each adunit code into the auction', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.interpretResponse.returns([]);
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.callCount).to.equal(0);
      expect(doneStub.calledOnce).to.equal(true);
    });

    it('should call spec.getUserSyncs() with no responses', function () {
      const bidder = newBidder(spec);

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });
      spec.getUserSyncs.returns([]);

      bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(spec.getUserSyncs.calledOnce).to.equal(true);
      expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal([]);
      expect(doneStub.calledOnce).to.equal(true);
    });
  });
});

describe('registerBidder', function () {
  let registerBidAdapterStub;
  let aliasBidAdapterStub;

  beforeEach(function () {
    registerBidAdapterStub = sinon.stub(adapterManager, 'registerBidAdapter');
    aliasBidAdapterStub = sinon.stub(adapterManager, 'aliasBidAdapter');
  });

  afterEach(function () {
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

  it('should register a bidder with the adapterManager', function () {
    registerBidder(newEmptySpec());
    expect(registerBidAdapterStub.calledOnce).to.equal(true);
    expect(registerBidAdapterStub.firstCall.args[0]).to.have.property('callBids');
    expect(registerBidAdapterStub.firstCall.args[0].callBids).to.be.a('function');

    expect(registerBidAdapterStub.firstCall.args[1]).to.equal(CODE);
    expect(registerBidAdapterStub.firstCall.args[2]).to.be.undefined;
  });

  it('should register a bidder with the appropriate mediaTypes', function () {
    const thisSpec = Object.assign(newEmptySpec(), { supportedMediaTypes: ['video'] });
    registerBidder(thisSpec);
    expect(registerBidAdapterStub.calledOnce).to.equal(true);
    expect(registerBidAdapterStub.firstCall.args[2]).to.deep.equal({supportedMediaTypes: ['video']});
  });

  it('should register bidders with the appropriate aliases', function () {
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

describe('validate bid response: ', function () {
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

  beforeEach(function () {
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

  afterEach(function () {
    ajaxStub.restore();
    logErrorSpy.restore();
  });

  it('should add native bids that do have required assets', function () {
    let bidRequest = {
      bids: [{
        bidId: '1',
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
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });

  it('should not add native bids that do not have required assets', function () {
    let bidRequest = {
      bids: [{
        bidId: '1',
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
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

    expect(addBidResponseStub.calledOnce).to.equal(false);
    expect(logErrorSpy.callCount).to.equal(1);
  });

  it('should add bid when renderer is present on outstream bids', function () {
    let bidRequest = {
      bids: [{
        bidId: '1',
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
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });

  it('should add banner bids that have no width or height but single adunit size', function () {
    let bidRequest = {
      bids: [{
        bidder: CODE,
        bidId: '1',
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
    bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

    expect(addBidResponseStub.calledOnce).to.equal(true);
    expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
    expect(logErrorSpy.callCount).to.equal(0);
  });
});

describe('preload mapping url hook', function() {
  let fakeTranslationServer;
  let getLocalStorageStub;
  let adapterManagerStub;

  beforeEach(function () {
    fakeTranslationServer = server;
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    adapterManagerStub = sinon.stub(adapterManager, 'getBidAdapter');
  });

  afterEach(function() {
    getLocalStorageStub.restore();
    adapterManagerStub.restore();
    config.resetConfig();
  });

  it('should preload mapping url file', function() {
    config.setConfig({
      'adpod': {
        'brandCategoryExclusion': true
      }
    });
    let adUnits = [{
      code: 'midroll_1',
      mediaTypes: {
        video: {
          context: 'adpod'
        }
      },
      bids: [
        {
          bidder: 'sampleBidder1',
          params: {
            placementId: 14542875,
          }
        }
      ]
    }];
    getLocalStorageStub.returns(null);
    adapterManagerStub.withArgs('sampleBidder1').returns({
      getSpec: function() {
        return {
          'getMappingFileInfo': function() {
            return {
              url: 'http://sample.com',
              refreshInDays: 7,
              key: `sampleBidder1MappingFile`
            }
          }
        }
      }
    });
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(1);
  });

  it('should preload mapping url file for all bidders', function() {
    config.setConfig({
      'adpod': {
        'brandCategoryExclusion': true
      }
    });
    let adUnits = [{
      code: 'midroll_1',
      mediaTypes: {
        video: {
          context: 'adpod'
        }
      },
      bids: [
        {
          bidder: 'sampleBidder1',
          params: {
            placementId: 14542875,
          }
        },
        {
          bidder: 'sampleBidder2',
          params: {
            placementId: 123456,
          }
        }
      ]
    }];
    getLocalStorageStub.returns(null);
    adapterManagerStub.withArgs('sampleBidder1').returns({
      getSpec: function() {
        return {
          'getMappingFileInfo': function() {
            return {
              url: 'http://sample.com',
              refreshInDays: 7,
              key: `sampleBidder1MappingFile`
            }
          }
        }
      }
    });
    adapterManagerStub.withArgs('sampleBidder2').returns({
      getSpec: function() {
        return {
          'getMappingFileInfo': function() {
            return {
              url: 'http://sample.com',
              refreshInDays: 7,
              key: `sampleBidder2MappingFile`
            }
          }
        }
      }
    });
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(2);

    config.setConfig({
      'adpod': {
        'brandCategoryExclusion': false
      }
    });
    preloadBidderMappingFile(sinon.spy(), adUnits);
    expect(fakeTranslationServer.requests.length).to.equal(2);
  });
});
