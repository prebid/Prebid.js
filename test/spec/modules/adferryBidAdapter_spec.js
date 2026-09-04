import { expect } from 'chai';
// The module is TypeScript (adferryBidAdapter.ts); Prebid's build resolves
// the .js specifier to it, same as every core import.
import { spec } from 'modules/adferryBidAdapter.js';

describe('adferryBidAdapter', function () {
  const validBid = {
    bidder: 'adferry',
    bidId: 'bid123',
    adUnitCode: 'video-1',
    params: { placementId: 'adferryprebidtest1' },
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6, 7, 8],
      },
    },
  };

  const bidderRequest = {
    bidderCode: 'adferry',
    auctionId: 'auction-1',
    timeout: 1000,
    refererInfo: { page: 'https://example.com/watch', domain: 'example.com' },
    uspConsent: '1YNN',
    gppConsent: { gppString: 'GPP_STRING', applicableSections: [7] },
  };

  describe('isBidRequestValid', function () {
    it('accepts a video bid with a placementId', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('rejects a bid with no placementId', function () {
      // The placementId is the only thing tying the request to a tag. Without
      // it the server answers 400, so failing here saves a round trip and
      // gives the publisher an error they can act on.
      const bid = { ...validBid, params: {} };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('accepts a banner bid', function () {
      const bid = { ...validBid, mediaTypes: { banner: { sizes: [[300, 250]] } } };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('accepts an audio bid', function () {
      const bid = { ...validBid, mediaTypes: { audio: { mimes: ['audio/mp4'] } } };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('rejects a bid with none of video, banner or audio', function () {
      const bid = { ...validBid, mediaTypes: { native: {} } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends one request per bid', function () {
      // Not a style choice. The server caps concurrency per tag, so batching
      // would put placements in the same queue behind one another.
      const reqs = spec.buildRequests([validBid, { ...validBid, bidId: 'bid456' }], bidderRequest);
      expect(reqs).to.have.lengthOf(2);
    });

    it('puts placementId on imp[].tagid', function () {
      // This is the single field that joins Prebid to the portal. If it moves,
      // every integration silently 400s.
      const [req] = spec.buildRequests([validBid], bidderRequest);
      expect(req.data.imp[0].tagid).to.equal('adferryprebidtest1');
    });

    it('reads video params from mediaTypes.video', function () {
      const [req] = spec.buildRequests([validBid], bidderRequest);
      expect(req.data.imp[0].video.w).to.equal(640);
      expect(req.data.imp[0].video.h).to.equal(480);
      expect(req.data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
    });

    it('builds a banner imp with every size in format', function () {
      const bid = { ...validBid, mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } } };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(req.data.imp[0].video).to.equal(undefined);
    });

    it('builds an audio imp from mediaTypes.audio', function () {
      const bid = { ...validBid, mediaTypes: { audio: { mimes: ['audio/mp4'], protocols: [9, 10] } } };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].audio.mimes).to.deep.equal(['audio/mp4']);
      expect(req.data.imp[0].video).to.equal(undefined);
      expect(req.data.imp[0].banner).to.equal(undefined);
    });

    it('falls back to the bidFloor param when the floors module is absent', function () {
      const bid = { ...validBid, params: { placementId: 'adferryprebidtest1', bidFloor: 2.5 } };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].bidfloor).to.equal(2.5);
      expect(req.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('mirrors US privacy signals into the oRTB 2.6 core regs fields', function () {
      // The server binds regs.us_privacy / regs.gpp / regs.gpp_sid (2.6
      // core), not only the 2.5-era regs.ext.* the consent modules write.
      const [req] = spec.buildRequests([validBid], bidderRequest);
      expect(req.data.regs.us_privacy).to.equal('1YNN');
      expect(req.data.regs.gpp).to.equal('GPP_STRING');
      expect(req.data.regs.gpp_sid).to.deep.equal([7]);
    });

    it('forwards first-party data and coppa through ortb2', function () {
      const withOrtb2 = {
        ...bidderRequest,
        ortb2: { site: { cat: ['IAB1'] }, regs: { coppa: 1 } },
      };
      const [req] = spec.buildRequests([validBid], withOrtb2);
      expect(req.data.site.cat).to.deep.equal(['IAB1']);
      expect(req.data.regs.coppa).to.equal(1);
    });

    it('mirrors the ortb2 schain to the oRTB 2.6 core source.schain', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'example.com', sid: 'pub-1', hp: 1 }],
      };
      const withSchain = {
        ...bidderRequest,
        ortb2: { source: { ext: { schain } } },
      };
      const [req] = spec.buildRequests([validBid], withSchain);
      expect(req.data.source.schain).to.deep.equal(schain);
    });

    it('mirrors a legacy per-bid schain too', function () {
      const schain = { ver: '1.0', complete: 1, nodes: [] };
      const [req] = spec.buildRequests([{ ...validBid, schain }], bidderRequest);
      expect(req.data.source.schain).to.deep.equal(schain);
    });
  });

  describe('interpretResponse', function () {
    function respond(request, bid) {
      return {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            seat: 'af_1a2b3c4d',
            bid: [{ impid: request.data.imp[0].id, ...bid }],
          }],
        },
      };
    }

    it('maps a video bid', function () {
      const [req] = spec.buildRequests([validBid], bidderRequest);
      const [bid] = spec.interpretResponse(respond(req, {
        price: 4.5,
        adm: '<VAST version="4.2"></VAST>',
        crid: 'af_1a2b3c4d',
        w: 640,
        h: 480,
        mtype: 2,
        adomain: ['brand.com'],
      }), req);
      expect(bid.cpm).to.equal(4.5);
      expect(bid.currency).to.equal('USD');
      expect(bid.vastXml).to.contain('VAST');
      expect(bid.mediaType).to.equal('video');
      expect(bid.creativeId).to.equal('af_1a2b3c4d');
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand.com']);
    });

    it('maps a banner bid', function () {
      const bannerBid = { ...validBid, mediaTypes: { banner: { sizes: [[300, 250]] } } };
      const [req] = spec.buildRequests([bannerBid], bidderRequest);
      const [bid] = spec.interpretResponse(respond(req, {
        price: 1.2,
        adm: '<div>ad</div>',
        crid: 'af_1a2b3c4d',
        w: 300,
        h: 250,
        mtype: 1,
        adomain: ['brand.com'],
      }), req);
      expect(bid.mediaType).to.equal('banner');
      expect(bid.ad).to.contain('<div>');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
    });

    it('maps an audio bid', function () {
      const audioBid = { ...validBid, mediaTypes: { audio: { mimes: ['audio/mp4'] } } };
      const [req] = spec.buildRequests([audioBid], bidderRequest);
      const [bid] = spec.interpretResponse(respond(req, {
        price: 2.2,
        adm: '<VAST version="4.2"></VAST>',
        crid: 'af_1a2b3c4d',
        mtype: 3,
        adomain: ['brand.com'],
      }), req);
      expect(bid.mediaType).to.equal('audio');
      expect(bid.vastXml).to.contain('VAST');
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand.com']);
    });

    it('sniffs VAST markup when mtype is missing', function () {
      // Pre-2.6 responses say what they are through the markup itself.
      const [req] = spec.buildRequests([validBid], bidderRequest);
      const [bid] = spec.interpretResponse(respond(req, {
        price: 3.0,
        adm: '<VAST version="3.0"></VAST>',
        crid: 'af_1a2b3c4d',
      }), req);
      expect(bid.mediaType).to.equal('video');
      expect(bid.vastXml).to.contain('VAST');
    });

    it('returns nothing on a no-bid', function () {
      // A no-bid is the common case, not an error. Returning [] rather than
      // throwing keeps one empty seatbid from taking down the whole auction.
      const [req] = spec.buildRequests([validBid], bidderRequest);
      expect(spec.interpretResponse({ body: { seatbid: [] } }, req)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, req)).to.deep.equal([]);
      expect(spec.interpretResponse({}, req)).to.deep.equal([]);
    });
  });
});
