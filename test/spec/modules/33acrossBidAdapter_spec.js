const { userSync } = require('../../../src/userSync');
const { config } = require('../../../src/config');

const { expect } = require('chai');
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
  const SYNC_ENDPOINT = 'https://de.tynt.com/deb/v2?m=xch&rt=html';

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
        auctionId: 'r1',
        sizes: [
          [ 300, 250 ],
          [ 728, 90 ]
        ],
        transactionId: 't1'
      }
    ];
    this.sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    this.sandbox.restore();
    delete this.bidRequests;
  });

  describe('isBidRequestValid:', function () {
    it('returns true when valid bid request is sent', function() {
      const validBid = {
        bidder: BIDDER_CODE,
        params: {
          siteId: SITE_ID,
          productId: PRODUCT_ID
        }
      }

      expect(isBidRequestValid(validBid)).to.be.true;
    });

    it('returns true when valid test bid request is sent', function() {
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

    it('returns false when site ID is not set in params', function() {
      const invalidBid = {
        bidder: 'foo',
        params: {
          productId: PRODUCT_ID
        }
      }

      expect(isBidRequestValid(invalidBid)).to.be.false;
    });

    it('returns false when product ID not set in params', function() {
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

    context('when gdpr consent data exists', function() {
      beforeEach(function() {
        this.bidderRequest= {
          gdprConsent: {
            consentString: "foobarMyPreference",
            gdprApplies: true
          }
        }
      });

      it('returns corresponding server requests with gdpr consent data', function() {
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
          id: 'b1',
          user:  {
            ext: {
              consent: "foobarMyPreference"
            }
          },
          regs: {
            ext: {
              gdpr: 1
            }
          }
        };

        const serverRequest = {
          'method': 'POST',
          'url': END_POINT,
          'data': JSON.stringify(ttxRequest),
          'options': {
            'contentType': 'text/plain',
            'withCredentials': true
          }
        }
        const builtServerRequests = buildRequests(this.bidRequests, this.bidderRequest);
        expect(builtServerRequests).to.deep.equal([ serverRequest ]);
        expect(builtServerRequests.length).to.equal(1);
      });

      it('returns corresponding test server requests with gdpr consent data', function() {
        this.sandbox.stub(config, 'getConfig').callsFake(() => {
          return {
            'url': 'https://foo.com/hb/'
          }
        });

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
          user:  {
            ext: {
              consent: "foobarMyPreference"
            }
          },
          regs: {
            ext: {
              gdpr: 1
            }
          }
        };
        const serverRequest = {
          method: 'POST',
          url: 'https://foo.com/hb/',
          data: JSON.stringify(ttxRequest),
          options: {
            contentType: 'text/plain',
            withCredentials: true
          }
        };

        const builtServerRequests = buildRequests(this.bidRequests, this.bidderRequest);
        expect(builtServerRequests).to.deep.equal([ serverRequest ]);
        expect(builtServerRequests.length).to.equal(1);
      });

      afterEach(function() {
        delete this.bidderRequest;
      })
    });

    context('when gdpr consent data does not exist', function() {
      beforeEach(function() {
        this.bidderRequest= { }
      });

      it('returns corresponding server requests with default gdpr consent data', function() {
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
          id: 'b1',
          user:  {
            ext: {
              consent: undefined
            }
          },
          regs: {
            ext: {
              gdpr: 0
            }
          }
        };

        const serverRequest = {
          'method': 'POST',
          'url': END_POINT,
          'data': JSON.stringify(ttxRequest),
          'options': {
            'contentType': 'text/plain',
            'withCredentials': true
          }
        }
        const builtServerRequests = buildRequests(this.bidRequests, this.bidderRequest);
        expect(builtServerRequests).to.deep.equal([ serverRequest ]);
        expect(builtServerRequests.length).to.equal(1);
      });

      it('returns corresponding test server requests with default gdpr consent data', function() {
        this.sandbox.stub(config, 'getConfig').callsFake(() => {
          return {
            'url': 'https://foo.com/hb/'
          }
        });

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
          user:  {
            ext: {
              consent: undefined
            }
          },
          regs: {
            ext: {
              gdpr: 0
            }
          }
        };
        const serverRequest = {
          method: 'POST',
          url: 'https://foo.com/hb/',
          data: JSON.stringify(ttxRequest),
          options: {
            contentType: 'text/plain',
            withCredentials: true
          }
        };

        const builtServerRequests = buildRequests(this.bidRequests, this.bidderRequest);
        expect(builtServerRequests).to.deep.equal([ serverRequest ]);
        expect(builtServerRequests.length).to.equal(1);
      });

      afterEach(function() {
        delete this.bidderRequest;
      })
    });
  });

  describe('interpretResponse', function() {
    beforeEach(function() {
      this.ttxRequest = {
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
          id: SITE_ID,
          page: 'http://test-url.com'
        },
        id: 'b1'
      };
      this.serverRequest = {
        method: 'POST',
        url: '//staging-ssc.33across.com/api/v1/hb',
        data: JSON.stringify(this.ttxRequest),
        options: {
          contentType: 'text/plain',
          withCredentials: false
        }
      };
    });

    context('when exactly one bid is returned', function() {
      it('interprets and returns the single bid response', function() {
        const serverResponse = {
          cur: 'USD',
          ext: {},
          id: 'b1',
          seatbid: [
            {
              bid: [ {
                id: '1',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 1,
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
          creativeId: 1,
          currency: 'USD',
          netRevenue: true
        }

        expect(interpretResponse({ body: serverResponse }, this.serverRequest)).to.deep.equal([ bidResponse ]);
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

        expect(interpretResponse({ body: serverResponse }, this.serverRequest)).to.deep.equal([]);
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
              bid: [ {
                id: '1',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 1,
                h: 250,
                w: 300,
                price: 0.0940
              },
              {
                id: '2',
                adm: '<html><h3>I am an ad</h3></html>',
                crid: 2,
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
                crid: 3,
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
          creativeId: 1,
          currency: 'USD',
          netRevenue: true
        };

        expect(interpretResponse({ body: serverResponse }, this.serverRequest)).to.deep.equal([ bidResponse ]);
      });
    });
  });

  describe('getUserSyncs', function() {
    beforeEach(function() {
      this.syncs = [
        {
          type: 'iframe',
          url: 'https://de.tynt.com/deb/v2?m=xch&rt=html&id=id1'
        },
        {
          type: 'iframe',
          url: 'https://de.tynt.com/deb/v2?m=xch&rt=html&id=id2'
        },
      ];
      this.bidRequests = [
        {
          bidId: 'b1',
          bidder: '33across',
          bidderRequestId: 'b1a',
          params: {
            siteId: 'id1',
            productId: 'foo'
          },
          adUnitCode: 'div-id',
          auctionId: 'r1',
          sizes: [
            [ 300, 250 ]
          ],
          transactionId: 't1'
        },
        {
          bidId: 'b2',
          bidder: '33across',
          bidderRequestId: 'b2a',
          params: {
            siteId: 'id2',
            productId: 'foo'
          },
          adUnitCode: 'div-id',
          auctionId: 'r1',
          sizes: [
            [ 300, 250 ]
          ],
          transactionId: 't2'
        }
      ];
    });

    context('when gdpr does not apply', function() {
      beforeEach(function() {
        this.gdprConsent = {
          gdprApplies: false
        }
      });

      context('when iframe is not enabled', function() {
        it('returns empty sync array', function() {
          const syncOptions = {};
          buildRequests(this.bidRequests);
          expect(getUserSyncs(syncOptions, {}, this.gdprConsent)).to.deep.equal([]);
        });
      });

      context('when iframe is enabled', function() {
        it('returns sync array equal to number of unique siteIDs', function() {
          const syncOptions = {
            iframeEnabled: true
          };
          buildRequests(this.bidRequests);
          const syncs = getUserSyncs(syncOptions, {}, this.gdprConsent);
          expect(syncs).to.deep.equal(this.syncs);
        });
      });
    });

    context('when consent data is not defined', function() {
      context('when iframe is not enabled', function() {
        it('returns empty sync array', function() {
          const syncOptions = {};
          buildRequests(this.bidRequests);
          expect(getUserSyncs(syncOptions)).to.deep.equal([]);
        });
      });

      context('when iframe is enabled', function() {
        it('returns sync array equal to number of unique siteIDs', function() {
          const syncOptions = {
            iframeEnabled: true
          };
          buildRequests(this.bidRequests);
          const syncs = getUserSyncs(syncOptions);
          expect(syncs).to.deep.equal(this.syncs);
        });
      });
    });

    context('when gdpr applies', function() {
      it('returns empty sync array', function() {
        const syncOptions = {};
        const gdprConsent = {
          gdprApplies: true
        }
        buildRequests(this.bidRequests);
        expect(getUserSyncs(syncOptions, {}, gdprConsent)).to.deep.equal([]);
      });
    })
  });
});
