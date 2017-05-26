/* jshint -W030 */

import Adapter from '../../../src/adapters/underdogmedia';
import bidManager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';

import {
  expect
} from 'chai';

describe('underdogmedia adapter test', () => {
  let adapter;
  let server;

  // The third bid here is an invalid site id and should return a 'no-bid'.

  var bidderRequest = {
    bidderCode: 'underdogmedia',
    bids: [{
      bidder: 'underdogmedia',
      adUnitCode: 'foo',
      sizes: [
          [728, 90]
      ],
      params: {
        siteId: '10272'
      }
    },
    {
      bidder: 'underdogmedia',
      adUnitCode: 'bar',
      sizes: [
          [300, 250]
      ],
      params: {
        siteId: '10272',
        subId: 'TEST_SUBID'
      }
    },
    {
      bidder: 'underdogmedia',
      adUnitCode: 'nothing',
      sizes: [160, 600],
      params: {
        siteId: '31337'
      }
    }
    ]
  };
  var response = {
    'mids': [{
      'width': 728,
      'notification_url': '//udmserve.net/notification_url',
      'height': 90,
      'cpm': 2.5,
      'ad_code_html': 'Ad HTML for site ID 10272 size 728x90'
    },
    {
      'width': 300,
      'notification_url': '//udmserve.net/notification_url',
      'height': 250,
      'cpm': 2.0,
      'ad_code_html': 'Ad HTML for site ID 10272 size 300x250'
    }
    ]
  };

  beforeEach(() => {
    adapter = new Adapter();
  });

  afterEach(() => {});

  describe('adding bids to the manager', () => {
    let firstBid;
    let secondBid;
    let thirdBid;

    beforeEach(() => {
      sinon.stub(bidManager, 'addBidResponse');
      sinon.stub(adloader, 'loadScript');

      adapter.callBids(bidderRequest);
      $$PREBID_GLOBAL$$.handleUnderdogMediaCB(JSON.parse(JSON.stringify(response)));
      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
      thirdBid = bidManager.addBidResponse.thirdCall.args[1];
    });

    afterEach(() => {
      bidManager.addBidResponse.restore();
      adloader.loadScript.restore();
    });

    it('will add a bid object for each bid', () => {
      sinon.assert.calledThrice(bidManager.addBidResponse);
    });

    it('will add the ad html to the bid object', () => {
      expect(firstBid).to.have.property('ad').includes('Ad HTML for site ID 10272 size 728x90');
      expect(secondBid).to.have.property('ad').includes('Ad HTML for site ID 10272 size 300x250').and.includes('TEST_SUBID');
      expect(thirdBid).to.not.have.property('ad');
    });

    it('will have the right size attached', () => {
      expect(firstBid).to.have.property('width', 728);
      expect(firstBid).to.have.property('height', 90);
      expect(secondBid).to.have.property('width', 300);
      expect(secondBid).to.have.property('height', 250);
    });

    it('will add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 2.5);
      expect(secondBid).to.have.property('cpm', 2.0);
      expect(thirdBid).to.not.have.property('cpm');
    });

    it('will add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'underdogmedia');
      expect(secondBid).to.have.property('bidderCode', 'underdogmedia');
      expect(thirdBid).to.have.property('bidderCode', 'underdogmedia');
    });
  });
});
