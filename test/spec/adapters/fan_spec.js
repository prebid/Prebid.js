/* jshint -W030 */

import Adapter from '../../../src/adapters/fan';
import bidManager from '../../../src/bidmanager';
import {parse as parseURL} from '../../../src/url';
import {expect} from 'chai';

describe('FAN Adapter', () => {

  let adapter;
  let server;

  function request() {
    adapter.callBids({
      bidderCode: 'fan',
      bids: [
        {
          bidder: 'fan',
          adUnitCode: 'foo',
          sizes: [[728, 90]],
          params: {
            placementId: '123_456'
          }
        },
        {
          bidder: 'fan',
          adUnitCode: 'bar',
          sizes: [[300, 600]],
          params: {
            placementId: '123_789'
          }
        }
      ]
    });
  }

  beforeEach(() => {
    adapter = new Adapter();
    server = sinon.fakeServer.create();
  });

  afterEach(() => {
    server.restore();
  });

  describe('requesting their API', () => {

    let requests;

    beforeEach(() => {
      requests = [];
      server.respondWith(request => {
        request.params = parseURL(request.url).search;
        requests.push(request);
      });
      request();
      server.respond();
    });

    it('should send the placement IDs as an array', () => {
      expect(requests[0].params.placementids).to.eql(['123_456', '123_789']);
    });

    it('sends the ad formats as FAN expects them', () => {
      expect(requests[0].params.adformats).to.eql(['728x90', 'native']);
    });

  });

  describe('adding bids to the manager', () => {

    let firstBid;
    let secondBid;

    beforeEach(() => {
      sinon.stub(bidManager, 'addBidResponse');
      server.respondWith([
        200,
        {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': '*',
          'content-type': 'text/javascript; charset=UTF-8'
        },
        JSON.stringify({
          "errors": [ ],
          "bids": {
            "123_456": {
              "placement_id": "123_456",
              "bid_id": "12345_67890",
              "bid_price_cents": 321.96265882399,
              "bid_price_currency": "usd",
              "bid_price_model": "cpm"
            },
            "123_789": {
              "placement_id": "123_789",
              "bid_id": "12345_09876",
              "bid_price_cents": 711.28405256274,
              "bid_price_currency": "usd",
              "bid_price_model": "cpm"
            }
          }
        })
      ]);
      request();
      server.respond();
      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
    });

    afterEach(() => {
      bidManager.addBidResponse.restore();
    });

    it('will add a bid object for each bid', () => {
      sinon.assert.calledTwice(bidManager.addBidResponse);
    });

    it('will add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 321.96265882399 / 100);
      expect(secondBid).to.have.property('cpm', 711.28405256274 / 100);
    });

    it('will add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'fan');
      expect(secondBid).to.have.property('bidderCode', 'fan');
    });

    it('will include the ad to the bid object', () => {
      expect(firstBid).to.have.property('ad');
      expect(secondBid).to.have.property('ad');
    });

    it('will include the size to the bid object', () => {
      expect(firstBid).to.have.property('width', 728);
      expect(firstBid).to.have.property('height', 90);
      expect(secondBid).to.have.property('width', 300);
      expect(secondBid).to.have.property('height', 600);
    });

  });

  describe('handling FAN errors', () => {

    let firstBid;
    let secondBid;

    beforeEach(() => {
      sinon.stub(bidManager, 'addBidResponse');
      server.respondWith([
        200,
        {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': '*',
          'content-type': 'text/javascript; charset=UTF-8'
        },
        JSON.stringify({
          "errors": ['Foo', 'Bar'],
          "bids": {}
        })
      ]);
      request();
      server.respond();
      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
    });

    afterEach(() => {
      bidManager.addBidResponse.restore();
    });

    it('will create an error bid object for each error', () => {
      sinon.assert.calledTwice(bidManager.addBidResponse);
      expect(firstBid).to.have.property('statusMessage', 'Bid returned empty or error response');
      expect(secondBid).to.have.property('statusMessage', 'Bid returned empty or error response');
    });

  });

});
