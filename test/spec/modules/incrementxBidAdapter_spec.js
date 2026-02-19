import { expect } from 'chai';
import { spec } from 'modules/incrementxBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

describe('incrementxBidAdapter', function () {
  const bannerBidRequest = {
    bidder: 'incrementx',
    params: { placementId: 'IX-HB-12345' },
    mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
    sizes: [[300, 250], [300, 600]],
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    bidId: '2faedf3e89d123',
    bidderRequestId: '1c78fb49cc71c6',
    auctionId: 'b4f81e8e36232',
    transactionId: '0d95b2c1-a834-4e50-a962-9b6aa0e1c8fb'
  };

  const outstreamVideoBidRequest = {
    bidder: 'incrementx',
    params: { placementId: 'IX-HB-12346' },
    mediaTypes: { video: { context: 'outstream', playerSize: [640, 480] } },
    adUnitCode: 'div-gpt-ad-1460505748561-1',
    bidId: '2faedf3e89d124',
    bidderRequestId: '1c78fb49cc71c7',
    auctionId: 'b4f81e8e36233',
    transactionId: '0d95b2c1-a834-4e50-a962-9b6aa0e1c8fc'
  };

  const instreamVideoBidRequest = {
    bidder: 'incrementx',
    params: { placementId: 'IX-HB-12347' },
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6],
        playbackmethod: [1, 2],
        skip: 1,
        skipafter: 5
      }
    },
    adUnitCode: 'div-gpt-ad-1460505748561-2',
    bidId: '2faedf3e89d125',
    bidderRequestId: '1c78fb49cc71c8',
    auctionId: 'b4f81e8e36234',
    transactionId: '0d95b2c1-a834-4e50-a962-9b6aa0e1c8fd'
  };

  const bidderRequest = {
    refererInfo: { page: 'https://example.com' }
  };

  // VALIDATION

  describe('isBidRequestValid', () => {
    it('should return true when placementId exists', () => {
      expect(spec.isBidRequestValid(bannerBidRequest)).to.equal(true);
      expect(spec.isBidRequestValid(outstreamVideoBidRequest)).to.equal(true);
      expect(spec.isBidRequestValid(instreamVideoBidRequest)).to.equal(true);
    });

    it('should return false when placementId is missing', () => {
      const invalidBid = { bidder: 'incrementx', params: {} };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when params is missing', () => {
      const invalidBid = { bidder: 'incrementx' };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  // BUILD REQUESTS TESTS (LEGACY FORMAT ONLY)

  describe('buildRequests', () => {
    it('should build a valid banner request (LEGACY FORMAT: q only)', () => {
      const reqs = spec.buildRequests([bannerBidRequest], bidderRequest);
      const data = reqs[0].data;

      expect(reqs[0].method).to.equal('POST');
      expect(reqs[0].url).to.equal('https://hb.incrementxserv.com/vzhbidder/bid');

      // Banner sends ONLY q
      expect(data.q).to.exist;
      expect(data.bidderRequestData).to.not.exist;

      const decodedQ = JSON.parse(decodeURIComponent(data.q));
      expect(decodedQ._vzPlacementId).to.equal('IX-HB-12345');
      expect(decodedQ.mChannel).to.equal(1);
      expect(decodedQ._rqsrc).to.equal('https://example.com');
      expect(decodedQ._slotBidId).to.equal('2faedf3e89d123');
      expect(decodedQ.sizes).to.be.an('array');
    });

    it('should build an outstream video request (LEGACY FORMAT: q + bidderRequestData)', () => {
      const reqs = spec.buildRequests([outstreamVideoBidRequest], bidderRequest);
      const data = reqs[0].data;

      // Video sends q + bidderRequestData ONLY
      expect(data.q).to.exist;
      expect(data.bidderRequestData).to.exist;

      const decodedQ = JSON.parse(decodeURIComponent(data.q));
      expect(decodedQ._vzPlacementId).to.equal('IX-HB-12346');
      expect(decodedQ.mChannel).to.equal(2);

      // bidderRequestData contains full bidderRequest
      const decodedBidderRequest = JSON.parse(decodeURIComponent(data.bidderRequestData));
      expect(decodedBidderRequest.refererInfo).to.exist;
      expect(decodedBidderRequest.refererInfo.page).to.equal('https://example.com');
    });

    it('should build an instream video request (LEGACY FORMAT)', () => {
      const reqs = spec.buildRequests([instreamVideoBidRequest], bidderRequest);
      const data = reqs[0].data;

      expect(data.q).to.exist;
      expect(data.bidderRequestData).to.exist;

      const decodedQ = JSON.parse(decodeURIComponent(data.q));
      expect(decodedQ.mChannel).to.equal(2);
      expect(decodedQ._vzPlacementId).to.equal('IX-HB-12347');
    });

    it('should handle multiple bid requests', () => {
      const reqs = spec.buildRequests([bannerBidRequest, outstreamVideoBidRequest], bidderRequest);
      expect(reqs).to.have.lengthOf(2);
      expect(reqs[0].data.q).to.exist;
      expect(reqs[1].data.q).to.exist;
    });

    it('should use params.size if available', () => {
      const bidWithParamsSize = {
        ...bannerBidRequest,
        params: { placementId: 'IX-HB-12345', size: [[728, 90]] }
      };
      const reqs = spec.buildRequests([bidWithParamsSize], bidderRequest);
      const decodedQ = JSON.parse(decodeURIComponent(reqs[0].data.q));
      expect(decodedQ.sizes).to.be.an('array');
    });
  });

  // INTERPRET RESPONSE - BANNER

  describe('interpretResponse - banner', () => {
    const bannerResponse = {
      body: {
        slotBidId: '2faedf3e89d123',
        ad: '<div>BANNER</div>',
        cpm: 1.5,
        mediaType: BANNER,
        adWidth: 300,
        adHeight: 250,
        currency: 'USD',
        netRevenue: true,
        creativeId: 'CR123',
        adType: '1',
        settings: { test: 'value' },
        advertiserDomains: ['example.com']
      }
    };

    it('should parse banner response correctly', () => {
      const req = { data: { q: 'dummy' } };
      const result = spec.interpretResponse(bannerResponse, req);

      expect(result).to.have.lengthOf(1);
      const bid = result[0];
      expect(bid.requestId).to.equal('2faedf3e89d123');
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.ad).to.equal('<div>BANNER</div>');
      expect(bid.cpm).to.equal(1.5);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.creativeId).to.equal('CR123');
      expect(bid.ttl).to.equal(300);
      expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should handle banner with missing ad content', () => {
      const responseNoAd = {
        body: {
          slotBidId: '2faedf3e89d123',
          cpm: 1.5,
          mediaType: BANNER,
          adWidth: 300,
          adHeight: 250
        }
      };
      const req = { data: { q: 'dummy' } };
      const result = spec.interpretResponse(responseNoAd, req);
      expect(result[0].ad).to.equal('');
    });

    it('should use default currency when not provided', () => {
      const responseNoCurrency = {
        body: {
          slotBidId: '2faedf3e89d123',
          ad: '<div>BANNER</div>',
          cpm: 1.5,
          mediaType: BANNER,
          adWidth: 300,
          adHeight: 250
        }
      };
      const req = { data: { q: 'dummy' } };
      const result = spec.interpretResponse(responseNoCurrency, req);
      expect(result[0].currency).to.equal('USD');
    });

    it('should use default values for missing fields', () => {
      const minimalResponse = {
        body: {
          slotBidId: '2faedf3e89d123',
          cpm: 0,
          mediaType: BANNER
        }
      };
      const req = { data: { q: 'dummy' } };
      const result = spec.interpretResponse(minimalResponse, req);
      const bid = result[0];
      expect(bid.cpm).to.equal(0);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.adType).to.equal('1');
      expect(bid.creativeId).to.equal(0);
      expect(bid.netRevenue).to.equal(false);
      expect(bid.meta.advertiserDomains).to.deep.equal([]);
    });
  });

  // INTERPRET RESPONSE - VIDEO (with videoContext)

  describe('interpretResponse - video with videoContext', () => {
    const outstreamResponse = {
      body: {
        slotBidId: '2faedf3e89d124',
        ad: '<VAST>outstream</VAST>',
        cpm: 2,
        mediaType: VIDEO,
        adWidth: 640,
        adHeight: 480,
        rUrl: 'https://cdn/test.xml',
        netRevenue: true,
        currency: 'USD',
        advertiserDomains: ['example.com']
      }
    };

    const instreamResponse = {
      body: {
        slotBidId: '2faedf3e89d125',
        ad: '<VAST>instream</VAST>',
        cpm: 3,
        mediaType: VIDEO,
        adWidth: 640,
        adHeight: 480,
        advertiserDomains: ['example.com'],
        netRevenue: true,
        currency: 'USD',
        ttl: 300,
      }
    };

    it('should parse outstream video using videoContext field', () => {
      const req = {
        data: {
          videoContext: 'outstream',
          adUnitCode: 'ad-unit-outstream'
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      expect(res).to.have.lengthOf(1);
      expect(res[0].vastXml).to.equal('<VAST>outstream</VAST>');
      expect(res[0].renderer).to.exist;
      expect(res[0].renderer.url).to.equal('https://cdn/test.xml');
      expect(res[0].renderer.id).to.equal('2faedf3e89d124');
    });

    it('should parse instream video using videoContext field', () => {
      const req = {
        data: {
          videoContext: 'instream',
          adUnitCode: 'ad-unit-instream'
        }
      };

      const res = spec.interpretResponse(instreamResponse, req);
      expect(res).to.have.lengthOf(1);
      expect(res[0].vastUrl).to.equal('<VAST>instream</VAST>');
      expect(res[0].renderer).to.not.exist;
    });

    it('should not create renderer for outstream without rUrl', () => {
      const responseNoRUrl = {
        body: {
          slotBidId: '2faedf3e89d124',
          ad: '<VAST>outstream</VAST>',
          cpm: 2,
          mediaType: VIDEO,
          adWidth: 640,
          adHeight: 480
        }
      };
      const req = {
        data: {
          videoContext: 'outstream',
          adUnitCode: 'ad-unit-outstream'
        }
      };

      const res = spec.interpretResponse(responseNoRUrl, req);
      expect(res[0].renderer).to.not.exist;
    });
  });

  // INTERPRET RESPONSE - VIDEO (legacy bidderRequestData)

  describe('interpretResponse - video with legacy bidderRequestData', () => {
    const outstreamResponse = {
      body: {
        slotBidId: '2faedf3e89d124',
        ad: '<VAST>outstream</VAST>',
        cpm: 2,
        mediaType: VIDEO,
        adWidth: 640,
        adHeight: 480,
        rUrl: 'https://cdn/test.xml',
        advertiserDomains: ['example.com']
      }
    };

    const instreamResponse = {
      body: {
        slotBidId: '2faedf3e89d125',
        ad: '<VAST>instream</VAST>',
        cpm: 3,
        mediaType: VIDEO,
        adWidth: 640,
        adHeight: 480,
        advertiserDomains: ['example.com']
      }
    };

    it('should parse outstream video from bidderRequestData', () => {
      const req = {
        data: {
          bidderRequestData: encodeURIComponent(JSON.stringify({
            bids: [{
              bidId: '2faedf3e89d124',
              adUnitCode: 'ad-unit-outstream',
              mediaTypes: { video: { context: 'outstream' } }
            }]
          }))
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      expect(res[0].vastXml).to.equal('<VAST>outstream</VAST>');
      expect(res[0].renderer).to.exist;
    });

    it('should parse instream video from bidderRequestData', () => {
      const req = {
        data: {
          bidderRequestData: encodeURIComponent(JSON.stringify({
            bids: [{
              bidId: '2faedf3e89d125',
              adUnitCode: 'ad-unit-instream',
              mediaTypes: { video: { context: 'instream' } }
            }]
          }))
        }
      };

      const res = spec.interpretResponse(instreamResponse, req);
      expect(res[0].vastUrl).to.equal('<VAST>instream</VAST>');
      expect(res[0].renderer).to.not.exist;
    });

    it('should handle bidderRequestData as object (not string)', () => {
      const req = {
        data: {
          bidderRequestData: {
            bids: [{
              bidId: '2faedf3e89d125',
              adUnitCode: 'ad-unit-instream',
              mediaTypes: { video: { context: 'instream' } }
            }]
          }
        }
      };

      const res = spec.interpretResponse(instreamResponse, req);
      expect(res[0].vastUrl).to.equal('<VAST>instream</VAST>');
    });

    it('should handle invalid JSON in bidderRequestData', () => {
      const req = {
        data: {
          bidderRequestData: 'invalid-json'
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      expect(res).to.have.lengthOf(1);
      // Should not crash, context will be undefined
    });

    it('should handle bidderRequestData without bids array', () => {
      const req = {
        data: {
          bidderRequestData: encodeURIComponent(JSON.stringify({ refererInfo: {} }))
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      expect(res).to.have.lengthOf(1);
    });

    it('should handle empty bids array in bidderRequestData', () => {
      const req = {
        data: {
          bidderRequestData: encodeURIComponent(JSON.stringify({ bids: [] }))
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      expect(res).to.have.lengthOf(1);
    });

    it('should find correct bid when multiple bids in bidderRequestData', () => {
      const req = {
        data: {
          bidderRequestData: encodeURIComponent(JSON.stringify({
            bids: [
              {
                bidId: 'OTHER_BID',
                adUnitCode: 'other-unit',
                mediaTypes: { video: { context: 'outstream' } }
              },
              {
                bidId: '2faedf3e89d124',
                adUnitCode: 'ad-unit-outstream',
                mediaTypes: { video: { context: 'outstream' } }
              }
            ]
          }))
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      expect(res[0].vastXml).to.equal('<VAST>outstream</VAST>');
      expect(res[0].renderer).to.exist;
    });

    it('should handle missing mediaTypes in bid', () => {
      const req = {
        data: {
          bidderRequestData: encodeURIComponent(JSON.stringify({
            bids: [{
              bidId: '2faedf3e89d124',
              adUnitCode: 'ad-unit-outstream'
            }]
          }))
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      expect(res).to.have.lengthOf(1);
      // Should not crash, context will be undefined
    });
  });

  // INTERPRET RESPONSE - EDGE CASES

  describe('interpretResponse - edge cases', () => {
    it('should return empty array when serverResponse.body is empty object', () => {
      const res = spec.interpretResponse({ body: {} }, { data: {} });
      expect(res).to.have.lengthOf(0);
    });

    it('should return empty array when serverResponse.body is null', () => {
      const res = spec.interpretResponse({ body: null }, { data: {} });
      expect(res).to.have.lengthOf(0);
    });

    it('should return empty array when serverResponse.body is undefined', () => {
      const res = spec.interpretResponse({ body: undefined }, { data: {} });
      expect(res).to.have.lengthOf(0);
    });

    it('should handle request without data object', () => {
      const bannerResponse = {
        body: {
          slotBidId: '2faedf3e89d123',
          ad: '<div>BANNER</div>',
          cpm: 1,
          mediaType: BANNER
        }
      };
      const res = spec.interpretResponse(bannerResponse, {});
      expect(res).to.have.lengthOf(1);
    });

    it('should handle video response without context (neither videoContext nor bidderRequestData)', () => {
      const videoResponse = {
        body: {
          slotBidId: 'BID_VIDEO',
          ad: '<VAST>video</VAST>',
          cpm: 2,
          mediaType: VIDEO,
          adWidth: 640,
          adHeight: 480
        }
      };
      const req = { data: {} };
      const res = spec.interpretResponse(videoResponse, req);
      expect(res).to.have.lengthOf(1);
      // Neither vastUrl nor vastXml should be set
      expect(res[0].vastUrl).to.not.exist;
      expect(res[0].vastXml).to.not.exist;
    });

    it('should handle negative cpm', () => {
      const responseNegativeCpm = {
        body: {
          slotBidId: '2faedf3e89d123',
          ad: '<div>BANNER</div>',
          cpm: -1,
          mediaType: BANNER
        }
      };
      const req = { data: { q: 'dummy' } };
      const result = spec.interpretResponse(responseNegativeCpm, req);
      expect(result[0].cpm).to.equal(0);
    });
  });

  // RENDERER TESTS

  describe('renderer functionality', () => {
    it('should create renderer with correct configuration', () => {
      const outstreamResponse = {
        body: {
          slotBidId: '2faedf3e89d124',
          ad: '<VAST>outstream</VAST>',
          cpm: 2,
          mediaType: VIDEO,
          adWidth: 640,
          adHeight: 480,
          rUrl: 'https://cdn/renderer.js',
          advertiserDomains: ['example.com']
        }
      };

      const req = {
        data: {
          videoContext: 'outstream',
          adUnitCode: 'ad-unit-outstream'
        }
      };

      const res = spec.interpretResponse(outstreamResponse, req);
      const renderer = res[0].renderer;

      expect(renderer).to.exist;
      expect(renderer.url).to.equal('https://cdn/renderer.js');
      expect(renderer.id).to.equal('2faedf3e89d124');
      expect(typeof renderer.setRender).to.equal('function');
    });

    it('should execute renderer callback when onetag is available', () => {
      const outstreamResponse = {
        body: {
          slotBidId: '2faedf3e89d124',
          ad: '<VAST>outstream</VAST>',
          cpm: 2,
          mediaType: VIDEO,
          adWidth: 640,
          adHeight: 480,
          rUrl: 'https://cdn/test.xml',
          advertiserDomains: ['example.com']
        }
      };

      const req = {
        data: {
          videoContext: 'outstream',
          adUnitCode: 'ad-unit-outstream'
        }
      };

      const originalOnetag = window.onetag;
      let playerInitCalled = false;

      window.onetag = {
        Player: {
          init: function (config) {
            playerInitCalled = true;
            expect(config).to.exist;
            expect(config.width).to.exist;
            expect(config.height).to.exist;
            expect(config.vastXml).to.exist;
            expect(config.nodeId).to.exist;
          }
        }
      };

      try {
        const res = spec.interpretResponse(outstreamResponse, req);
        const renderer = res[0].renderer;

        renderer.loaded = true;
        const renderFn = renderer._render;
        expect(renderFn).to.exist;

        renderFn.call(renderer, {
          renderer: renderer,
          width: 640,
          height: 480,
          vastXml: '<VAST>outstream</VAST>',
          adUnitCode: 'ad-unit-outstream'
        });

        expect(playerInitCalled).to.equal(true);
      } finally {
        if (originalOnetag) {
          window.onetag = originalOnetag;
        } else {
          delete window.onetag;
        }
      }
    });

    it('should handle renderer setRender errors gracefully', () => {
      // This tests the try-catch block in createRenderer
      const outstreamResponse = {
        body: {
          slotBidId: '2faedf3e89d124',
          ad: '<VAST>outstream</VAST>',
          cpm: 2,
          mediaType: VIDEO,
          adWidth: 640,
          adHeight: 480,
          rUrl: 'https://cdn/test.xml',
          advertiserDomains: ['example.com']
        }
      };

      const req = {
        data: {
          videoContext: 'outstream',
          adUnitCode: 'ad-unit-outstream'
        }
      };

      // Should not throw even if setRender fails
      expect(() => {
        spec.interpretResponse(outstreamResponse, req);
      }).to.not.throw();
    });
  });
});
