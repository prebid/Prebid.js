import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/hubvisorBidAdapter.js';
import { config } from 'src/config.js';

const BIDDER_CODE = 'hubvisor';

function makeBannerBidRequest(overrides = {}) {
  return Object.assign({
    bidder: BIDDER_CODE,
    bidId: 'bid-id-banner-1',
    bidderRequestId: 'bidder-request-1',
    auctionId: 'auction-id-1',
    adUnitCode: 'div-banner',
    params: { placementId: 'test-placement-1' },
    mediaTypes: {
      banner: { sizes: [[300, 250], [728, 90]] }
    },
    sizes: [[300, 250], [728, 90]],
  }, overrides);
}

function makeVideoBidRequest(context = 'outstream', overrides = {}) {
  return Object.assign({
    bidder: BIDDER_CODE,
    bidId: 'bid-id-video-1',
    bidderRequestId: 'bidder-request-1',
    auctionId: 'auction-id-1',
    adUnitCode: 'div-video',
    params: {
      placementId: 'test-placement-2',
      video: { maxWidth: 640, targetRatio: 1.777 },
    },
    mediaTypes: {
      video: {
        context,
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6],
        playbackmethod: [2],
      }
    },
  }, overrides);
}

function makeBidderRequest(overrides = {}) {
  return Object.assign({
    bidderCode: BIDDER_CODE,
    auctionId: 'auction-id-1',
    bidderRequestId: 'bidder-request-1',
    refererInfo: { page: 'https://example.com', domain: 'example.com' },
    gdprConsent: {
      gdprApplies: true,
      consentString: 'test-consent-string',
    },
  }, overrides);
}

