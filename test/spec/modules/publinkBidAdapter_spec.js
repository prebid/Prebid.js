import { expect } from 'chai';
// The module is TypeScript (publinkBidAdapter.ts); Prebid's build resolves
// the .js specifier to it, same as every core import.
import { spec } from 'modules/publinkBidAdapter.js';
import 'modules/priceFloors.js';

describe('publinkBidAdapter', function () {
  const validBid = {
    bidder: 'publink',
    bidId: 'bid123',
    adUnitCode: 'video-1',
    params: { placementId: 'publink-prebid-fixture' },
    mediaTypes: {
      banner: { sizes: [[300, 250]] },
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6, 7, 8],
      },
    },
  };

  const bidderRequest = {
    bidderCode: 'publink',
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

  describe('parameter boundaries', function () {
    [undefined, null, {}, { params: null }].forEach(bid => {
      it(`rejects missing bid/params: ${JSON.stringify(bid)}`, function () {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });
    ['', '   ', 123, {}, [], true].forEach(placementId => {
      it(`rejects invalid placement: ${JSON.stringify(placementId)}`, function () {
        expect(spec.isBidRequestValid({ ...validBid, params: { placementId } })).to.equal(false);
      });
    });
    [-1, NaN, Infinity, '2'].forEach(bidFloor => {
      it(`rejects invalid floor: ${bidFloor}`, function () {
        expect(spec.isBidRequestValid({ ...validBid, params: { placementId: 'tag', bidFloor } })).to.equal(false);
      });
    });
    it('accepts a zero floor and rejects unsupported currency', function () {
      expect(spec.isBidRequestValid({ ...validBid, params: { placementId: 'tag', bidFloor: 0, currency: 'USD' } })).to.equal(true);
      expect(spec.isBidRequestValid({ ...validBid, params: { placementId: 'tag', currency: 'EUR' } })).to.equal(false);
    });
    it('accepts the standard tagid without bidder params', function () {
      const bid = { ...validBid, params: undefined, ortb2Imp: { tagid: 'standard-tag' } };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].tagid).to.equal('standard-tag');
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
      expect(req.data.imp[0].tagid).to.equal('publink-prebid-fixture');
    });

    // The converter only builds imp.video when the VIDEO feature is compiled
    // in; CI's all-features-disabled variant omits it.
    if (FEATURES.VIDEO) {
      it('reads video params from mediaTypes.video', function () {
        const [req] = spec.buildRequests([validBid], bidderRequest);
        expect(req.data.imp[0].video.w).to.equal(640);
        expect(req.data.imp[0].video.h).to.equal(480);
        expect(req.data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
      });
    }

    it('builds a banner imp with every size in format', function () {
      const bid = { ...validBid, mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } } };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(req.data.imp[0].video).to.equal(undefined);
    });

    if (FEATURES.AUDIO) {
      it('builds an audio imp from mediaTypes.audio', function () {
        const bid = { ...validBid, mediaTypes: { audio: { mimes: ['audio/mp4'], protocols: [9, 10] } } };
        const [req] = spec.buildRequests([bid], bidderRequest);
        expect(req.data.imp[0].audio.mimes).to.deep.equal(['audio/mp4']);
        expect(req.data.imp[0].video).to.equal(undefined);
        expect(req.data.imp[0].banner).to.equal(undefined);
      });
    }

    it('falls back to the bidFloor param when the floors module is absent', function () {
      const bid = { ...validBid, params: { placementId: 'publink-prebid-fixture', bidFloor: 2.5 } };
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

  describe('request isolation and standard data', function () {
    it('uses fixed HTTPS and simple credentialless POSTs', function () {
      const [req] = spec.buildRequests([validBid], bidderRequest);
      expect(req.url).to.equal('https://ortb.publink.io/api/ortb/prebid');
      expect(req.method).to.equal('POST');
      expect(req.options).to.deep.equal({ withCredentials: false });
      expect(req.data.cur).to.deep.equal(['USD']);
    });
    it('preserves standard floors and placement overrides without mutating inputs', function () {
      const bid = { ...validBid, params: { placementId: 'override', bidFloor: 5 }, ortb2Imp: { tagid: 'original', bidfloor: 0, bidfloorcur: 'USD', ext: { tid: 'publisher-tid' } } };
      const before = JSON.stringify(bid);
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].tagid).to.equal('override');
      expect(req.data.imp[0].bidfloor).to.equal(0);
      expect(req.data.imp[0].ext.tid).to.equal('publisher-tid');
      expect(JSON.stringify(bid)).to.equal(before);
    });
    it('uses the floors module ahead of bidder fallback', function () {
      const getFloor = sinon.stub().returns({ floor: 3.5, currency: 'USD' });
      const bid = { ...validBid, params: { placementId: 'tag', bidFloor: 1 }, getFloor };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(getFloor.called).to.equal(true);
      expect(req.data.imp[0].bidfloor).to.equal(3.5);
      expect(req.data.imp[0].bidfloorcur).to.equal('USD');
    });
    it('falls back safely when getFloor throws', function () {
      const bid = { ...validBid, params: { placementId: 'tag', bidFloor: 1 }, getFloor: () => { throw new Error('unavailable'); } };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].bidfloor).to.equal(1);
    });
    it('preserves existing core privacy, schain, FPD and auction tid', function () {
      const ortb2 = { source: { tid: 'auction-tid', schain: { ver: '1.0', complete: 1, nodes: [] } }, regs: { coppa: 1, us_privacy: '1NNN', gpp: 'original', gpp_sid: [8, 9] }, user: { ext: { eids: [{ source: 'example.com', uids: [{ id: 'id-1', atype: 1 }] }] } }, site: { publisher: { id: 'publisher' } } };
      const original = JSON.stringify(ortb2);
      const [req] = spec.buildRequests([validBid], { ...bidderRequest, ortb2 });
      expect(req.data.regs).to.deep.equal(ortb2.regs);
      expect(req.data.source).to.deep.equal(ortb2.source);
      expect(req.data.user).to.deep.equal(ortb2.user);
      expect(req.data.site.publisher.id).to.equal('publisher');
      expect(JSON.stringify(ortb2)).to.equal(original);
    });
    it('mirrors legacy USP and forwards all GPP section IDs', function () {
      const [req] = spec.buildRequests([validBid], { ...bidderRequest, ortb2: { regs: { ext: { us_privacy: '1NNN' } } }, gppConsent: { gppString: 'gpp', applicableSections: [7, 8, 9, 10, 11, 12] } });
      expect(req.data.regs.us_privacy).to.equal('1NNN');
      expect(req.data.regs.gpp_sid).to.deep.equal([7, 8, 9, 10, 11, 12]);
    });
    it('handles absent privacy and empty bid lists', function () {
      const [req] = spec.buildRequests([validBid], { ...bidderRequest, uspConsent: undefined, gppConsent: undefined });
      expect(req.data.regs).to.equal(undefined);
      expect(spec.buildRequests([], bidderRequest)).to.deep.equal([]);
    });
    it('does not forward unsupported native on a mixed unit', function () {
      const bid = { ...validBid, ortb2Imp: { native: { request: '{}', ver: '1.2' } } };
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.imp[0].native).to.equal(undefined);
    });
    it('keeps simultaneous auctions and placements independent', function () {
      const bid2 = { ...validBid, bidId: 'second', params: { placementId: 'second-tag' } };
      const [first] = spec.buildRequests([validBid], bidderRequest);
      const [second] = spec.buildRequests([bid2], { ...bidderRequest, ortb2: { site: { publisher: { id: 'other' } } } });
      const response = req => ({ body: { seatbid: [{ bid: [{ impid: req.data.imp[0].id, price: 1, adm: '<div/>', crid: 'c', mtype: 1 }] }] } });
      expect(spec.interpretResponse(response(second), second)[0].requestId).to.equal('second');
      expect(spec.interpretResponse(response(first), first)[0].requestId).to.equal('bid123');
      expect(first.data.imp[0].tagid).to.equal('publink-prebid-fixture');
      expect(second.data.imp[0].tagid).to.equal('second-tag');
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

    // vastXml is filled by the converter's VIDEO response processor, compiled
    // out of CI's all-features-disabled build.
    if (FEATURES.VIDEO) {
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
    }

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

    if (FEATURES.AUDIO) {
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
    }

    it('defaults the currency to USD when the response omits cur', function () {
      // oRTB's protocol default is USD; without a context currency the bid
      // would have none and bidderFactory would reject it.
      const [req] = spec.buildRequests([validBid], bidderRequest);
      const [bid] = spec.interpretResponse({
        body: {
          id: req.data.id,
          seatbid: [{ bid: [{ impid: req.data.imp[0].id, price: 4.5, adm: '<VAST/>', crid: 'c', mtype: 1 }] }],
        },
      }, req);
      expect(bid.currency).to.equal('USD');
    });

    it('keeps each bid\'s media type independent for a multiformat imp', function () {
      // ortbConverter reuses one per-impression context across bids; an audio
      // bid must not drag a sibling video bid for the same imp into audio.
      const mfBid = { ...validBid, mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'instream', playerSize: [[640, 480]] }, audio: { mimes: ['audio/mp4'] } } };
      const [req] = spec.buildRequests([mfBid], bidderRequest);
      const impid = req.data.imp[0].id;
      const bids = spec.interpretResponse({
        body: {
          id: req.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [
              { id: 'a', impid, price: 2.2, adm: '<VAST/>', crid: 'ca', mtype: 3 },
              { id: 'v', impid, price: 3.3, adm: '<VAST/>', crid: 'cv', mtype: 2 },
            ]
          }],
        },
      }, req);
      const byId = Object.fromEntries(bids.map((b) => [b.creativeId, b.mediaType]));
      if (FEATURES.AUDIO) expect(byId.ca).to.equal('audio');
      else expect(byId.ca).to.equal(undefined);
      if (FEATURES.VIDEO) expect(byId.cv).to.equal('video');
      else expect(byId.cv).to.equal(undefined);
    });

    it('filters malformed and mismatched responses while retaining valid siblings', function () {
      const [req] = spec.buildRequests([validBid], bidderRequest);
      const good = { impid: req.data.imp[0].id, price: 1.25, adm: '<div/>', crid: 'good', mtype: 1, dealid: 'deal', exp: 60 };
      const response = { body: { cur: 'USD', seatbid: [null, {}, { bid: 'bad' }, { bid: [null, { ...good, impid: 'unknown' }, { ...good, price: -1 }, { ...good, price: Infinity }, { ...good, mtype: 4 }, { ...good, adm: '' }, good] }] } };
      const bids = spec.interpretResponse(response, req);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].dealId).to.equal('deal');
      expect(bids[0].ttl).to.equal(60);
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].meta.advertiserDomains).to.deep.equal([]);
    });
    it('rejects a format absent from the requested impression', function () {
      const banner = { ...validBid, mediaTypes: { banner: { sizes: [[300, 250]] } } };
      const [req] = spec.buildRequests([banner], bidderRequest);
      expect(spec.interpretResponse(respond(req, { price: 1, adm: '<VAST/>', mtype: 2 }), req)).to.deep.equal([]);
    });
    it('handles malformed top-level responses', function () {
      const [req] = spec.buildRequests([validBid], bidderRequest);
      [undefined, null, {}, 'bad', { seatbid: {} }].forEach(body => {
        expect(spec.interpretResponse({ body }, req)).to.deep.equal([]);
      });
    });

    if (FEATURES.VIDEO || FEATURES.AUDIO) {
      it('does not expose a win-notice pixel as a VAST URL', function () {
        const format = FEATURES.VIDEO ? 'video' : 'audio';
        const mediaTypes = format === 'video' ? { video: { context: 'instream', playerSize: [[640, 360]] } } : { audio: { mimes: ['audio/mpeg'] } };
        const [req] = spec.buildRequests([{ ...validBid, mediaTypes }], bidderRequest);
        const [bid] = spec.interpretResponse(respond(req, { price: 5, adm: '<VAST version="3.0"/>', crid: 'test', mtype: format === 'video' ? 2 : 3, nurl: 'https://ortb.publink.io/notice/win' }), req);
        expect(bid.vastXml).to.contain('VAST');
        expect(bid.vastUrl).to.equal(undefined);
      });
    }

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
