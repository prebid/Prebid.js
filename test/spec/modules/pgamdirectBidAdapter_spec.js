import { expect } from 'chai';
import { spec } from 'modules/pgamdirectBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';

/**
 * Spec for modules/pgamdirectBidAdapter.js.
 *
 * Coverage targets every branch in the adapter:
 *   isBidRequestValid       — valid path, missing orgId, non-string orgId
 *   buildRequests           — empty input, banner, video, native, multi-imp,
 *                             consent passthrough (gdpr/usp/gpp/coppa),
 *                             eids passthrough, schain passthrough,
 *                             gpid passthrough, tmax / currency defaults
 *   interpretResponse       — empty body, no seatbid, single banner,
 *                             video (VAST XML + VAST URL variants), native,
 *                             missing required fields filtered out,
 *                             seat metadata forwarded to meta.networkName
 *   onBidWon                — no-op, doesn't throw
 *
 * Written to run inside prebid/Prebid.js test harness — `npm test`.
 */

const ENDPOINT_URL = 'https://rtb.pgammedia.com/rtb/v1/auction';

// ---------- fixtures --------------------------------------------------------

function bannerBid(overrides) {
  return Object.assign({
    bidId: 'bid-1',
    bidder: 'pgamdirect',
    adUnitCode: 'adunit-1',
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    params: { orgId: 'pgam-acme-publisher' },
  }, overrides || {});
}

function videoBid(overrides) {
  return Object.assign({
    bidId: 'bid-v1',
    bidder: 'pgamdirect',
    adUnitCode: 'adunit-v',
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        minduration: 5,
        maxduration: 30,
        protocols: [2, 3, 5, 6],
        api: [1, 2],
        placement: 1,
        plcmt: 1,
        linearity: 1,
        startdelay: 0,
      },
    },
    params: { orgId: 'pgam-acme-publisher' },
  }, overrides || {});
}

function nativeBid(overrides) {
  return Object.assign({
    bidId: 'bid-n1',
    bidder: 'pgamdirect',
    adUnitCode: 'adunit-n',
    mediaTypes: { native: { image: { required: true, sizes: [150, 50] } } },
    params: { orgId: 'pgam-acme-publisher' },
  }, overrides || {});
}

function bidderRequest(overrides) {
  return Object.assign({
    auctionId: 'auction-1',
    bidderCode: 'pgamdirect',
    timeout: 500,
    refererInfo: {
      page: 'https://publisher.example/page',
      domain: 'publisher.example',
      ref: 'https://referrer.example/',
    },
  }, overrides || {});
}

// ---------- isBidRequestValid ----------------------------------------------

describe('pgamdirect: isBidRequestValid', () => {
  it('accepts a bid with params.orgId as a non-empty string', () => {
    expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
  });

  it('rejects when params is missing entirely', () => {
    expect(spec.isBidRequestValid({ bidId: 'x' })).to.equal(false);
  });

  it('rejects when params.orgId is missing', () => {
    expect(spec.isBidRequestValid(bannerBid({ params: {} }))).to.equal(false);
  });

  it('rejects empty string orgId', () => {
    expect(spec.isBidRequestValid(bannerBid({ params: { orgId: '' } }))).to.equal(false);
  });

  it('rejects non-string orgId (number)', () => {
    expect(spec.isBidRequestValid(bannerBid({ params: { orgId: 42 } }))).to.equal(false);
  });

  it('rejects non-string orgId (object)', () => {
    expect(spec.isBidRequestValid(bannerBid({ params: { orgId: { x: 1 } } }))).to.equal(false);
  });
});

// ---------- buildRequests --------------------------------------------------

