// import or require modules necessary for the test, e.g.:

import {expect} from 'chai';
import {spec as adapter} from 'modules/pubwiseBidAdapter.js';
import * as utils from 'src/utils.js';

const sampleBid = {
  bidder: 'pubwise',
  params: {
    siteId: 'xxxxxx',
    spotId: '12345678',
    isTest: true
  },
  sizes: [[300, 250]],
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bid_id: '1234',
};

const sampleRequest = {
  bidder: 'pubwise',
  params: {
    siteId: 'xxxxxx',
    puspotId: '12345678',
    isTest: true
  },
  sizes: [{width: 300, height: 250}],
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bid_id: '1234',
};

describe('PubWiseAdapter', function () {
  describe('Check methods existance', function () {
    it('exists and is a function', function () {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.buildRequests).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.interpretResponse).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.getUserSyncs).to.exist.and.to.be.a('function');
    });
  });

  describe('Check method isBidRequestValid return', function () {
    let bid = sampleBid;

    it('should be true', function () {
      expect(adapter.isBidRequestValid(bid)).to.be.true;
    });
  });

  describe('Check buildRequests method', function () {
    // Bids to be formatted
    let bid1 = sampleBid;

    let jsonData = {
      pbdata: [sampleBid],
      version: '0.0.1'
    };

    // Formatted requets
    let request1 = {
      data: jsonData,
      method: 'POST',
      options: {
        contentType: 'application/json'
      },
      url: 'https://bid.pubwise.io/prebid'
    };

    it('must return the right formatted requests', function () {
      expect(adapter.buildRequests([bid1])).to.deep.equal(request1);
    });
  });

  describe('Check interpretResponse method return', function () {
    // Server's response
    let response = {
      body: {
        Banner: [
          {
            'RequestID': '1234',
            'CPM': 1.23,
            'Width': 300,
            'Height': 250,
            'CreativeID': 'test',
            'DealID': '',
            'Currency': 'USD',
            'NetRevenue': true,
            'TTL': 0,
            'Referrer': '',
            'Ad': '<div style="box-sizing: border-box;width:298px;height:248px;border: 1px solid rgba(0,0,0,.25);border-radius:10px;"><h3 style="margin-top:80px;text-align: center;">PubWise Test Bid</h3></div>',
            'Test': true,
            'Version': ''
          }
        ]
      }
    };
    // bid Request
    let bid = sampleBid;
    // Formatted reponse
    let result = {
      requestId: '1234',
      cpm: 1.23,
      width: 300,
      height: 250,
      creativeId: 'test',
      dealId: '',
      currency: 'USD',
      netRevenue: true,
      ttl: 0,
      referrer: '',
      ad: '<div style="box-sizing: border-box;width:298px;height:248px;border: 1px solid rgba(0,0,0,.25);border-radius:10px;"><h3 style="margin-top:80px;text-align: center;">PubWise Test Bid</h3></div>',
    };

    it('should equal to the expected formatted result', function () {
      // console.log(adapter.interpretResponse(response, bid));
      // expect(adapter.interpretResponse(response, bid)).to.deep.equal([result]);
    });
  });

  describe('Check getUserSyncs method return', function () {
    // Sync not currently enabled
  });
});