describe('Hubvisor Bid Adapter', () => {
  describe('spec metadata', () => {
    it('should have the correct bidder code', () => {
      expect(spec.code).to.equal(BIDDER_CODE);
    });

    it('should have gvlid 1112', () => {
      expect(spec.gvlid).to.equal(1112);
    });

    it('should support BANNER and VIDEO media types', () => {
      expect(spec.supportedMediaTypes).to.include('banner');
      expect(spec.supportedMediaTypes).to.include('video');
    });
  });

  describe('isBidRequestValid()', () => {
    it('should return true for a valid banner bid', () => {
      expect(spec.isBidRequestValid(makeBannerBidRequest())).to.be.true;
    });

    it('should return true for a bid with no placementId (it is optional)', () => {
      const bid = makeBannerBidRequest({ params: {} });
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true for a valid video bid', () => {
      expect(spec.isBidRequestValid(makeVideoBidRequest())).to.be.true;
    });
  });

  describe('buildRequests()', () => {
    let bidRequests;
    let bidderRequest;

    beforeEach(() => {
      bidRequests = [makeBannerBidRequest()];
      bidderRequest = makeBidderRequest();
    });

    it('should return an array of two requests', () => {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.be.an('array').with.length(2);
    });

    describe('sync request (first element)', () => {
      it('should be a GET request to the sync endpoint', () => {
        const [syncReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(syncReq.method).to.equal('GET');
        expect(syncReq.url).to.equal('https://relay.hubvisor.io/v1/sync/pbjs');
      });

      it('should include gdpr and placement_ids in sync request data', () => {
        const [syncReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(syncReq.data.gdpr).to.equal(true);
        expect(syncReq.data.gdpr_consent).to.equal('test-consent-string');
        expect(syncReq.data.placement_ids).to.equal('test-placement-1');
      });

      it('should not include gdpr_consent when no consent string is provided', () => {
        bidderRequest.gdprConsent = { gdprApplies: true };
        const [syncReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(syncReq.data).to.not.have.property('gdpr_consent');
      });

      it('should default gdpr to false when gdprConsent is absent', () => {
        const request = makeBidderRequest({ gdprConsent: undefined });
        const [syncReq] = spec.buildRequests(bidRequests, request);
        expect(syncReq.data.gdpr).to.equal(false);
      });

      it('should join multiple placement IDs with commas', () => {
        bidRequests = [
          makeBannerBidRequest({ bidId: 'id1', params: { placementId: 'p1' } }),
          makeBannerBidRequest({ bidId: 'id2', params: { placementId: 'p2' } }),
        ];
        const [syncReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(syncReq.data.placement_ids).to.equal('p1,p2');
      });

      it('should omit undefined placement IDs from the sync request', () => {
        bidRequests = [
          makeBannerBidRequest({ bidId: 'id1', params: {} }),
        ];
        const [syncReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(syncReq.data.placement_ids).to.equal('');
      });
    });

    describe('auction request (second element)', () => {
      it('should be a POST request to the auction endpoint', () => {
        const [, auctionReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(auctionReq.method).to.equal('POST');
        expect(auctionReq.url).to.equal('https://relay.hubvisor.io/v1/auction/pbjs');
      });

      it('should include an ORTB request body', () => {
        const [, auctionReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(auctionReq.data).to.be.an('object');
        expect(auctionReq.data.imp).to.be.an('array').with.length(1);
      });

      it('should set imp.ext.hubvisor.placementId', () => {
        const [, auctionReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(auctionReq.data.imp[0].ext.hubvisor.placementId).to.equal('test-placement-1');
      });

      it('should store bidRequestsById in internal field', () => {
        const [, auctionReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(auctionReq.internal).to.be.an('object');
        expect(auctionReq.internal.bidRequestsById).to.have.key('bid-id-banner-1');
      });

      it('should set test=1 when config test is true', () => {
        config.setConfig({ test: true });
        const [, auctionReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(auctionReq.data.test).to.equal(1);
        config.resetConfig();
      });

      it('should set test=0 when config test is not set', () => {
        config.resetConfig();
        const [, auctionReq] = spec.buildRequests(bidRequests, bidderRequest);
        expect(auctionReq.data.test).to.equal(0);
      });
    });
  });

  describe('interpretResponse()', () => {
    let bidRequests;
    let bidderRequest;
    let requests;

    beforeEach(() => {
      bidRequests = [makeBannerBidRequest()];
      bidderRequest = makeBidderRequest();
      requests = spec.buildRequests(bidRequests, bidderRequest);
    });

    it('should return empty array when internal is missing', () => {
      const response = { body: {} };
      const result = spec.interpretResponse(response, { data: {}, url: '' });
      expect(result).to.be.an('array').with.length(0);
    });

    it('should parse a banner bid response', () => {
      const [, auctionReq] = requests;
      const response = {
        body: {
          id: 'resp-1',
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'b1',
              impid: 'bid-id-banner-1',
              mtype: 1, // BANNER
              price: 2.5,
              adm: '<div>ad</div>',
              adomain: ['advertiser.com'],
              crid: 'creative-1',
              w: 300,
              h: 250,
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(response, auctionReq);
      expect(bids).to.have.length(1);
      expect(bids[0].requestId).to.equal('bid-id-banner-1');
      expect(bids[0].cpm).to.equal(2.5);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<div>ad</div>');
      expect(bids[0].currency).to.equal('USD');
    });

    if (FEATURES.VIDEO) {
      it('should attach an outstream renderer to video bids with outstream context', () => {
        const videoBid = makeVideoBidRequest('outstream');
        const videoRequests = spec.buildRequests([videoBid], bidderRequest);
        const [, auctionReq] = videoRequests;
        const response = {
          body: {
            id: 'resp-2',
            cur: 'USD',
            seatbid: [{
              bid: [{
                id: 'b2',
                impid: 'bid-id-video-1',
                mtype: 2, // VIDEO
                price: 5.0,
                adm: '<VAST version="2.0"></VAST>',
                adomain: ['video-advertiser.com'],
                crid: 'creative-video',
                w: 640,
                h: 480,
              }]
            }]
          }
        };
        const bids = spec.interpretResponse(response, auctionReq);
        expect(bids).to.have.length(1);
        expect(bids[0].renderer).to.exist;
      });

      it('should NOT attach a renderer for instream video bids', () => {
        const videoBid = makeVideoBidRequest('instream');
        videoBid.bidId = 'bid-id-instream-1';
        const videoRequests = spec.buildRequests([videoBid], bidderRequest);
        const [, auctionReq] = videoRequests;
        const response = {
          body: {
            id: 'resp-3',
            cur: 'USD',
            seatbid: [{
              bid: [{
                id: 'b3',
                impid: 'bid-id-instream-1',
                mtype: 2, // VIDEO
                price: 5.0,
                adm: '<VAST version="2.0"></VAST>',
                adomain: ['video-advertiser.com'],
                crid: 'creative-instream',
                w: 640,
                h: 480,
              }]
            }]
          }
        };
        const bids = spec.interpretResponse(response, auctionReq);
        expect(bids).to.have.length(1);
        expect(bids[0].renderer).to.not.exist;
      });
    }
  });

  describe('getUserSyncs()', () => {
    it('should return empty array when serverResponses does not have exactly 2 entries', () => {
      expect(spec.getUserSyncs({}, [])).to.eql([]);
      expect(spec.getUserSyncs({}, [{ body: {} }])).to.eql([]);
      expect(spec.getUserSyncs({}, [{ body: {} }, { body: {} }, { body: {} }])).to.eql([]);
    });

    it('should return empty array when sync response has no bidders', () => {
      const responses = [{ body: {} }, { body: {} }];
      expect(spec.getUserSyncs({}, responses)).to.eql([]);
    });

    it('should map image type syncs', () => {
      const responses = [
        { body: { bidders: [{ type: 'image', url: 'https://sync.example.com/pixel' }] } },
        { body: {} },
      ];
      const syncs = spec.getUserSyncs({}, responses);
      expect(syncs).to.eql([{ type: 'image', url: 'https://sync.example.com/pixel' }]);
    });

    it('should map redirect type syncs to image', () => {
      const responses = [
        { body: { bidders: [{ type: 'redirect', url: 'https://sync.example.com/redirect' }] } },
        { body: {} },
      ];
      const syncs = spec.getUserSyncs({}, responses);
      expect(syncs).to.eql([{ type: 'image', url: 'https://sync.example.com/redirect' }]);
    });

    it('should map iframe type syncs', () => {
      const responses = [
        { body: { bidders: [{ type: 'iframe', url: 'https://sync.example.com/iframe' }] } },
        { body: {} },
      ];
      const syncs = spec.getUserSyncs({}, responses);
      expect(syncs).to.eql([{ type: 'iframe', url: 'https://sync.example.com/iframe' }]);
    });

    it('should skip entries with unknown type or missing url', () => {
      const responses = [
        {
          body: {
            bidders: [
              { type: 'unknown', url: 'https://sync.example.com/unknown' },
              { type: 'image', url: '' },
              { type: 'image', url: 'https://sync.example.com/valid' },
            ]
          }
        },
        { body: {} },
      ];
      const syncs = spec.getUserSyncs({}, responses);
      expect(syncs).to.eql([{ type: 'image', url: 'https://sync.example.com/valid' }]);
    });

    it('should return multiple syncs from multiple bidders', () => {
      const responses = [
        {
          body: {
            bidders: [
              { type: 'image', url: 'https://sync1.example.com' },
              { type: 'iframe', url: 'https://sync2.example.com' },
            ]
          }
        },
        { body: {} },
      ];
      const syncs = spec.getUserSyncs({}, responses);
      expect(syncs).to.have.length(2);
      expect(syncs[0]).to.eql({ type: 'image', url: 'https://sync1.example.com' });
      expect(syncs[1]).to.eql({ type: 'iframe', url: 'https://sync2.example.com' });
    });
  });
});
