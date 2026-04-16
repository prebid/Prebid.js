import { expect } from 'chai';
import { spec } from 'modules/tne_catalystBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';

const ENDPOINT = 'https://ads.thenexusengine.com/openrtb2/auction';
const SYNC_URL = 'https://ads.thenexusengine.com/cookie_sync';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBidRequest(overrides = {}) {
  return Object.assign({
    bidder: 'tne_catalyst',
    bidId: 'bid-001',
    auctionId: 'auction-001',
    transactionId: 'txn-001',
    params: {
      publisherId: 'NXS003',
      slot: 'billboard',
    },
    mediaTypes: {
      banner: { sizes: [[970, 250], [728, 90]] }
    },
    sizes: [[970, 250], [728, 90]],
  }, overrides);
}

function makeBidderRequest(overrides = {}) {
  return Object.assign({
    bidderCode: 'tne_catalyst',
    auctionId: 'auction-001',
    timeout: 1500,
    refererInfo: {
      page: 'https://gotsoccer.com/tournaments',
      domain: 'gotsoccer.com',
      ref: 'https://google.com',
    },
  }, overrides);
}

function makeServerResponse(bids = []) {
  return {
    body: {
      id: 'response-001',
      cur: 'USD',
      seatbid: bids.length > 0 ? [{
        seat: 'rubicon',
        bid: bids,
      }] : [],
    }
  };
}

function makeBid(overrides = {}) {
  return Object.assign({
    id: 'bid-id-001',
    impid: 'bid-001',
    price: 3.50,
    adm: '<div>ad creative</div>',
    crid: 'creative-001',
    w: 970,
    h: 250,
    adomain: ['advertiser.com'],
    dealid: '',
  }, overrides);
}

