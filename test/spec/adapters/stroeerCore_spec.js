const assert = require('chai').assert;
const adapter = require('src/adapters/stroeerCore');
const bidmanager = require("src/bidmanager");
// const Ajax = require('src/ajax');
// const sinon = require('sinon');

function rndColorFn() {
  return "#8ea7ce"
}

function assertDummyBid(bidObject, bidId, width, height, ref, ssl, inView) {
  const expectedCreative = (width, height) =>
  `<body style="margin:0;padding:0"><div style="width:${width-4}px;height:${height-4}px;margin:0;padding:0;border:2px solid #f4fc0a;background-color:#cbc8ed">\n`
    + `Hello, I'm an advert. in viewport: ${inView}, main page accessible: true, page referer: ${ref}, secure window: ${ssl}` +
   `\n</div>\n</body>`;

  assert.propertyVal(bidObject, 'adId', bidId);
  assert.propertyVal(bidObject, 'ad', expectedCreative(width, height));
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
  timeout: 1298,
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
        sid: 'NDA='
      }
    }
  ]
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
  //let stubAjax;

  beforeEach(() => {
    //stubAjax = sinon.stub(Ajax, 'ajax');
  });

  it('should have `callBids` function', () => {
    assert.isFunction(adapter().callBids);
  });

  describe("interaction with bid manager", () => {
    let sandbox;
    let bidderRequest;

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

    const expectedPageReferer = "http://www.google.com/?query=monkey";
    const expectedSecureWindow = false;


    beforeEach(function() {
      bidderRequest = buildBidderRequest();
      sandbox = sinon.sandbox.create();
      sandbox.stub(bidmanager, 'addBidResponse');
    });

    afterEach(function() {
      sandbox.restore();
    });


    it('should add bids', function () {
      adapter(win, rndColorFn).callBids(bidderRequest);

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      assert.isString(bidmanager.addBidResponse.firstCall.args[0], "div-1");
      assert.isString(bidmanager.addBidResponse.secondCall.args[0], "div-2");

      const firstBid = bidmanager.addBidResponse.firstCall.args[1];
      const secondBid = bidmanager.addBidResponse.secondCall.args[1];

      assertDummyBid(firstBid, 'bid1', 300, 600, expectedPageReferer, expectedSecureWindow, true);
      assertDummyBid(secondBid, 'bid2', 728, 90, expectedPageReferer, expectedSecureWindow, true);
    });


    it('should exclude bids without slot id param', () => {
      delete bidderRequest.bids[1].params.sid;

      adapter(win, rndColorFn).callBids(bidderRequest);

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      assert.isString(bidmanager.addBidResponse.firstCall.args[0], "div-1");

      assert.isString(bidmanager.addBidResponse.secondCall.args[0], "div-2");

      assertDummyBid(bidmanager.addBidResponse.firstCall.args[1], 'bid1', 300, 600, expectedPageReferer, expectedSecureWindow, true);

      assertNoFillBid(bidmanager.addBidResponse.secondCall.args[1], 'bid2');
    });

  });
});