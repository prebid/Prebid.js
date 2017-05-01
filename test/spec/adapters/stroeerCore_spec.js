const assert = require('chai').assert;
const adapter = require('src/adapters/stroeerCore');
const bidmanager = require("src/bidmanager");


function assertBid(bidObject, bidId, ad, width, height) {
  assert.propertyVal(bidObject, 'adId', bidId);
  assert.propertyVal(bidObject, 'ad', ad);
  assert.propertyVal(bidObject, 'width', width);
  assert.propertyVal(bidObject, 'height', height);
  assert.propertyVal(bidObject, 'cpm', 4.0);
  assert.propertyVal(bidObject, 'bidderCode', "stroeerCore");
}

function assertNoFillBid(bidObject, bidId) {
  assert.propertyVal(bidObject, 'adId', bidId);
  assert.propertyVal(bidObject, 'bidderCode', "stroeerCore");
  assert.notProperty(bidObject, 'ad');
  assert.notProperty(bidObject, 'cpm');
}

const buildBidderRequest = () => ({
  bidderCode: 'stroeerCore',
  timeout: 5000,
  auctionStart: 10000,
  bids: [
    {
      bidId: 'bid1',
      bidder: 'stroeerCore',
      placementCode: 'div-1',
      sizes: [[300, 600], [160, 60]],
      mediaType: "",
      params: {
        sid: 'NDA='
      }
    },
    {
      bidId: 'bid2',
      bidder: 'stroeerCore',
      placementCode: 'div-2',
      sizes: [[728, 90]],
      params: {
        sid: 'ODA='
      }
    }
  ]
});

const buildBidderResponse = () => ({
  "bids": [{
    "bidId": "bid1",
    "cpm": 4.0,
    "width": 300,
    "height": 600,
    "ad": "<div>tag1</div>"
  }, {
    "bidId": "bid2",
    "cpm": 4.0,
    "width": 728,
    "height": 90,
    "ad": "<div>tag2</div>"
  }]
});


const createWindow = (href, params = {}) => {
  let {parent, referrer, top, frameElement, placementElements=[]} = params;
  const protocol = href.startsWith('https') ? "https:" : "http:";
  const win = {
    frameElement,
    parent,
    top,
    location: {
      protocol,
      href
    },
    document: {
      referrer,
      getElementById: id => placementElements.find(el => el.id === id)
    }
  };

  if (!parent) {
    win.parent = win;
  }
  return win;
};

describe('stroeerssp adapter', function () {
  let sandbox;
  let fakeServer;
  let bidderRequest;
  let clock;

  beforeEach(function() {
    bidderRequest = buildBidderRequest();
    sandbox = sinon.sandbox.create();
    sandbox.stub(bidmanager, 'addBidResponse');
    fakeServer = sandbox.useFakeServer();
    clock = sandbox.useFakeTimers();
  });

  afterEach(function() {
    sandbox.restore();
  });


  const topWin = createWindow("http://www.abc.org/", {referrer:"http://www.google.com/?query=monkey"});
  topWin.innerHeight = 800;

  const midWin = createWindow("http://www.abc.org/", {parent: topWin, top: topWin, frameElement: createElement()});
  midWin.innerHeight = 400;


  const win = createWindow("http://www.xyz.com/", {parent: midWin, top: topWin, frameElement: createElement(304),
    placementElements: [createElement(17, "div-1"), createElement(54, "div-2")]});
  win.innerHeight = 200;

  function createElement(offsetTop = 0, id) {
    return {
      id,
      getBoundingClientRect: function() {
        return {
          top: offsetTop,
          height: 1
        }
      }
    }
  }


  it('should have `callBids` function', () => {
    assert.isFunction(adapter().callBids);
  });


  describe('bid request', () => {
    it('send bids as a POST request to default endpoint', function () {
      fakeServer.respondWith("");
      adapter(win).callBids(bidderRequest);
      fakeServer.respond();

      assert.equal(fakeServer.requests.length, 1);
      const request = fakeServer.requests[0];

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'http://localhost:3333/dsh');
    });


    it('send bids as a POST request to custom endpoint', function () {
      const firstBidParams = bidderRequest.bids[0].params;
      firstBidParams.host = "other.com";
      firstBidParams.port = 234;
      firstBidParams.path = "/xyz";

      fakeServer.respondWith("");
      adapter(win).callBids(bidderRequest);
      fakeServer.respond();


      assert.equal(fakeServer.requests.length, 1);
      const request = fakeServer.requests[0];

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'http://other.com:234/xyz');
    });


    it('sends bids in the expected JSON structure', function () {
      clock.tick(13500);

      fakeServer.respondWith(JSON.stringify(buildBidderResponse()));
      adapter(win).callBids(bidderRequest);
      fakeServer.respond();

      assert.equal(fakeServer.requests.length, 1);

      const request = fakeServer.requests[0];

      const bidRequest = JSON.parse(request.requestBody);

      const expectedTimeout = bidderRequest.timeout - (13500 - bidderRequest.auctionStart);

      assert.equal(expectedTimeout, 1500);

      const expectedJson = {
        "timeout": expectedTimeout,
        "ref": "http://www.google.com/?query=monkey",
        "mpa": true,
        "ssl": false,
        "bids": [
          {
            "bid": "bid1",
            "siz": [[300,600],[160,60]],
            "viz": true
          },
          {
            "bid": "bid2",
            "siz": [[728,90]],
            "viz": true
          }
        ]
      };

      console.log("actual: " + JSON.stringify(bidRequest));
      console.log("expected: " + JSON.stringify(expectedJson));

      assert.deepEqual(bidRequest, expectedJson);
    });
  });


  describe("bid response", () => {
    it('should add bids', function () {

      fakeServer.respondWith(JSON.stringify(buildBidderResponse()));

      adapter(win).callBids(bidderRequest);

      fakeServer.respond();

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      assert.isString(bidmanager.addBidResponse.firstCall.args[0], "div-1");
      assert.isString(bidmanager.addBidResponse.secondCall.args[0], "div-2");

      const firstBid = bidmanager.addBidResponse.firstCall.args[1];
      const secondBid = bidmanager.addBidResponse.secondCall.args[1];

      assertBid(firstBid, 'bid1', '<div>tag1</div>', 300, 600);
      assertBid(secondBid, 'bid2', '<div>tag2</div>', 728, 90);
    });


    it('should add unfulfilled bids', function() {

      const result = buildBidderResponse();

      result.bids[0].bidId = 'bidX';

      fakeServer.respondWith(JSON.stringify(result));

      adapter(win).callBids(bidderRequest);

      fakeServer.respond();

      assertNoFillBid(bidmanager.addBidResponse.secondCall.args[1], 'bid1');

      assertBid(bidmanager.addBidResponse.firstCall.args[1], 'bid2', '<div>tag2</div>', 728, 90);

    });


    it('should exclude bids without slot id param', () => {
      fakeServer.respondWith(JSON.stringify(buildBidderResponse()));

      delete bidderRequest.bids[1].params.sid;

      adapter(win).callBids(bidderRequest);

      fakeServer.respond();

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      assert.isString(bidmanager.addBidResponse.firstCall.args[0], "div-1");

      assert.isString(bidmanager.addBidResponse.secondCall.args[0], "div-2");

      assertBid(bidmanager.addBidResponse.secondCall.args[1], 'bid1', '<div>tag1</div>', 300, 600);

      assertNoFillBid(bidmanager.addBidResponse.firstCall.args[1], 'bid2');
    });

  });
});