function makeVideoBidRequest(overrides = {}) {
  return Object.assign({
    bidder: 'tne_catalyst',
    bidId: 'bid-video-001',
    auctionId: 'auction-001',
    transactionId: 'txn-001',
    params: {
      publisherId: 'NXS003',
      slot: 'preroll',
    },
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30,
        startdelay: 0,
        placement: 1,
        linearity: 1,
      }
    },
  }, overrides);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TNE Catalyst Bid Adapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.be.a('function');
    });
  });

  // -------------------------------------------------------------------------
  // isBidRequestValid
  // -------------------------------------------------------------------------
  describe('isBidRequestValid', () => {
    it('returns true for a valid bid', () => {
      expect(spec.isBidRequestValid(makeBidRequest())).to.equal(true);
    });

    it('returns false when params is missing', () => {
      const bid = makeBidRequest();
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when publisherId is missing', () => {
      const bid = makeBidRequest({ params: { slot: 'billboard' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when publisherId is empty string', () => {
      const bid = makeBidRequest({ params: { publisherId: '', slot: 'billboard' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when slot is missing', () => {
      const bid = makeBidRequest({ params: { publisherId: 'NXS003' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when slot is empty string', () => {
      const bid = makeBidRequest({ params: { publisherId: 'NXS003', slot: '' } });
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false for a null bid', () => {
      expect(spec.isBidRequestValid(null)).to.equal(false);
    });

    it('returns false for an undefined bid', () => {
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests
  // -------------------------------------------------------------------------
  describe('buildRequests', () => {
    it('returns empty array when given no bids', () => {
      expect(spec.buildRequests([], makeBidderRequest())).to.deep.equal([]);
    });

    it('returns a single POST request', () => {
      const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
      expect(reqs).to.have.length(1);
      expect(reqs[0].method).to.equal('POST');
      expect(reqs[0].url).to.equal(ENDPOINT);
    });

    it('sets content-type to application/json', () => {
      const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
      expect(reqs[0].options.contentType).to.equal('application/json');
    });

    it('sets withCredentials to true', () => {
      const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
      expect(reqs[0].options.withCredentials).to.equal(true);
    });

    describe('impression', () => {
      it('sets imp.id from bidId', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.imp[0].id).to.equal('bid-001');
      });

      it('sets imp.ext.tne_catalyst.slot from params.slot', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.imp[0].ext.tne_catalyst.slot).to.equal('billboard');
      });

      it('builds banner format from mediaTypes.banner.sizes', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        const imp = reqs[0].data.imp[0];
        expect(imp.banner.format).to.deep.equal([{ w: 970, h: 250 }, { w: 728, h: 90 }]);
      });

      it('sets banner w/h from first size', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        const imp = reqs[0].data.imp[0];
        expect(imp.banner.w).to.equal(970);
        expect(imp.banner.h).to.equal(250);
      });

      it('includes native when mediaTypes.native is present', () => {
        const bid = makeBidRequest({
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            native: { title: { required: true } }
          }
        });
        const reqs = spec.buildRequests([bid], makeBidderRequest());
        expect(reqs[0].data.imp[0].native).to.exist;
        expect(reqs[0].data.imp[0].native.request).to.be.a('string');
      });

      it('builds video imp from mediaTypes.video', () => {
        const reqs = spec.buildRequests([makeVideoBidRequest()], makeBidderRequest());
        const imp = reqs[0].data.imp[0];
        expect(imp.video).to.exist;
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3, 5, 6]);
        expect(imp.video.w).to.equal(640);
        expect(imp.video.h).to.equal(480);
        expect(imp.video.minduration).to.equal(5);
        expect(imp.video.maxduration).to.equal(30);
        expect(imp.video.startdelay).to.equal(0);
        expect(imp.video.placement).to.equal(1);
        expect(imp.video.linearity).to.equal(1);
      });

      it('defaults mimes and protocols when omitted from mediaTypes.video', () => {
        const bid = makeVideoBidRequest({
          mediaTypes: { video: { playerSize: [[640, 480]] } }
        });
        const reqs = spec.buildRequests([bid], makeBidderRequest());
        const imp = reqs[0].data.imp[0];
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3, 5, 6]);
      });

      it('sets bidfloor when provided in params', () => {
        const bid = makeBidRequest({ params: { publisherId: 'NXS003', slot: 'billboard', bidfloor: 1.50 } });
        const reqs = spec.buildRequests([bid], makeBidderRequest());
        expect(reqs[0].data.imp[0].bidfloor).to.equal(1.50);
        expect(reqs[0].data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('omits bidfloor when not in params', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.imp[0].bidfloor).to.be.undefined;
      });
    });

    describe('multiple impressions', () => {
      it('creates one imp per bid request', () => {
        const bids = [
          makeBidRequest({ bidId: 'bid-001', params: { publisherId: 'NXS003', slot: 'billboard' } }),
          makeBidRequest({ bidId: 'bid-002', params: { publisherId: 'NXS003', slot: 'rectangle' } }),
        ];
        const reqs = spec.buildRequests(bids, makeBidderRequest());
        expect(reqs[0].data.imp).to.have.length(2);
        expect(reqs[0].data.imp[0].id).to.equal('bid-001');
        expect(reqs[0].data.imp[1].id).to.equal('bid-002');
      });
    });

    describe('site', () => {
      it('sets site.publisher.id from publisherId param', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.site.publisher.id).to.equal('NXS003');
      });

      it('sets site.page from refererInfo.page', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.site.page).to.equal('https://gotsoccer.com/tournaments');
      });

      it('sets site.domain from refererInfo.domain', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.site.domain).to.equal('gotsoccer.com');
      });

      it('sets site.ref from refererInfo.ref', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.site.ref).to.equal('https://google.com');
      });

      it('preserves publisher.id when ortb2.site is provided', () => {
        const br = makeBidderRequest({ ortb2: { site: { cat: ['IAB1'] } } });
        const reqs = spec.buildRequests([makeBidRequest()], br);
        expect(reqs[0].data.site.publisher.id).to.equal('NXS003');
        expect(reqs[0].data.site.cat).to.deep.equal(['IAB1']);
      });
    });

    describe('timeout', () => {
      it('sets tmax from bidderRequest.timeout', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest({ timeout: 2000 }));
        expect(reqs[0].data.tmax).to.equal(2000);
      });
    });

    describe('GDPR', () => {
      it('sets regs.ext.gdpr=1 when gdprApplies is true', () => {
        const br = makeBidderRequest({ gdprConsent: { gdprApplies: true, consentString: 'CONSENT_STRING' } });
        const reqs = spec.buildRequests([makeBidRequest()], br);
        expect(reqs[0].data.regs.ext.gdpr).to.equal(1);
      });

      it('sets regs.ext.gdpr=0 when gdprApplies is false', () => {
        const br = makeBidderRequest({ gdprConsent: { gdprApplies: false, consentString: '' } });
        const reqs = spec.buildRequests([makeBidRequest()], br);
        expect(reqs[0].data.regs.ext.gdpr).to.equal(0);
      });

      it('sets user.ext.consent from consentString', () => {
        const br = makeBidderRequest({ gdprConsent: { gdprApplies: true, consentString: 'CONSENT_STRING' } });
        const reqs = spec.buildRequests([makeBidRequest()], br);
        expect(reqs[0].data.user.ext.consent).to.equal('CONSENT_STRING');
      });

      it('omits user.ext.consent when consentString is absent', () => {
        const br = makeBidderRequest({ gdprConsent: { gdprApplies: true } });
        const reqs = spec.buildRequests([makeBidRequest()], br);
        expect(reqs[0].data.user).to.be.undefined;
      });
    });

    describe('CCPA', () => {
      it('sets regs.ext.us_privacy from uspConsent', () => {
        const br = makeBidderRequest({ uspConsent: '1YNN' });
        const reqs = spec.buildRequests([makeBidRequest()], br);
        expect(reqs[0].data.regs.ext.us_privacy).to.equal('1YNN');
      });
    });

    describe('GPP', () => {
      it('sets regs.gpp and regs.gpp_sid when gppConsent is present', () => {
        const br = makeBidderRequest({ gppConsent: { gppString: 'GPP_STRING', applicableSections: [7] } });
        const reqs = spec.buildRequests([makeBidRequest()], br);
        expect(reqs[0].data.regs.gpp).to.equal('GPP_STRING');
        expect(reqs[0].data.regs.gpp_sid).to.deep.equal([7]);
      });
    });

    describe('user EIDs', () => {
      it('forwards userIdAsEids to user.eids', () => {
        const eids = [{ source: 'rubiconproject.com', uids: [{ id: 'user-123' }] }];
        const bid = makeBidRequest({ userIdAsEids: eids });
        const reqs = spec.buildRequests([bid], makeBidderRequest());
        expect(reqs[0].data.user.eids).to.deep.equal(eids);
      });

      it('omits user.eids when userIdAsEids is empty', () => {
        const bid = makeBidRequest({ userIdAsEids: [] });
        const reqs = spec.buildRequests([bid], makeBidderRequest());
        expect(reqs[0].data.user).to.be.undefined;
      });
    });

    describe('schain', () => {
      it('sets source.schain when schain is present on the bid', () => {
        const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'thenexusengine.io', sid: 'NXS003' }] };
        const bid = makeBidRequest({ schain });
        const reqs = spec.buildRequests([bid], makeBidderRequest());
        expect(reqs[0].data.source.schain).to.deep.equal(schain);
      });

      it('omits source when schain is absent', () => {
        const reqs = spec.buildRequests([makeBidRequest()], makeBidderRequest());
        expect(reqs[0].data.source).to.be.undefined;
      });
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse
  // -------------------------------------------------------------------------
  describe('interpretResponse', () => {
    it('returns an array of bid objects for a valid response', () => {
      const resp = makeServerResponse([makeBid()]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids).to.have.length(1);
    });

    it('maps requestId from bid.impid', () => {
      const resp = makeServerResponse([makeBid({ impid: 'bid-001' })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].requestId).to.equal('bid-001');
    });

    it('maps cpm from bid.price', () => {
      const resp = makeServerResponse([makeBid({ price: 4.20 })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].cpm).to.equal(4.20);
    });

    it('maps dimensions from bid.w and bid.h', () => {
      const resp = makeServerResponse([makeBid({ w: 728, h: 90 })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('maps ad creative from bid.adm', () => {
      const resp = makeServerResponse([makeBid({ adm: '<div>creative</div>' })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].ad).to.equal('<div>creative</div>');
    });

    it('maps creativeId from bid.crid', () => {
      const resp = makeServerResponse([makeBid({ crid: 'crid-abc' })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].creativeId).to.equal('crid-abc');
    });

    it('maps advertiserDomains from bid.adomain', () => {
      const resp = makeServerResponse([makeBid({ adomain: ['example.com'] })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('sets advertiserDomains to empty array when adomain is absent', () => {
      const resp = makeServerResponse([makeBid({ adomain: undefined })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].meta.advertiserDomains).to.deep.equal([]);
    });

    it('sets netRevenue to true', () => {
      const resp = makeServerResponse([makeBid()]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].netRevenue).to.equal(true);
    });

    it('sets ttl to 300', () => {
      const resp = makeServerResponse([makeBid()]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].ttl).to.equal(300);
    });

    it('uses response body currency', () => {
      const resp = makeServerResponse([makeBid()]);
      resp.body.cur = 'GBP';
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].currency).to.equal('GBP');
    });

    it('defaults currency to USD when absent', () => {
      const resp = makeServerResponse([makeBid()]);
      delete resp.body.cur;
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].currency).to.equal('USD');
    });

    it('ignores bids with price of zero', () => {
      const resp = makeServerResponse([makeBid({ price: 0 })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids).to.have.length(0);
    });

    it('ignores bids with negative price', () => {
      const resp = makeServerResponse([makeBid({ price: -1 })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids).to.have.length(0);
    });

    it('returns empty array when seatbid is empty', () => {
      const resp = makeServerResponse([]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids).to.deep.equal([]);
    });

    it('returns empty array when body is absent', () => {
      const bids = spec.interpretResponse({}, {});
      expect(bids).to.deep.equal([]);
    });

    it('returns empty array when serverResponse is null', () => {
      const bids = spec.interpretResponse(null, {});
      expect(bids).to.deep.equal([]);
    });

    it('handles multiple seatbids', () => {
      const resp = {
        body: {
          id: 'resp-001',
          cur: 'USD',
          seatbid: [
            { seat: 'rubicon', bid: [makeBid({ impid: 'bid-001', price: 3.00 })] },
            { seat: 'pubmatic', bid: [makeBid({ impid: 'bid-002', price: 2.50 })] },
          ]
        }
      };
      const bids = spec.interpretResponse(resp, {});
      expect(bids).to.have.length(2);
    });

    it('detects native mediaType for JSON adm', () => {
      const nativeAdm = JSON.stringify({ link: { url: 'https://example.com' }, title: { text: 'Title' } });
      const resp = makeServerResponse([makeBid({ adm: nativeAdm })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].mediaType).to.equal(NATIVE);
    });

    it('detects banner mediaType for HTML adm', () => {
      const resp = makeServerResponse([makeBid({ adm: '<div>banner</div>' })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].mediaType).to.equal(BANNER);
    });

    it('detects video mediaType for VAST XML adm', () => {
      const vastXml = '<VAST version="3.0"><Ad></Ad></VAST>';
      const resp = makeServerResponse([makeBid({ adm: vastXml, w: 640, h: 480 })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].mediaType).to.equal(VIDEO);
      expect(bids[0].vastXml).to.equal(vastXml);
    });

    it('detects video mediaType for XML declaration VAST', () => {
      const vastXml = '<?xml version="1.0"?><VAST version="4.0"></VAST>';
      const resp = makeServerResponse([makeBid({ adm: vastXml })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].mediaType).to.equal(VIDEO);
    });

    it('detects video mediaType from adUrl (VAST URL)', () => {
      const resp = makeServerResponse([makeBid({ adm: undefined, adUrl: 'https://example.com/vast.xml' })]);
      const bids = spec.interpretResponse(resp, {});
      expect(bids[0].mediaType).to.equal(VIDEO);
      expect(bids[0].vastUrl).to.equal('https://example.com/vast.xml');
    });
  });

  // -------------------------------------------------------------------------
  // getUserSyncs
  // -------------------------------------------------------------------------
  describe('getUserSyncs', () => {
    it('returns iframe sync when iframeEnabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, [], null, null);
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(SYNC_URL);
    });

    it('returns image sync when only pixelEnabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [], null, null);
      expect(syncs).to.have.length(1);
      expect(syncs[0].type).to.equal('image');
    });

    it('prefers iframe over pixel when both enabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [], null, null);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('returns empty array when both sync types are disabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [], null, null);
      expect(syncs).to.deep.equal([]);
    });

    it('appends gdpr params when gdprApplies is true', () => {
      const gdpr = { gdprApplies: true, consentString: 'CONSENT' };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], gdpr, null);
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=CONSENT');
    });

    it('appends gdpr=0 when gdprApplies is false', () => {
      const gdpr = { gdprApplies: false, consentString: '' };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], gdpr, null);
      expect(syncs[0].url).to.include('gdpr=0');
    });

    it('appends us_privacy param when uspConsent is provided', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], null, '1YNN');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('returns plain sync URL when no privacy params', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], null, null);
      expect(syncs[0].url).to.equal(SYNC_URL);
    });
  });

  // -------------------------------------------------------------------------
  // Adapter metadata
  // -------------------------------------------------------------------------
  describe('spec properties', () => {
    it('has correct bidder code', () => {
      expect(spec.code).to.equal('tne_catalyst');
    });

    it('has GVL ID 1494', () => {
      expect(spec.gvlid).to.equal(1494);
    });

    it('supports banner, native, and video media types', () => {
      expect(spec.supportedMediaTypes).to.include(BANNER);
      expect(spec.supportedMediaTypes).to.include(NATIVE);
      expect(spec.supportedMediaTypes).to.include(VIDEO);
    });
  });
});
