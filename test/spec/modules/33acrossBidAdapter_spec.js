const { expect } = require('chai');
const utils = require('../../../src/utils');
const {
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
} = require('../../../modules/33acrossBidAdapter');

describe('33acrossBidAdapter:', function () {
  const BIDDER_CODE = '33across';
  const SITE_ID = 'pub1234';
  const PRODUCT_ID = 'product1';
  const END_POINT = 'https://ssc.33across.com/api/v1/hb';

  beforeEach(function() {
    this.bidRequests = [
      {
        bidId: 'b1',
        bidder: '33across',
        bidderRequestId: 'b1a',
        params: {
          siteId: SITE_ID,
          productId: PRODUCT_ID
        },
        adUnitCode: 'div-id',
        requestId: 'r1',
        sizes: [
          [ 300, 250 ],
          [ 728, 90 ]
        ],
        transactionId: 't1'
      }
    ]
    this.sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    this.sandbox.restore();
  });

  describe('isBidRequestValid:', function () {
    it('returns true when bidder params.siteId, params.productId are set', function() {
      const validBid = {
        bidder: BIDDER_CODE,
        params: {
          siteId: SITE_ID,
          productId: PRODUCT_ID
        }
      }

      expect(isBidRequestValid(validBid)).to.be.true;
    });

    it('returns true when bidder, params.siteId, params.productId and test are set', function() {
      const validBid = {
        bidder: BIDDER_CODE,
        params: {
          siteId: SITE_ID,
          productId: PRODUCT_ID,
          test: 1
        }
      }

      expect(isBidRequestValid(validBid)).to.be.true;
    });

    it('returns false when bidder not set to "33across"', function () {
      const invalidBid = {
        bidder: 'foo',
        params: {
          siteId: SITE_ID,
          productId: PRODUCT_ID
        }
      }

      expect(isBidRequestValid(invalidBid)).to.be.false;
    });

    it('returns false when params not set', function() {
      const invalidBid = {
        bidder: 'foo'
      }

      expect(isBidRequestValid(invalidBid)).to.be.false;
    });

    it('returns false when params.siteId not set', function() {
      const invalidBid = {
        bidder: 'foo',
        params: {
          productId: PRODUCT_ID
        }
      }

      expect(isBidRequestValid(invalidBid)).to.be.false;
    });

    it('returns false when params.productId not set', function() {
      const invalidBid = {
        bidder: 'foo',
        params: {
          siteId: SITE_ID
        }
      }

      expect(isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests:', function() {
    it('returns corresponding server requests for each valid bidRequest', function() {
      const ttxRequest = {
        imp: [ {
          banner: {
            format: [
              {
                w: 300,
                h: 250,
                ext: {}
              },
              {
                w: 728,
                h: 90,
                ext: {}
              }
            ]
          },
          ext: {
            ttx: {
              prod: PRODUCT_ID
            }
          }
        } ],
        site: {
          id: SITE_ID
        },
        id: 'b1'
      };
      const serverRequest = {
        'method': 'POST',
        'url': END_POINT,
        'data': JSON.stringify(ttxRequest),
        'options': {
          'contentType': 'application/json',
          'withCredentials': false
        }
      }
      const builtServerRequests = buildRequests(this.bidRequests);
      expect(builtServerRequests).to.deep.equal([ serverRequest ]);
      expect(builtServerRequests.length).to.equal(1);
    });

    it('returns corresponding server requests for each valid test bidRequest', function() {
      this.bidRequests[0].params.test = 1;

      const ttxRequest = {
        imp: [ {
          banner: {
            format: [
              {
                w: 300,
                h: 250,
                ext: { }
              },
              {
                w: 728,
                h: 90,
                ext: { }
              }
            ]
          },
          ext: {
            ttx: {
              prod: PRODUCT_ID
            }
          }
        } ],
        site: {
          id: SITE_ID
        },
        id: 'b1',
        test: 1
      };
      const serverRequest = {
        'method': 'POST',
        'url': 'https://staging-ssc.33across.com/api/v1/hb',
        'data': JSON.stringify(ttxRequest),
        'options': {
          'contentType': 'application/json',
          'withCredentials': false
        }
      };

      const builtServerRequests = buildRequests(this.bidRequests);
      expect(builtServerRequests).to.deep.equal([ serverRequest ]);
      expect(builtServerRequests.length).to.equal(1);
    });

    afterEach(function() {
      delete this.bidRequests;
    })
  });

  describe('interpretResponse', function() {
    it('interprets and returns the single bid response', function() {
      const serverResponse = {
        cur: 'USD',
        ext: { },
        id: 'b1',
        seatbid: [
          {
            bid: [ {
              id: '1',
              adm: '<html><h3>I am an ad</h3></html>',
              crid: '1',
              h: 250,
              w: 300,
              price: 0.0938
            } ]
          }
        ]
      };

      const bidResponse = {
        requestId: 'b1',
        bidderCode: BIDDER_CODE,
        cpm: 0.0938,
        width: 300,
        height: 250,
        ad: '<html><h3>I am an ad</h3></html>',
        ttl: 60,
        creativeId: '1',
        currency: 'USD',
        netRevenue: true
      }

      expect(interpretResponse({ body: serverResponse })).to.deep.equal([ bidResponse ]);
    });

    it('interprets and returns empty array', function() {
      const serverResponse = {
        cur: 'USD',
        ext: { },
        id: 'b1',
        seatbid: [ ]
      };

      expect(interpretResponse({ body: serverResponse })).to.deep.equal([ ]);
    });

    it('interprets and returns the the first bid of the first seatbid when more bids are returned', function() {
      const serverResponse = {
        cur: 'USD',
        ext: { },
        id: 'b1',
        seatbid: [
          {
            bid: [ {
              id: '1',
              adm: '<html><h3>I am an ad</h3></html>',
              crid: '1',
              h: 250,
              w: 300,
              price: 0.0940
            },
            {
              id: '2',
              adm: '<html><h3>I am an ad</h3></html>',
              crid: '2',
              h: 250,
              w: 300,
              price: 0.0938
            }
            ]
          },
          {
            bid: [ {
              id: '3',
              adm: '<html><h3>I am an ad</h3></html>',
              crid: '3',
              h: 250,
              w: 300,
              price: 0.0938
            } ]
          }
        ]
      };

      const bidResponse = {
        requestId: 'b1',
        bidderCode: BIDDER_CODE,
        cpm: 0.0940,
        width: 300,
        height: 250,
        ad: '<html><h3>I am an ad</h3></html>',
        ttl: 60,
        creativeId: '1',
        currency: 'USD',
        netRevenue: true
      }

      expect(interpretResponse({ body: serverResponse })).to.deep.equal([ bidResponse ]);
    });
  });

  describe('getUserSyncs', function() {
    beforeEach(function() {
      this.ttxBids = [
        {
          params: {
            siteId: 'id1',
            productId: 'p1'
          }
        },
        {
          params: {
            siteId: 'id2',
            productId: 'p1'
          }
        }
      ];

      this.testTTXBids = [
        {
          params: {
            siteId: 'id1',
            productId: 'p1',
            test: 1
          }
        },
        {
          params: {
            siteId: 'id2',
            productId: 'p1',
            test: 1
          }
        }
      ];

      this.syncs = [
        {
          type: 'iframe',
          url: 'https://de.tynt.com/deb/v2?m=xch&id=id1'
        },
        {
          type: 'iframe',
          url: 'https://de.tynt.com/deb/v2?m=xch&id=id2'
        },
      ];

      this.testSyncs = [
        {
          type: 'iframe',
          url: 'https://de.tynt.com/deb/v2?m=xch&id=id1'
        },
        {
          type: 'iframe',
          url: 'https://de.tynt.com/deb/v2?m=xch&id=id2'
        },
      ];

      this.getFakeBids = () => (
        {
          bids: this.ttxBids
        }
      );

      this.getFakeTestBids = () => (
        {
          bids: this.testTTXBids
        }
      );
    });

    it('returns empty sync array when iframe is not enabled', function() {
      this.sandbox.stub(utils, 'getBidderRequestAllAdUnits', this.getFakeBids);
      const syncOptions = {};
      expect(getUserSyncs(syncOptions)).to.deep.equal([]);
    });

    it('returns sync array equal to number of bids for ttx when iframe is enabled', function() {
      this.sandbox.stub(utils, 'getBidderRequestAllAdUnits', this.getFakeBids);

      const syncOptions = {
        iframeEnabled: true
      };
      const syncs = getUserSyncs(syncOptions);
      expect(syncs.length).to.equal(this.ttxBids.length);
      expect(syncs).to.deep.equal(this.syncs);
    });

    it('returns sync array equal to number of test bids for ttx when iframe is enabled', function() {
      this.sandbox.stub(utils, 'getBidderRequestAllAdUnits', this.getFakeTestBids);

      const syncOptions = {
        iframeEnabled: true
      };
      const syncs = getUserSyncs(syncOptions);
      expect(syncs.length).to.equal(this.testTTXBids.length);
      expect(syncs).to.deep.equal(this.testSyncs);
    });
  });
});
