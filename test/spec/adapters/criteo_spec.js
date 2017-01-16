/* jshint -W030 */

import Adapter from '../../../src/adapters/criteo';
import bidManager from '../../../src/bidmanager';
import {expect} from 'chai';

var CONSTANTS = require('../../../src/constants');

describe('criteo adapter test', () => {

  let adapter;
  let stubAddBidResponse;

  let validBid = {
        bidderCode: 'criteo',
        bids: [
          {
            bidder: 'criteo',
            placementCode: 'foo',
            sizes: [[250, 350]],
            params: {
                zoneId: 32934,
                audit: 'true'
            }
          }
        ]
   };

  let validResponse = {slots: [{impid: "foo", cpm: 1.12, creative: "<iframe src=\"fakeIframeSrc\" height=\"250\" width='350'></iframe>"}]};
  let invalidResponse = { slots: [{ "impid": "unknownSlot" }] }

  let validMultiBid = {
        bidderCode: 'criteo',
        bids: [
          {
            bidder: 'criteo',
            placementCode: 'foo',
            sizes: [[250, 350]],
            params: {
                zoneId: 32934,
                audit: 'true'
            }
          },
          {
            bidder: 'criteo',
            placementCode: 'bar',
            sizes: [[250, 350]],
            params: {
                zoneId: 32935,
                audit: 'true'
            }
          }
        ]
   };

  beforeEach(() => {
    adapter = new Adapter();
  });

  afterEach(() => {
    stubAddBidResponse.restore();
  });

describe('adding bids to the manager', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create({autoRespond: true, respondImmediately: true});
      server.respondWith(JSON.stringify(validResponse));
    });

    it('adds bid for valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.GOOD });
          done();
      });

      adapter.callBids(validBid);
    });

    it('adds bid for multibid valid request', (done) => {
      let callCount = 0;
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          callCount++;

          if (callCount == 2)
            done();
      });

      adapter.callBids(validMultiBid);
    });

    it('adds bidderCode to the response of a valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.have.property('bidderCode', 'criteo');
          done();
      });

      adapter.callBids(validBid);
    });

    it('adds cpm to the response of a valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
        expect(bid).to.have.property('cpm', 1.12);
        done();
      });
      adapter.callBids(validBid);
    });

    it('adds creative to the response of a valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
        expect(bid).to.have.property('ad', "<iframe src=\"fakeIframeSrc\" height=\"250\" width='350'></iframe>");
        done();
      });
      adapter.callBids(validBid);
    });
});

describe('dealing with unexpected situations', () => {
    let server;

    beforeEach(() => {
      server = sinon.fakeServer.create({autoRespond: true, respondImmediately: true});
    });

    it('no bid if cdb handler responds with no bid empty string response', (done) => {
      server.respondWith("");

      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.NO_BID });
          done();
      });

      adapter.callBids(validBid);
    });

    it('no bid if cdb handler responds with no bid empty object response', (done) => {
      server.respondWith("{ }");

      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.NO_BID });
          done();
      });

      adapter.callBids(validBid);
    });

    it('no bid if cdb handler responds with HTTP error', (done) => {
      server.respondWith([500, {}, "Internal Server Error"]);

      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.NO_BID });
          done();
      });

      adapter.callBids(validBid);
    });

    it('no bid if response is invalid because response slots don\'t match input slots', (done) => {
      server.respondWith(JSON.stringify(invalidResponse));

      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.satisfy(bid => { return bid.getStatusCode() == CONSTANTS.STATUS.NO_BID });
          done();
      });

      adapter.callBids(validBid);
    });
  });

});
