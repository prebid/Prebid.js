import Adapter from '../../../src/adapters/getintent';
import bidManager from '../../../src/bidmanager';
import {expect} from 'chai';

describe('getintent media adapter test', () => {

  let adapter;

  window.gi_hb = {
    makeBid: function(bidRequest, callback) {
      var pid = bidRequest.pid;
      var tid = bidRequest.tid;

      if (pid == "p1" || pid == "p2") {
         callback({
           ad : `Ad Markup ${pid} ${tid}`,
           cpm : 2.71,
           size : `${bidRequest.size}`
         }, bidRequest);
      } else {
        callback({
          no_bid: 1
        }, bidRequest);
      }
    }
  };

  function callOut() {
    adapter.callBids({
      bidderCode: "getintent",
      bids: [
        {
          bidder: "getintent",
          adUnitCode: "test1",
          sizes: [[320,240]],
          params: {
            pid: "p1",
            tid: "t1",
            cur: "USD"
          }
        },
        {
          bidder: "getintent",
          adUnitCode: "test2",
          sizes: [[720,90]],
          params: {
            pid: "p2",
            tid: "t1",
            cur: "USD"
          }
        },
        {
          bidder: "getintent",
          adUnitCode: "test3",
          sizes: [[400,500]],
          params: {
            pid: "p3",
            tid: "t2",
            cur: "USD"
          }
        }
      ]
    });
  }

  beforeEach(() => {
    adapter = new Adapter();
  });

  afterEach(() => {
  });

  describe('adding bids to the manager', () => {

    let firstBid;
    let secondBid;
    let thirdBid;

    beforeEach(() => {
      sinon.stub(bidManager, 'addBidResponse');
      callOut();
      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
      thirdBid = bidManager.addBidResponse.thirdCall.args[1];
    });

    afterEach(() => {
      bidManager.addBidResponse.restore();
    });

    it('was called three times', () => {
      sinon.assert.calledThrice(bidManager.addBidResponse);
    });

    it('will respond to the first bid', () => {
      expect(firstBid).to.have.property('ad', 'Ad Markup p1 t1');
      expect(firstBid).to.have.property('cpm', 2.71);
      expect(firstBid).to.have.property('width', '320');
      expect(firstBid).to.have.property('height', '240');
    });

    it('will respond to the second bid', () => {
      expect(secondBid).to.have.property('ad', 'Ad Markup p2 t1');
      expect(secondBid).to.have.property('cpm', 2.71);
      expect(secondBid).to.have.property('width', '720');
      expect(secondBid).to.have.property('height', '90');
    });

    it('wont respond to the third bid', () => {
      expect(thirdBid).to.not.have.property('ad');
      expect(thirdBid).to.not.have.property('cpm');
    });

    it('will add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'getintent');
      expect(secondBid).to.have.property('bidderCode', 'getintent');
      expect(thirdBid).to.have.property('bidderCode', 'getintent');
    });
  });

});
