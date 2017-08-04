'use strict';
var chai_1 = require('chai');
var ta = require('modules/thoughtleadrBidAdapter');
var bidfactory = require('src/bidfactory');
var ajax = require('src/ajax');
var Adapter = ta;

describe('thoughtleadr adapter tests', function () {
  var sandbox;
  var adapter;
  var request;
  var createBid;
  var ajaxMock;

  before(function () {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function () {
    createBid = sandbox.spy(bidfactory, 'createBid');
    adapter = new Adapter();
    request = {
      bidderCode: 'thoughtleadr',
      bids: [{
        bidder: 'thoughtleadr',
        placementCode: 'abc-123',
        sizes: [[300, 250], [400, 400]],
        params: {
          placementId: 'test-placement',
        },
      }],
    };
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('handleBids', function () {
    it('should filter invalid bids', function () {
      request.bids.unshift({
        bidder: 'thoughtleadr',
        placementCode: 'abc-123',
        sizes: [[300, 250], [400, 400]],
        params: {},
      });
      request.bids.push({
        bidder: 'thoughtleadr',
        placementCode: 'abc-123',
        sizes: [[300, 250], [400, 400]],
        params: {
          incorrectParam: 123,
        },
      });
      var requestPlacement = sinon.spy(adapter, 'requestPlacement');
      adapter.callBids(request);
      chai_1.expect(requestPlacement.callCount).to.be.equal(1);
      chai_1.expect(requestPlacement.getCall(0).args[0]).to.be.equal(request.bids[1]);
    });
  });

  describe('requestPlacement', function () {
    it('should request header-bid.json', function () {
      ajaxMock = sandbox.stub(ajax, 'ajax', function (url, cb) {
        cb(JSON.stringify({
          header_bid_token: 'asd',
          media_type: 'article',
          amount: 2
        }));
      });
      adapter.callBids(request);
      chai_1.expect(ajaxMock.callCount).to.be.equal(1);
      chai_1.expect(ajaxMock.firstCall.args[0]).to.contains(
        '//a.thoughtleadr.com/v4/test-placement/header-bid.json?uid=');
      chai_1.expect(createBid.firstCall.args[0]).to.be.equal(1);
    });

    it('should request header-bid.json without bids', function () {
      ajaxMock = sandbox.stub(ajax, 'ajax', function (url, cb) {
        cb(JSON.stringify({}));
      });

      adapter.callBids(request);
      chai_1.expect(ajaxMock.callCount).to.be.equal(1);
      chai_1.expect(ajaxMock.firstCall.args[0]).to.contains(
        '//a.thoughtleadr.com/v4/test-placement/header-bid.json?uid=');
      chai_1.expect(createBid.firstCall.args[0]).to.be.equal(2);
    });

    it('should sync cookies', function () {
      ajaxMock = sandbox.stub(ajax, 'ajax', function (url, cb) {
        cb(JSON.stringify({
          header_bid_token: 'asd',
          media_type: 'article',
          amount: 2,
          cookie_syncs: ['<script src="/path/to/script"></script>']
        }));
      });
      adapter.callBids(request);

      var element = document.getElementById('tldr-cookie-sync-div');
      var iframes = element.getElementsByTagName('iframe');
      chai_1.expect(iframes.length).to.be.equal(1);

      chai_1.expect(iframes[0].contentDocument.body.innerHTML).to.be.equal('<script src="/path/to/script"></script>');
    });
  });
});