describe('pgamdirect: buildRequests', () => {
  it('returns empty array on empty input', () => {
    expect(spec.buildRequests([], bidderRequest())).to.deep.equal([]);
    expect(spec.buildRequests(null, bidderRequest())).to.deep.equal([]);
  });

  it('produces a single POST per auction', () => {
    const built = spec.buildRequests([bannerBid(), bannerBid({ bidId: 'bid-2' })], bidderRequest());
    expect(built.method).to.equal('POST');
    expect(built.url).to.equal(ENDPOINT_URL);
    expect(built.options.customHeaders['x-openrtb-version']).to.equal('2.6');
    // Both imps in ONE request
    expect(built.data.imp).to.have.lengthOf(2);
  });

  it('populates site/device/source/regs/tmax/cur defaults', () => {
    const built = spec.buildRequests([bannerBid()], bidderRequest());
    expect(built.data.id).to.equal('auction-1');
    expect(built.data.at).to.equal(1);
    expect(built.data.tmax).to.equal(500);
    expect(built.data.cur).to.deep.equal(['USD']);
    expect(built.data.site.page).to.equal('https://publisher.example/page');
    expect(built.data.site.domain).to.equal('publisher.example');
    expect(built.data.device.ua).to.be.a('string');
    expect(built.data.source.tid).to.equal('auction-1');
    expect(built.data.source.fd).to.equal(1);
  });

  it('falls back to DEFAULT_TMAX when bidderRequest.timeout is unset', () => {
    const req = bidderRequest();
    delete req.timeout;
    const built = spec.buildRequests([bannerBid()], req);
    expect(built.data.tmax).to.equal(300);
  });

  it('builds banner imp.banner.format from mediaTypes.banner.sizes', () => {
    const built = spec.buildRequests([bannerBid()], bidderRequest());
    const imp = built.data.imp[0];
    expect(imp.id).to.equal('bid-1');
    expect(imp.banner.w).to.equal(300);
    expect(imp.banner.h).to.equal(250);
    expect(imp.banner.format).to.deep.equal([
      { w: 300, h: 250 },
      { w: 728, h: 90 },
    ]);
    expect(imp.secure).to.equal(1);
    expect(imp.bidfloorcur).to.equal('USD');
  });

  it('carries placementId into imp.tagid', () => {
    const built = spec.buildRequests(
      [bannerBid({ params: { orgId: 'pgam-x', placementId: 'leader-728x90' } })],
      bidderRequest(),
    );
    expect(built.data.imp[0].tagid).to.equal('leader-728x90');
  });

  it('injects imp.ext.pgam.orgId for every imp', () => {
    const built = spec.buildRequests([bannerBid()], bidderRequest());
    expect(built.data.imp[0].ext.pgam.orgId).to.equal('pgam-acme-publisher');
  });

  it('maps mediaTypes.video fully into imp.video', () => {
    const built = spec.buildRequests([videoBid()], bidderRequest());
    const imp = built.data.imp[0];
    expect(imp.video.mimes).to.deep.equal(['video/mp4']);
    expect(imp.video.w).to.equal(640);
    expect(imp.video.h).to.equal(480);
    expect(imp.video.minduration).to.equal(5);
    expect(imp.video.maxduration).to.equal(30);
    expect(imp.video.protocols).to.deep.equal([2, 3, 5, 6]);
    expect(imp.video.api).to.deep.equal([1, 2]);
    expect(imp.video.placement).to.equal(1);
    expect(imp.video.plcmt).to.equal(1);
    expect(imp.video.linearity).to.equal(1);
    expect(imp.video.startdelay).to.equal(0);
  });

  it('serialises native config into imp.native.request', () => {
    const built = spec.buildRequests([nativeBid()], bidderRequest());
    const imp = built.data.imp[0];
    expect(imp.native.ver).to.equal('1.2');
    expect(JSON.parse(imp.native.request)).to.have.property('image');
  });

  it('forwards GDPR consent into regs.ext', () => {
    const built = spec.buildRequests(
      [bannerBid()],
      bidderRequest({
        gdprConsent: { gdprApplies: true, consentString: 'CONSENT_STRING_HERE' },
      }),
    );
    expect(built.data.regs.ext.gdpr).to.equal(1);
    expect(built.data.regs.ext.gdpr_consent).to.equal('CONSENT_STRING_HERE');
  });

  it('forwards USP consent into regs.ext.us_privacy', () => {
    const built = spec.buildRequests(
      [bannerBid()],
      bidderRequest({ uspConsent: '1YYY' }),
    );
    expect(built.data.regs.ext.us_privacy).to.equal('1YYY');
  });

  it('forwards GPP consent into regs.gpp / regs.gpp_sid', () => {
    const built = spec.buildRequests(
      [bannerBid()],
      bidderRequest({
        gppConsent: { gppString: 'GPP_STRING', applicableSections: [7, 8] },
      }),
    );
    expect(built.data.regs.gpp).to.equal('GPP_STRING');
    expect(built.data.regs.gpp_sid).to.deep.equal([7, 8]);
  });

  it('forwards COPPA from ortb2.regs.coppa', () => {
    const built = spec.buildRequests(
      [bannerBid()],
      bidderRequest({ ortb2: { regs: { coppa: 1 } } }),
    );
    expect(built.data.regs.coppa).to.equal(1);
  });

  it('forwards user.ext.eids when userIdAsEids is set', () => {
    const eids = [{ source: 'example.com', uids: [{ id: 'user-123', atype: 1 }] }];
    const built = spec.buildRequests(
      [bannerBid()],
      bidderRequest({ userIdAsEids: eids }),
    );
    expect(built.data.user.ext.eids).to.deep.equal(eids);
  });

  it('forwards schain from the first bid', () => {
    const schain = {
      complete: 1,
      ver: '1.0',
      nodes: [{ asi: 'publisher.example', sid: 'pub-123', hp: 1 }],
    };
    const built = spec.buildRequests(
      [bannerBid({ schain })],
      bidderRequest(),
    );
    expect(built.data.source.ext.schain).to.deep.equal(schain);
  });

  it('forwards gpid from ortb2Imp.ext.gpid', () => {
    const built = spec.buildRequests(
      [bannerBid({ ortb2Imp: { ext: { gpid: '/acme/top-leaderboard' } } })],
      bidderRequest(),
    );
    expect(built.data.imp[0].ext.gpid).to.equal('/acme/top-leaderboard');
  });

  it('merges ortb2.site and ortb2.user first-party data without clobbering refererInfo', () => {
    const built = spec.buildRequests(
      [bannerBid()],
      bidderRequest({
        ortb2: {
          site: { cat: ['IAB1'], content: { language: 'en' } },
          user: { yob: 1990 },
        },
      }),
    );
    // site merge preserves page/domain from refererInfo
    expect(built.data.site.page).to.equal('https://publisher.example/page');
    expect(built.data.site.cat).to.deep.equal(['IAB1']);
    expect(built.data.user.yob).to.equal(1990);
  });

  it('honours bid.params.bidfloor', () => {
    const built = spec.buildRequests(
      [bannerBid({ params: { orgId: 'x', bidfloor: 1.23 } })],
      bidderRequest(),
    );
    expect(built.data.imp[0].bidfloor).to.equal(1.23);
  });
});

