/* jshint -W030 */

import Adapter from '../../../src/adapters/underdogmedia';
import bidManager from '../../../src/bidmanager';
import {expect} from 'chai';

describe('underdog media adapter test', () => {

  let adapter;
  let server;

  // Minimal stub implementation of underdog media header bid API
  // This will prevent the need to load underdog's static library, and to make requests to underdog's server
  window.udm_header_lib = {

    BidRequest: function(options){
      return {
        send: function(){
            var siteId = options.siteId;
            if(siteId == 10272){
              // Only bid on this particular site id
              var bids = [];
              for(var i = 0; i < options.sizes.length; i++){
                var size = options.sizes[i];
                bids.push({
                  cpm: 3.14,
                  ad_html: `Ad HTML for site ID ${siteId} size ${size[0]}x${size[1]}`,
                  width:   size[0],
                  height:  size[1]
                });
              }
              options.callback({
                bids: bids
              });
            } else {
              options.callback({
                bids: []
              });
            }

        }
      };
    }

  };

  // The third bid here is an invalid site id and should return a 'no-bid'.
  function request() {
    adapter.callBids({
      bidderCode: 'underdogmedia',
      bids: [
        {
          bidder: 'underdogmedia',
          adUnitCode: 'foo',
          sizes: [[728, 90]],
          params: {
            siteId: '10272'
          }
        },
        {
          bidder: 'underdogmedia',
          adUnitCode: 'bar',
          sizes: [[300, 250]],
          params: {
            siteId: '10272'
          }
        },
        {
          bidder: 'underdogmedia',
          adUnitCode: 'nothing',
          sizes: [[160, 600]],
          params: {
            siteId: '31337'
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
      request();
      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
      thirdBid = bidManager.addBidResponse.thirdCall.args[1];
    });

    afterEach(() => {
      bidManager.addBidResponse.restore();
    });

    it('will add a bid object for each bid', () => {
      sinon.assert.calledThrice(bidManager.addBidResponse);
    });

    it('will add the ad html to the bid object', () => {
      expect(firstBid).to.have.property('ad', 'Ad HTML for site ID 10272 size 728x90');
      expect(secondBid).to.have.property('ad', 'Ad HTML for site ID 10272 size 300x250');
      expect(thirdBid).to.not.have.property('ad');
    });

    it('will have the right size attached', () => {
      expect(firstBid).to.have.property('width', 728);
      expect(firstBid).to.have.property('height', 90);
      expect(secondBid).to.have.property('width', 300);
      expect(secondBid).to.have.property('height', 250);
    });

    it('will add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 3.14);
      expect(secondBid).to.have.property('cpm', 3.14);
      expect(thirdBid).to.not.have.property('cpm');
    });

    it('will add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'underdogmedia');
      expect(secondBid).to.have.property('bidderCode', 'underdogmedia');
      expect(thirdBid).to.have.property('bidderCode', 'underdogmedia');
    });

  });

});
