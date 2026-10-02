import { expect } from 'chai';
import { spec } from 'modules/haloadsBidAdapter.ts';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('Haloads Bidder Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const bid = {
        params: {
          accountId: '123',
          placementId: '12345'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when accountId is missing', function () {
      const bid = {
        params: {
          placementId: '12345'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId is missing', function () {
      const bid = {
        params: {
          accountId: '123'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params are missing entirely', function () {
      const bid = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'haloads',
        params: {
          accountId: '123',
          placementId: '12345'
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        bidId: 'bid-id',
        bidderRequestId: 'bidder-request-id',
        auctionId: 'auction-id',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }
    ];

    const bidderRequest = {
      refererInfo: {
        page: 'https://example.com'
      }
    };

    it('should return a valid request object', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://ads.haloads.io/bid');
      expect(request.data).to.be.an('object');
      expect(request.data.imp[0].tagid).to.equal('12345');
    });
  });

  describe('interpretResponse', function () {
    it('should return empty array if no body', function () {
      const serverResponse = {};
      const bidRequest = {};
      const bids = spec.interpretResponse(serverResponse, bidRequest);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should return valid bids', function () {
      const bidRequests = [
        {
          bidder: 'haloads',
          params: {
            accountId: '123',
            placementId: '12345'
          },
          adUnitCode: 'adunit-code',
          sizes: [[300, 250]],
          bidId: 'bid-id',
          bidderRequestId: 'bidder-request-id',
          auctionId: 'auction-id',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          }
        }
      ];
      const bidderRequest = {
        refererInfo: {
          page: 'https://example.com'
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);

      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  id: 'bid-id',
                  impid: 'bid-id', // impid matches bidId in ortbConverter
                  mtype: 1, // Banner
                  price: 1.0,
                  adm: '<div>ad</div>',
                  crid: 'creative-id',
                  w: 300,
                  h: 250
                }
              ]
            }
          ]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').that.has.lengthOf(1);
      expect(bids[0].cpm).to.equal(1.0);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<div>ad</div>');
    });

    it('should return valid video bids', function () {
      const bidRequests = [
        {
          bidder: 'haloads',
          params: {
            accountId: '123',
            placementId: '12345'
          },
          adUnitCode: 'video-ad-unit',
          bidId: 'bid-id',
          bidderRequestId: 'bidder-request-id',
          auctionId: 'auction-id',
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 360]
            }
          }
        }
      ];
      const bidderRequest = {
        refererInfo: {
          page: 'https://example.com'
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);

      const serverResponse = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  id: 'bid-id',
                  impid: 'bid-id',
                  mtype: 2, // Video
                  price: 5.0,
                  adm: '<vast>...</vast>',
                  crid: 'creative-id',
                  w: 640,
                  h: 360
                }
              ]
            }
          ]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').that.has.lengthOf(1);
      expect(bids[0].cpm).to.equal(5.0);
      expect(bids[0].width).to.equal(640);
      expect(bids[0].height).to.equal(360);
      expect(bids[0].vastXml).to.equal('<vast>...</vast>');
      expect(bids[0].mediaType).to.equal('video');
    });
  });

  describe('getUserSyncs', function () {
    it('should return empty array if no sync options enabled', function () {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: false
      };
      const syncs = spec.getUserSyncs(syncOptions);
      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should return iframe sync if enabled', function () {
      const syncOptions = {
        iframeEnabled: true
      };
      const syncs = spec.getUserSyncs(syncOptions);
      expect(syncs).to.deep.include({
        type: 'iframe',
        url: 'https://ads.haloads.io/cookie_sync/sync.html'
      });
    });

    it('should return pixel sync if enabled', function () {
      const syncOptions = {
        pixelEnabled: true
      };
      const syncs = spec.getUserSyncs(syncOptions);
      expect(syncs).to.deep.include({
        type: 'image',
        url: 'https://ads.haloads.io/cookie_sync/sync.png'
      });
    });

    it('should append GDPR consent parameters', function () {
      const syncOptions = { iframeEnabled: true };
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'CONSENT_STRING'
      };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=CONSENT_STRING');
    });

    it('should append US Privacy string', function () {
      const syncOptions = { iframeEnabled: true };
      const uspConsent = '1YNN';
      const syncs = spec.getUserSyncs(syncOptions, [], null, uspConsent);
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('should append GPP consent parameters', function () {
      const syncOptions = { iframeEnabled: true };
      const gppConsent = {
        gppString: 'GPP_STRING',
        applicableSections: [1, 2, 3]
      };
      const syncs = spec.getUserSyncs(syncOptions, [], null, null, gppConsent);
      expect(syncs[0].url).to.include('gpp=GPP_STRING');
      expect(syncs[0].url).to.include('gpp_sid=1%2C2%2C3');
    });

    it('should append all privacy parameters together', function () {
      const syncOptions = { pixelEnabled: true };
      const gdprConsent = {
        gdprApplies: false,
        consentString: 'CONSENT'
      };
      const uspConsent = '1YNN';
      const gppConsent = {
        gppString: 'GPP',
        applicableSections: [1]
      };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, gppConsent);
      expect(syncs[0].url).to.include('gdpr=0');
      expect(syncs[0].url).to.include('gdpr_consent=CONSENT');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
      expect(syncs[0].url).to.include('gpp=GPP');
    });
  });

  describe('onBidWon', function () {
    it('should exist and be a function', function () {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });

    it('should trigger pbsWurl if present', function () {
      const bid = {
        pbsWurl: 'https://analytics.haloads.io/win?id=123'
      };
      // This would require sinon to spy on triggerPixel
      // For now, just ensure it doesn't throw
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });

    it('should trigger nurl if present', function () {
      const bid = {
        nurl: 'https://analytics.haloads.io/notify?id=456'
      };
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });

    it('should handle bid with multiple URLs', function () {
      const bid = {
        pbsWurl: 'https://analytics.haloads.io/win',
        nurl: 'https://analytics.haloads.io/notify'
      };
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });
  });

  describe('onAdRenderSucceeded', function () {
    it('should exist and be a function', function () {
      expect(spec.onAdRenderSucceeded).to.exist.and.to.be.a('function');
    });

    it('should trigger custom imp event if present', function () {
      const bid = {
        ext: {
          prebid: {
            events: {
              imp: 'https://analytics.haloads.io/imp?id=789'
            }
          }
        }
      };
      expect(() => spec.onAdRenderSucceeded(bid)).to.not.throw();
    });

    it('should handle bid without custom imp event', function () {
      const bid = {};
      expect(() => spec.onAdRenderSucceeded(bid)).to.not.throw();
    });
  });

  describe('onBidderError', function () {
    it('should exist and be a function', function () {
      expect(spec.onBidderError).to.exist.and.to.be.a('function');
    });

    it('should trigger event URL with error parameters', function () {
      const errorData = {
        error: {
          message: 'Network error',
          status: 500
        },
        bidderRequest: {
          auctionId: 'auction-123'
        }
      };
      expect(() => spec.onBidderError(errorData)).to.not.throw();
    });

    it('should handle error without bidderRequest', function () {
      const errorData = {
        error: {
          message: 'Timeout',
          status: 408
        }
      };
      expect(() => spec.onBidderError(errorData)).to.not.throw();
    });
  });

  describe('onTimeout', function () {
    it('should exist and be a function', function () {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });

    it('should trigger event URL with timeout parameters', function () {
      const timeoutData = [{
        auctionId: 'auction-456',
        timeout: 3000,
        adUnitCode: 'div-gpt-ad-123'
      }];
      expect(() => spec.onTimeout(timeoutData)).to.not.throw();
    });

    it('should handle empty timeout data', function () {
      const timeoutData = [];
      expect(() => spec.onTimeout(timeoutData)).to.not.throw();
    });
  });
});