// ---------- interpretResponse ----------------------------------------------

describe('pgamdirect: interpretResponse', () => {
  it('returns empty array when body is missing / no seatbid', () => {
    expect(spec.interpretResponse({}, {})).to.deep.equal([]);
    expect(spec.interpretResponse({ body: null }, {})).to.deep.equal([]);
    expect(spec.interpretResponse({ body: {} }, {})).to.deep.equal([]);
    expect(spec.interpretResponse({ body: { seatbid: [] } }, {})).to.deep.equal([]);
  });

  it('maps a single banner bid correctly', () => {
    const body = {
      id: 'auction-1',
      cur: 'USD',
      seatbid: [{
        seat: 'pgam-test-dsp',
        bid: [{
          id: 'dsp-bid-1',
          impid: 'bid-1',
          price: 2.5,
          adm: '<html><body>ad</body></html>',
          crid: 'creative-001',
          adomain: ['advertiser.example'],
          cat: ['IAB3-1'],
          w: 300,
          h: 250,
          exp: 180,
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids).to.have.lengthOf(1);
    expect(bids[0].requestId).to.equal('bid-1');
    expect(bids[0].cpm).to.equal(2.5);
    expect(bids[0].currency).to.equal('USD');
    expect(bids[0].width).to.equal(300);
    expect(bids[0].height).to.equal(250);
    expect(bids[0].creativeId).to.equal('creative-001');
    expect(bids[0].ttl).to.equal(180);
    expect(bids[0].netRevenue).to.equal(true);
    expect(bids[0].mediaType).to.equal(BANNER);
    expect(bids[0].ad).to.contain('<html>');
    expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    expect(bids[0].meta.networkName).to.equal('pgam-test-dsp');
  });

  it('maps VAST XML into vastXml, not ad', () => {
    const body = {
      cur: 'USD',
      seatbid: [{
        seat: 'verve',
        bid: [{
          id: 'v-1',
          impid: 'bid-v1',
          price: 10.0,
          crid: 'cre-v',
          adm: '<VAST version="4.0"><Ad></Ad></VAST>',
          ext: { meta: { mediaType: VIDEO } },
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids[0].mediaType).to.equal(VIDEO);
    expect(bids[0].vastXml).to.contain('<VAST');
    expect(bids[0].ad).to.be.undefined;
  });

  it('falls back to vastUrl when adm is absent but nurl is set (video)', () => {
    const body = {
      cur: 'USD',
      seatbid: [{
        seat: 'verve',
        bid: [{
          id: 'v-2',
          impid: 'bid-v1',
          price: 8.0,
          crid: 'c',
          nurl: 'https://vast.example/wrapper.xml',
          ext: { meta: { mediaType: VIDEO } },
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids[0].mediaType).to.equal(VIDEO);
    expect(bids[0].vastUrl).to.equal('https://vast.example/wrapper.xml');
  });

  it('parses adm as native JSON for native bids', () => {
    const nativePayload = { assets: [{ id: 1, title: { text: 'hello' } }] };
    const body = {
      cur: 'USD',
      seatbid: [{
        seat: 'native-dsp',
        bid: [{
          id: 'n-1',
          impid: 'bid-n1',
          price: 0.75,
          crid: 'cn',
          adm: JSON.stringify(nativePayload),
          ext: { meta: { mediaType: NATIVE } },
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids[0].mediaType).to.equal(NATIVE);
    expect(bids[0].native).to.deep.equal(nativePayload);
  });

  it('drops native bid when adm JSON is malformed', () => {
    const body = {
      cur: 'USD',
      seatbid: [{
        seat: 's',
        bid: [{
          id: 'n-2',
          impid: 'bid-n1',
          price: 0.75,
          crid: 'c',
          adm: 'not-json',
          ext: { meta: { mediaType: NATIVE } },
        }],
      }],
    };
    expect(spec.interpretResponse({ body }, {})).to.have.lengthOf(0);
  });

  it('drops bids missing impid or non-positive price', () => {
    const body = {
      cur: 'USD',
      seatbid: [{
        seat: 's',
        bid: [
          { id: 'a', price: 2.0, crid: 'c' }, // missing impid
          { id: 'b', impid: 'x', price: 0, crid: 'c' }, // zero price
          { id: 'c', impid: 'x', price: -1, crid: 'c' }, // negative price
          { id: 'd', impid: 'ok', price: 1.0, crid: 'c', adm: '<html>' },
        ],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids).to.have.lengthOf(1);
    expect(bids[0].requestId).to.equal('ok');
  });

  it('infers mediaType=video from adm starting with <VAST', () => {
    const body = {
      cur: 'USD',
      seatbid: [{
        bid: [{
          id: 'x',
          impid: 'i',
          price: 1.0,
          crid: 'c',
          adm: '<VAST version="2.0"><Ad></Ad></VAST>',
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids[0].mediaType).to.equal(VIDEO);
    expect(bids[0].vastXml).to.contain('<VAST');
  });

  it('defaults ttl to 300 when exp absent, currency to USD when cur absent', () => {
    const body = {
      seatbid: [{
        bid: [{ id: 'x', impid: 'i', price: 1.0, crid: 'c', adm: '<html>' }],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids[0].ttl).to.equal(300);
    expect(bids[0].currency).to.equal('USD');
  });

  it('merges bid.ext.meta into the prebid meta object', () => {
    const body = {
      cur: 'USD',
      seatbid: [{
        bid: [{
          id: 'x',
          impid: 'i',
          price: 1.0,
          crid: 'c',
          adm: '<html>',
          ext: { meta: { advertiserId: 'acme-42', dchain: 'x:y:z' } },
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, {});
    expect(bids[0].meta.advertiserId).to.equal('acme-42');
    expect(bids[0].meta.dchain).to.equal('x:y:z');
  });
});

// ---------- onBidWon -------------------------------------------------------

describe('pgamdirect: onBidWon', () => {
  it('does not throw on arbitrary bid input', () => {
    expect(() => spec.onBidWon({})).to.not.throw();
    expect(() => spec.onBidWon(null)).to.not.throw();
    expect(() => spec.onBidWon(undefined)).to.not.throw();
  });
});

// ---------- spec metadata --------------------------------------------------

describe('pgamdirect: spec metadata', () => {
  it('declares BIDDER_CODE=pgamdirect', () => {
    expect(spec.code).to.equal('pgamdirect');
  });

  it('supports banner, video, native', () => {
    expect(spec.supportedMediaTypes).to.include(BANNER);
    expect(spec.supportedMediaTypes).to.include(VIDEO);
    expect(spec.supportedMediaTypes).to.include(NATIVE);
  });
});
