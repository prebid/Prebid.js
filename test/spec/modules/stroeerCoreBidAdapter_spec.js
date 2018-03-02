const assert = require('chai').assert;
const adapter = require('modules/stroeerCoreBidAdapter');
const bidmanager = require('src/bidmanager');
const utils = require('src/utils');
const config = require('src/config').config;

function assertBid(bidObject, bidId, ad, width, height) {
  assert.propertyVal(bidObject, 'adId', bidId);
  assert.propertyVal(bidObject, 'ad', ad);
  assert.propertyVal(bidObject, 'width', width);
  assert.propertyVal(bidObject, 'height', height);
  assert.propertyVal(bidObject, 'cpm', 4.0);
  assert.propertyVal(bidObject, 'bidderCode', 'stroeerCore');
}

function assertNoFillBid(bidObject, bidId) {
  assert.propertyVal(bidObject, 'adId', bidId);
  assert.propertyVal(bidObject, 'bidderCode', 'stroeerCore');
  assert.notProperty(bidObject, 'ad');
  assert.notProperty(bidObject, 'cpm');
}

const buildBidderRequest = () => ({
  bidderRequestId: 'bidder-request-id-123',
  bidderCode: 'stroeerCore',
  timeout: 5000,
  auctionStart: 10000,
  bids: [
    {
      bidId: 'bid1',
      bidder: 'stroeerCore',
      placementCode: 'div-1',
      sizes: [[300, 600], [160, 60]],
      mediaType: '',
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
  ],
});

const buildBidderResponse = () => ({
  'bids': [{
    'bidId': 'bid1',
    'cpm': 4.0,
    'width': 300,
    'height': 600,
    'ad': '<div>tag1</div>',
  }, {
    'bidId': 'bid2',
    'cpm': 4.0,
    'width': 728,
    'height': 90,
    'ad': '<div>tag2</div>',
  }]
});

const buildBidderResponseSecondPriceAuction = () => ({
  'bids': [{
    'bidId': 'bid1',
    'cpm': 4.0,
    'width': 300,
    'height': 600,
    'ad': '<div>tag1</div>',
    'cpm2': 3.8,
    'floor': 2.0,
    'exchangerate': 1.0,
    'nurl': 'www.something.com'
  }, {
    'bidId': 'bid2',
    'cpm': 4.0,
    'width': 728,
    'height': 90,
    'ad': '<div>tag2</div>',
    'floor': 1.0,
    'exchangerate': 0.8,
    'nurl': 'www.something-else.com'
  }]
});

const createWindow = (href, params = {}) => {
  let {parent, referrer, top, frameElement, placementElements = []} = params;
  const protocol = href.startsWith('https') ? 'https:' : 'http:';
  const win = {
    frameElement,
    parent,
    top,
    location: {
      protocol,
      href
    },
    document: {
      createElement: function() { return { setAttribute: function() {} } },

      referrer,
      getElementById: id => placementElements.find(el => el.id === id)
    }
  };

  if (!parent) {
    win.parent = win;
  }

  if (!top) {
    win.top = win;
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

  const topWin = createWindow('http://www.abc.org/', {referrer: 'http://www.google.com/?query=monkey'});
  topWin.innerHeight = 800;

  const midWin = createWindow('http://www.abc.org/', {parent: topWin, top: topWin, frameElement: createElement()});
  midWin.innerHeight = 400;

  const win = createWindow('http://www.xyz.com/', {
    parent: midWin, top: topWin, frameElement: createElement(304), placementElements: [createElement(17, 'div-1'), createElement(54, 'div-2')]
  });

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
      fakeServer.respondWith('');
      adapter(win).callBids(bidderRequest);
      fakeServer.respond();

      assert.equal(fakeServer.requests.length, 1);
      const request = fakeServer.requests[0];

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'http://dsh.adscale.de/dsh');
    });

    describe('send bids as a POST request to custom endpoint', function () {
      const tests = [
        {protocol: 'http:', params: {sid: 'ODA=', host: 'other.com', port: '234', path: '/xyz'}, expected: 'http://other.com:234/xyz'},
        {protocol: 'https:', params: {sid: 'ODA=', host: 'other.com', port: '234', path: '/xyz'}, expected: 'https://other.com:234/xyz'},
        {protocol: 'https:', params: {sid: 'ODA=', host: 'other.com', port: '234', securePort: '871', path: '/xyz'}, expected: 'https://other.com:871/xyz'},
        {protocol: 'http:', params: {sid: 'ODA=', port: '234', path: '/xyz'}, expected: 'http://dsh.adscale.de:234/xyz'},
      ];

      tests.forEach(test => {
        it(`using params ${JSON.stringify(test.params)} when protocol is ${test.protocol}`, function () {
          win.location.protocol = test.protocol;
          bidderRequest.bids[0].params = test.params;

          fakeServer.respondWith('');
          adapter(win).callBids(bidderRequest);
          fakeServer.respond();

          assert.equal(fakeServer.requests.length, 1);
          const request = fakeServer.requests[0];

          assert.equal(request.method, 'POST');
          assert.equal(request.url, test.expected);
        });
      });
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
        'id': 'bidder-request-id-123',
        'timeout': expectedTimeout,
        'ref': 'http://www.google.com/?query=monkey',
        'mpa': true,
        'ssl': false,
        'ssat': 2,
        'bids': [
          {
            'sid': 'NDA=',
            'bid': 'bid1',
            'siz': [[300, 600], [160, 60]],
            'viz': true
          },
          {
            'sid': 'ODA=',
            'bid': 'bid2',
            'siz': [[728, 90]],
            'viz': true
          }
        ]
      };

      assert.deepEqual(bidRequest, expectedJson);
    });

    describe('yieldlove auction type on server', function() {
      afterEach(function() {
        config.setConfig({ 'ssat': 1 });
      });

      function runAndAssert(expectedSsat) {
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
          'id': 'bidder-request-id-123',
          'timeout': expectedTimeout,
          'ref': 'http://www.google.com/?query=monkey',
          'mpa': true,
          'ssl': false,
          'ssat': expectedSsat,
          'bids': [
            {
              'sid': 'NDA=',
              'bid': 'bid1',
              'siz': [[300, 600], [160, 60]],
              'viz': true
            },
            {
              'sid': 'ODA=',
              'bid': 'bid2',
              'siz': [[728, 90]],
              'viz': true
            }
          ]
        };

        assert.deepEqual(bidRequest, expectedJson);
      }

      it('enable first price auction', function() {
        config.setConfig({ 'ssat': 1 });
        runAndAssert(1);
      });

      it('explicitly enable second price auction on server', function() {
        config.setConfig({ 'ssat': 2 });
        runAndAssert(2);
      });

      const invalidTypeSamples = [-1, 0, 3, 4];
      invalidTypeSamples.forEach((type) => {
        it(`invalid yieldlove auction type ${type} set on server`, function() {
          config.setConfig({ 'ssat': type });

          clock.tick(13500);

          fakeServer.respondWith(JSON.stringify(buildBidderResponse()));
          adapter(win).callBids(bidderRequest);
          fakeServer.respond();

          assert.equal(fakeServer.requests.length, 0);

          const request = fakeServer.requests[0];

          const expectedTimeout = bidderRequest.timeout - (13500 - bidderRequest.auctionStart);

          assert.equal(expectedTimeout, 1500);

          assertNoFillBid(bidmanager.addBidResponse.firstCall.args[1], 'bid1');
          assertNoFillBid(bidmanager.addBidResponse.secondCall.args[1], 'bid2');
        })
      });
    });

    describe('optional fields', () => {
      it('skip viz field when unable to determine visibility of placement', () => {
        const win = createWindow('http://www.xyz.com/', {
          referrer: 'http://www.google.com/?query=monkey',
          placementElements: []
        });

        fakeServer.respondWith('');
        adapter(win).callBids(bidderRequest);
        fakeServer.respond();

        const bids = JSON.parse(fakeServer.requests[0].requestBody).bids;
        assert.lengthOf(bids, 2);
        for (let bid of bids) {
          assert.notProperty(bid, 'viz');
        }
      });

      it('skip ref field when unable to determine document referrer', () => {
        const win = createWindow('http://www.xyz.com/', {
          referrer: '',
          placementElements: [createElement(17, 'div-1'), createElement(54, 'div-2')]
        });

        fakeServer.respondWith('');
        adapter(win).callBids(bidderRequest);
        fakeServer.respond();

        const payload = JSON.parse(fakeServer.requests[0].requestBody);
        assert.notProperty(payload, 'ref');
      });
    });
  });

  describe('bid response', () => {
    it('should redirect when told', function() {
      fakeServer.respondWith('POST', /\/dsh.adscale.de\//, JSON.stringify({redirect: 'http://somewhere.com/there'}));
      fakeServer.respondWith('POST', /\/somewhere.com\//, JSON.stringify(buildBidderResponse()));

      sandbox.stub(utils, 'insertElement');

      adapter().callBids(bidderRequest);

      fakeServer.respond();

      sinon.assert.notCalled(utils.insertElement);
      sinon.assert.notCalled(bidmanager.addBidResponse);

      fakeServer.respond();

      sinon.assert.calledOnce(utils.insertElement);
      const element = utils.insertElement.lastCall.args[0];

      assertConnectJs(element, 'http://js.adscale.de/userconnect.js', 'NDA=');

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      assert.strictEqual(bidmanager.addBidResponse.firstCall.args[0], 'div-1');
      assert.strictEqual(bidmanager.addBidResponse.secondCall.args[0], 'div-2');

      const firstBid = bidmanager.addBidResponse.firstCall.args[1];
      const secondBid = bidmanager.addBidResponse.secondCall.args[1];

      assertBid(firstBid, 'bid1', '<div>tag1</div>', 300, 600);
      assertBid(secondBid, 'bid2', '<div>tag2</div>', 728, 90);
    });

    it('should never to more than one redirect', () => {
      fakeServer.respondWith('POST', /\/dsh.adscale.de\//, JSON.stringify({redirect: 'http://somewhere.com/over'}));
      fakeServer.respondWith('POST', /\/somewhere.com\//, JSON.stringify({redirect: 'http://somewhere.com/there'}));

      sandbox.stub(utils, 'insertElement');

      adapter().callBids(bidderRequest);

      fakeServer.respond();

      sinon.assert.notCalled(utils.insertElement);
      sinon.assert.notCalled(bidmanager.addBidResponse);

      fakeServer.respond();

      assert.strictEqual(fakeServer.requests.length, 2);

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      assertNoFillBid(bidmanager.addBidResponse.firstCall.args[1], 'bid1');
      assertNoFillBid(bidmanager.addBidResponse.secondCall.args[1], 'bid2');
    });

    it('should add bids', function () {
      fakeServer.respondWith(JSON.stringify(buildBidderResponse()));

      adapter(win).callBids(bidderRequest);

      fakeServer.respond();

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      assert.strictEqual(bidmanager.addBidResponse.firstCall.args[0], 'div-1');
      assert.strictEqual(bidmanager.addBidResponse.secondCall.args[0], 'div-2');

      const firstBid = bidmanager.addBidResponse.firstCall.args[1];
      const secondBid = bidmanager.addBidResponse.secondCall.args[1];

      assertBid(firstBid, 'bid1', '<div>tag1</div>', 300, 600);
      assertBid(secondBid, 'bid2', '<div>tag2</div>', 728, 90);
    });

    it('first price only auction', function() {

      config.setConfig({ 'ssat': 1 });

      fakeServer.respondWith(JSON.stringify(buildBidderResponse()));

      adapter(win).callBids(bidderRequest);

      fakeServer.respond();

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      let bid = bidmanager.addBidResponse.firstCall.args[1];
      assert.propertyVal(bid, 'cpm2', undefined);
      assert.propertyVal(bid, 'floor', undefined);
      assert.propertyVal(bid, 'exchangerate', undefined);
      assert.propertyVal(bid, 'nurl', undefined);

      config.setConfig({ 'ssat': 2 });

    });

    it('second price auction', function() {

      fakeServer.respondWith(JSON.stringify(buildBidderResponseSecondPriceAuction()));

      adapter(win).callBids(bidderRequest);

      fakeServer.respond();

      sinon.assert.calledTwice(bidmanager.addBidResponse);

      let bid1 = bidmanager.addBidResponse.firstCall.args[1];
      assert.propertyVal(bid1, 'cpm2', 3.8);
      assert.propertyVal(bid1, 'floor', 2.0);
      assert.propertyVal(bid1, 'exchangerate', 1.0);
      assert.propertyVal(bid1, 'nurl', 'www.something.com');

      let bid2 = bidmanager.addBidResponse.secondCall.args[1];
      assert.propertyVal(bid2, 'cpm2', undefined);
      assert.propertyVal(bid2, 'floor', 1.0);
      assert.propertyVal(bid2, 'exchangerate', 0.8);
      assert.propertyVal(bid2, 'nurl', 'www.something-else.com');


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

      assert.strictEqual(bidmanager.addBidResponse.firstCall.args[0], 'div-2');

      // invalid bids are added last
      assert.strictEqual(bidmanager.addBidResponse.secondCall.args[0], 'div-1');

      assertBid(bidmanager.addBidResponse.secondCall.args[1], 'bid1', '<div>tag1</div>', 300, 600);

      assertNoFillBid(bidmanager.addBidResponse.firstCall.args[1], 'bid2');
    });

    it('should perform user connect when have valid bids', () => {
      runUserConnect();

      assert.isTrue(utils.insertElement.calledOnce);
      const element = utils.insertElement.lastCall.args[0];

      assert.strictEqual(element.tagName, 'SCRIPT');
      assert.strictEqual(element.src, 'http://js.adscale.de/userconnect.js');

      const config = JSON.parse(element.getAttribute('data-container-config'));
      assert.equal(config.slotId, 'NDA=');
    });

    it('should perform user connect when have invalid bids', () => {
      bidderRequest.bids.forEach(b => delete b.params.sid);
      runUserConnect();

      assert.isTrue(utils.insertElement.calledOnce);
      const element = utils.insertElement.lastCall.args[0];

      assertConnectJs(element, 'http://js.adscale.de/userconnect.js')
    });

    it('should perform user connect using custom url', () => {
      const customtUserConnectJsUrl = 'https://other.com/connect.js';
      bidderRequest.bids[0].params.connectjsurl = customtUserConnectJsUrl;

      runUserConnect();

      assert.isTrue(utils.insertElement.calledOnce);
      const element = utils.insertElement.lastCall.args[0];

      assertConnectJs(element, customtUserConnectJsUrl, 'NDA=')
    });

    describe('generateAd method on bid object', function() {
      const tests = [
        // full price text
        {price:"1.570000", bidId: "123456789123456789", exchangeRate: 1.0, expectation: "MTIzNDU2Nzg5MTIzNDU2N8y5DxfESCHg5CTVFw"},
        // partial price text
        {price:"1.59", bidId: "123456789123456789123456789", exchangeRate: 1.0, expectation: "MTIzNDU2Nzg5MTIzNDU2N8y5Dxn0eBHQELptyg"},
        // large bidId will be trimmed (> 16 characters)
        {price:"1.59", bidId: "123456789123456789", exchangeRate: 1.0, expectation: "MTIzNDU2Nzg5MTIzNDU2N8y5Dxn0eBHQELptyg"},
        // small bidId will be padded (< 16 characters)
        {price:"1.59", bidId: "123456789", exchangeRate: 1.0, expectation: "MTIzNDU2Nzg5MDAwMDAwMDJGF0WFzgb7CQC2Nw"},
        // float instead of text
        {price:1.59, bidId: "123456789123456789", exchangeRate: 1.0, expectation: "MTIzNDU2Nzg5MTIzNDU2N8y5Dxn0eBHQELptyg"},
        // long price after applying exchange rate: 12.03 * 0.32 = 3.8495999999999997 (use 3.8496)
        {price:12.03, bidId: "123456789123456789", exchangeRate: 0.32, expectation: "MTIzNDU2Nzg5MTIzNDU2N865AhTNThHQOG035A"},
        // long price after applying exchange rate: 22.23 * 0.26 = 5.779800000000001 (use 5.7798)
        {price:22.23, bidId: "123456789123456789", exchangeRate: 0.26, expectation: "MTIzNDU2Nzg5MTIzNDU2N8i5DRfNQBHQ4_a0lA"},
        // somehow empty string for price
        {price:"", bidId: "123456789123456789", exchangeRate: 1.0, expectation: "MTIzNDU2Nzg5MTIzNDU2N_2XOiD0eBHQUWJCcw"},
        // handle zero
        {price:0, bidId: "123456789123456789", exchangeRate: 1.0, expectation: "MDAwMDAwMDAwMDAwMDAwMBhGtwXJgFkgKAaAWw"}
      ];
      tests.forEach(test => {

        it(`should replace \${AUCTION_PRICE:ENC} macro with ${test.expectation} given auction price ${test.price} and exchange rate ${test.exchangeRate}`, function() {
          const bidderResponse = buildBidderResponse();

          const responseBid = bidderResponse.bids[0];
          responseBid.exchangerate = test.exchangeRate;
          responseBid.ad = "<img src='tracker.com?p=${AUCTION_PRICE:ENC}></img>";
          responseBid.bidId = test.bidId;


          bidderRequest.bids[0].bidId = test.bidId;

          adapter(win).callBids(bidderRequest);

          fakeServer.respond();

          const bid = bidmanager.addBidResponse.firstCall.args[1];
          const ad = bid.generateAd({auctionPrice: test.price});

          const rx = /<img src='tracker.com\?p=(.*)><\/img>/g;
          const encryptedPrice = rx.exec(ad);
          assert.equal(encryptedPrice[1], test.expectation);
        });
      });

      it('should replace all occurrences of ${AUCTION_PRICE:ENC}', function() {
        const bidderResponse = buildBidderResponse({bidId1: "123456789123456789"});

        const responseBid = bidderResponse.bids[0];
        responseBid.ad = "<img src='tracker.com?p=${AUCTION_PRICE:ENC}></img>\n<script>var price=${AUCTION_PRICE:ENC}</script>";
        responseBid.bidId = "123456789123456789";

        fakeServer.respondWith(JSON.stringify(bidderResponse));
        bidderRequest.bids[0].bidId = "123456789123456789";

        adapter(win).callBids(bidderRequest);

        fakeServer.respond();

        const bid = bidmanager.addBidResponse.firstCall.args[1];
        const ad = bid.generateAd({auctionPrice: "40.22"});

        const expectedAd = "<img src='tracker.com\?p=MTIzNDU2Nzg5MTIzNDU2N8mnFBLGeBHQseHrBA><\/img>\n<script>var price=MTIzNDU2Nzg5MTIzNDU2N8mnFBLGeBHQseHrBA</script>";
        assert.equal(ad, expectedAd);
      });

      it.only('should replace all occurrences of ${AUCTION_PRICE}', function() {
        const bidderResponse = buildBidderResponse();

        const responseBid = bidderResponse.bids[0];
        responseBid.ad = "<img src='tracker.com?p=${AUCTION_PRICE}></img>\n<script>var price=${AUCTION_PRICE}</script>";
        responseBid.bidId = "123456789123456789";

        fakeServer.respondWith(JSON.stringify(bidderResponse));
        bidderRequest.bids[0].bidId = "123456789123456789";


        adapter(win).callBids(bidderRequest);

        fakeServer.respond();

        const bid = bidmanager.addBidResponse.firstCall.args[1];
        const ad = bid.generateAd({auctionPrice: 40.22});

        const expectedAd = "<img src='tracker.com\?p=40.22><\/img>\n<script>var price=40.22</script>";
        assert.equal(ad, expectedAd);
      });
    });

    function assertConnectJs(actualElement, expectedUrl, expectedSlotId) {
      assert.strictEqual(actualElement.tagName, 'SCRIPT');
      assert.strictEqual(actualElement.src, expectedUrl);

      if (expectedSlotId) {
        const config = JSON.parse(actualElement.getAttribute('data-container-config'));
        assert.equal(config.slotId, expectedSlotId);
      } else {
        assert.isFalse(actualElement.hasAttribute('data-container-config'));
      }
    }

    function runUserConnect() {
      fakeServer.respondWith(JSON.stringify(buildBidderResponse()));

      sandbox.stub(utils, 'insertElement');

      adapter().callBids(bidderRequest);

      fakeServer.respond();
    }
  });
});
