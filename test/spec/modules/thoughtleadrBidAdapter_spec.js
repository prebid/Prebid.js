'use strict';
var chai_1 = require('chai');
var ta = require('../../../modules/thoughtleadrBidAdapter');
var adloader = require('../../../src/adloader');
var bidfactory = require('../../../src/bidfactory');
var Adapter = ta;

function setupResponse(resp) {
  var stub = sinon.stub();
  window.tldr = {
    requestPrebid: stub.returns({
      then: function (cb) {
        return cb(resp);
      }
    })
  };
  return stub;
}

describe('thoughtleadr adapter tests', function () {
  var sandbox;
  var adapter;
  var request;
  var loadScript;
  var createBid;
  var tldrRequestPrebid;

  before(function () {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function () {
    loadScript = sandbox.stub(adloader, 'loadScript');
    createBid = sandbox.spy(bidfactory, 'createBid');
    adapter = new Adapter();
    loadScript.reset();
    request = {
      bidderCode: 'thoughtleadr',
      bids: [{
        bidder: 'thoughtleadr',
        placementCode: 'abc-123',
        sizes: [[300, 250], [400, 400]],
        params: {
          placementId: 'test-placement'
        }
      }]
    };
  });

  afterEach(function () {
    adapter.stopListen();
    delete window.tldr;
    sandbox.restore();
  });

  describe('callBids', function () {
    beforeEach(function () {
      tldrRequestPrebid = setupResponse({});
    });

    it("should request page.js from cdn if there wasn't before", function () {
      delete window.tldr;
      adapter.callBids(request);
      chai_1.expect(loadScript.getCall(0).args[0]).to.be.equal('//cdn.thoughtleadr.com/v4/page.js');
    });

    it('should use window.tldr.config.root_url', function () {
      window.tldr = {
        config: {
          root_url: 'http://example.loc/'
        }
      };
      adapter.callBids(request);
      chai_1.expect(loadScript.getCall(0).args[0]).to.be.equal('http://example.loc/page.js');
    });

    it('should not request page.js if api is present', function () {
      adapter.callBids(request);
      chai_1.expect(loadScript.notCalled).to.be.ok;
    });
  });

  describe('handleBids', function () {
    beforeEach(function () {
      tldrRequestPrebid = setupResponse({});
    });

    it('should filter invalid bids', function () {
      request.bids.unshift({
        bidder: 'thoughtleadr',
        placementCode: 'abc-123',
        sizes: [[300, 250], [400, 400]],
        params: {}
      });
      request.bids.push({
        bidder: 'thoughtleadr',
        placementCode: 'abc-123',
        sizes: [[300, 250], [400, 400]],
        params: {
          incorrectParam: 123
        }
      });
      var requestPlacement = sinon.spy(adapter, 'requestPlacement');
      adapter.callBids(request);
      chai_1.expect(requestPlacement.callCount).to.be.equal(1);
      chai_1.expect(requestPlacement.getCall(0).args[0]).to.be.equal(request.bids[1]);
    });
  });

  describe('requestPlacement', function () {
    beforeEach(function () {
      tldrRequestPrebid = setupResponse({
        config: {
          abc: 567
        },
        bid: {
          code: 1,
          cpm: 12,
          ad: 'asd'
        }
      });
    });

    it('should made request through page.js api', function () {
      adapter.callBids(request);
      chai_1.expect(tldrRequestPrebid.callCount).to.be.equal(1);
      chai_1.expect(tldrRequestPrebid.firstCall.args[0]).to.be.equal(request.bids[0].params.placementId);
      chai_1.expect(tldrRequestPrebid.firstCall.args[1]).to.be.length(36);
    });

    it('should call bidfactory.createBid with code 1 if ad is ok', function () {
      var bid = request.bids[0];
      adapter.requestPlacement(bid);
      chai_1.expect(createBid.callCount).to.be.equal(1);
      chai_1.expect(createBid.firstCall.args[0]).to.be.equal(1);
    });

    it("should call bidfactory.createBid with different code if ad isn't ok", function () {
      var bid = request.bids[0];
      tldrRequestPrebid = setupResponse({
        config: {},
        bid: {
          code: 2
        }
      });
      adapter.requestPlacement(bid);
      chai_1.expect(createBid.callCount).to.be.equal(1);
      chai_1.expect(createBid.firstCall.args[0]).to.be.equal(2);
    });

    it.skip('should response on the postMessage request', function (done) {
      var bid = request.bids[0];
      adapter.requestPlacement(bid);
      var rid = tldrRequestPrebid.firstCall.args[1];
      chai_1.expect(rid).to.be.ok;

      window.addEventListener('message', function (ev) {
        if (ev.data && ev.data.TLDR_RESPONSE) {
          chai_1.expect(ev.data.TLDR_RESPONSE.rid).to.be.equal(rid);
          chai_1.expect(JSON.stringify(ev.data.TLDR_RESPONSE.config)).to.be.equal('{"abc":567}');
          done();
        } else if (ev.data && ev.data.TLDR_REQUEST) {
          chai_1.expect(ev.data.TLDR_REQUEST.rid).to.be.equal(rid);
        } else {
          throw new Error('should not be any other messages');
        }
      }, false);
      window.postMessage({TLDR_REQUEST: {rid: rid}}, '*');
    });
  });
});
