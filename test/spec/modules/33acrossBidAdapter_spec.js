const { expect } = require('chai');
const utils = require('../../../src/utils');
const { isBidRequestValid, buildRequests, interpretResponse, getUserSyncs } = require('../../../modules/33acrossBidAdapter');

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
          [300, 250],
          [728, 90]
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
    context('valid bid request:', function () {
      it('returns true when bidder, params.siteId, params.productId are set', function() {
        const validBid = {
          bidder: BIDDER_CODE,
          params: {
            siteId: SITE_ID,
            productId: PRODUCT_ID
          }
        }

        expect(isBidRequestValid(validBid)).to.be.true;
      })
    });

    context('valid test bid request:', function () {
      it('returns true when bidder, params.site.id, params.productId are set', function() {
        const validBid = {
          bidder: BIDDER_CODE,
          params: {
            site: {
              id: SITE_ID
            },
            productId: PRODUCT_ID
          }
        }

        expect(isBidRequestValid(validBid)).to.be.true;
      });
    });

    context('invalid bid request:', function () {
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

      it('returns false when params.siteId or params.site.id not set', function() {
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
  });

  describe('buildRequests:', function() {
    it('returns corresponding server requests for each valid bidRequest', function() {
      const ttxRequest = {
        imp: [{
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
        }],
        site: {
          id: SITE_ID
        },
        id: 'b1'
      };
      const serverRequest = {
        method: 'POST',
        url: END_POINT,
        data: JSON.stringify(ttxRequest),
        options: {
          contentType: 'application/json',
          withCredentials: false
        }
      }
      const builtServerRequests = buildRequests(this.bidRequests);
      expect(builtServerRequests).to.deep.equal([serverRequest]);
      expect(builtServerRequests.length).to.equal(1);
    });

    it('returns corresponding server requests for each valid test bidRequest', function() {
      delete this.bidRequests[0].params.siteId;
      this.bidRequests[0].params.site = {
        id: SITE_ID,
        page: 'http://test-url.com'
      }
      this.bidRequests[0].params.customHeaders = {
        foo: 'bar'
      };
      this.bidRequests[0].params.url = '//staging-ssc.33across.com/api/v1/hb';

      const ttxRequest = {
        imp: [{
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
        }],
        site: {
          id: SITE_ID,
          page: 'http://test-url.com'
        },
        id: 'b1'
      };
      const serverRequest = {
        method: 'POST',
        url: '//staging-ssc.33across.com/api/v1/hb',
        data: JSON.stringify(ttxRequest),
        options: {
          contentType: 'application/json',
          withCredentials: false,
          customHeaders: {
            foo: 'bar'
          }
        }
      };

      const builtServerRequests = buildRequests(this.bidRequests);
      expect(builtServerRequests).to.deep.equal([serverRequest]);
      expect(builtServerRequests.length).to.equal(1);
    });

    afterEach(function() {
      delete this.bidRequests;
    })
  });

  describe('interpretResponse', function() {
    context('when exactly one bid is returned', function() {
      it('interprets and returns the single bid response', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: [
            {
              bid: [{
                id: '1',
                adm: '<html><h3>I am an ad</h3></html>',
                ext: {
                  rp: {
                    advid: 1
                  }
                },
                h: 250,
                w: 300,
                price: 0.0938
              }]
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
          creativeId: 1,
          currency: 'USD',
          netRevenue: true
        }

        expect(interpretResponse({body: serverResponse})).to.deep.equal([bidResponse]);
      });
    });

    context('when no bids are returned', function() {
      it('interprets and returns empty array', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: []
        };

        expect(interpretResponse({body: serverResponse})).to.deep.equal([]);
      });
    });

    context('when more than one bids are returned', function() {
      it('interprets and returns the the first bid of the first seatbid', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: [
            {
              bid: [{
                id: '1',
                adm: '<html><h3>I am an ad</h3></html>',
                ext: {
                  rp: {
                    advid: 1
                  }
                },
                h: 250,
                w: 300,
                price: 0.0940
              },
              {
                id: '2',
                adm: '<html><h3>I am an ad</h3></html>',
                ext: {
                  rp: {
                    advid: 2
                  }
                },
                h: 250,
                w: 300,
                price: 0.0938
              }
              ]
            },
            {
              bid: [{
                id: '3',
                adm: '<html><h3>I am an ad</h3></html>',
                ext: {
                  rp: {
                    advid: 3
                  }
                },
                h: 250,
                w: 300,
                price: 0.0938
              }]
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
          creativeId: 1,
          currency: 'USD',
          netRevenue: true
        }

        expect(interpretResponse({body: serverResponse})).to.deep.equal([bidResponse]);
      });
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
            site: { id: 'id1' },
            productId: 'p1',
            syncUrl: 'https://staging-de.tynt.com/deb/v2?m=xch'
          }
        },
        {
          params: {
            site: { id: 'id2' },
            productId: 'p1',
            syncUrl: 'https://staging-de.tynt.com/deb/v2?m=xch'
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
          url: 'https://staging-de.tynt.com/deb/v2?m=xch&id=id1'
        },
        {
          type: 'iframe',
          url: 'https://staging-de.tynt.com/deb/v2?m=xch&id=id2'
        },
      ];
    });

    context('when iframe is not enabled', function() {
      it('returns empty sync array', function() {
        this.sandbox.stub(utils, 'getBidderRequestAllAdUnits', () => (
          {
            bids: this.ttxBids
          }
        ));
        const syncOptions = {};
        expect(getUserSyncs(syncOptions)).to.deep.equal([]);
      });
    });

    context('when iframe is enabled', function() {
      it('returns sync array equal to number of bids for ttx', function() {
        this.sandbox.stub(utils, 'getBidderRequestAllAdUnits', () => (
          {
            bids: this.ttxBids
          }
        ));

        const syncOptions = {
          iframeEnabled: true
        };
        const syncs = getUserSyncs(syncOptions);
        expect(syncs.length).to.equal(this.ttxBids.length);
        expect(syncs).to.deep.equal(this.syncs);
      });

      it('returns sync array equal to number of test bids for ttx', function() {
        this.sandbox.stub(utils, 'getBidderRequestAllAdUnits', () => (
          {
            bids: this.testTTXBids
          }
        ));

        const syncOptions = {
          iframeEnabled: true
        };
        const syncs = getUserSyncs(syncOptions);
        expect(syncs.length).to.equal(this.testTTXBids.length);
        expect(syncs).to.deep.equal(this.testSyncs);
      });
    });
  });
});
