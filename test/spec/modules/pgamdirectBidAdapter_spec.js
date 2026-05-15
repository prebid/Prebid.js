import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from 'modules/pgamdirectBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import * as utils from 'src/utils.js';

/**
 * Spec for modules/pgamdirectBidAdapter.ts.
 *
 * Scope: only what's specific to this adapter. We deliberately do NOT
 * re-test the behaviour that's owned by libraries/ortbConverter (floors
 * module integration, schain-from-ortb2 lookup, GDPR/USP/GPP/COPPA
 * forwarding, userIdAsEids, tmax, native JSON parsing, VAST detection,
 * advertiserDomains, etc.) — those have comprehensive coverage in
 * ortbConverter_spec.js and spec files for other adapters that use it.
 * If we copy-pasted those tests here we'd be asserting on the library,
 * not the adapter, and would need to update them every time Prebid
 * shifts ORTB defaults.
 *
 * What IS covered here:
 *   - isBidRequestValid  — orgId validation
 *   - buildRequests      — POST shape, URL, CORS-simple options
 *                          (no contentType, no customHeaders)
 *   - imp hook           — ext.pgam.orgId, placementId → tagid
 *                          params.bidfloor fallback when floors module absent
 *   - request hook       — at=1 (first-price), currency default
 *   - bidResponse hook   — seatbid.seat → meta.networkName
 *   - onBidWon           — doesn't throw
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

  it('produces a single POST per auction with the correct URL', () => {
    const built = spec.buildRequests(
      [bannerBid(), bannerBid({ bidId: 'bid-2' })],
      bidderRequest(),
    );
    expect(built.method).to.equal('POST');
    expect(built.url).to.equal(ENDPOINT_URL);
    // Both imps in ONE request
    expect(built.data.imp).to.have.lengthOf(2);
  });

  describe('CORS-simple request shape (avoids browser preflight)', () => {
    it('does NOT set customHeaders', () => {
      const built = spec.buildRequests([bannerBid()], bidderRequest());
      expect(built.options.customHeaders).to.be.undefined;
    });

    it('does NOT set contentType', () => {
      // Even `application/json` forces a preflight — only text/plain,
      // application/x-www-form-urlencoded, and multipart/form-data
      // qualify as CORS-simple content types. By leaving contentType
      // unset we keep the POST preflight-free.
      const built = spec.buildRequests([bannerBid()], bidderRequest());
      expect(built.options.contentType).to.be.undefined;
    });

    it('sets withCredentials: false', () => {
      const built = spec.buildRequests([bannerBid()], bidderRequest());
      expect(built.options.withCredentials).to.equal(false);
    });
  });

  describe('imp hook — pgam-specific fields', () => {
    it('injects imp.ext.pgam.orgId for every imp', () => {
      const built = spec.buildRequests([bannerBid()], bidderRequest());
      expect(built.data.imp[0].ext.pgam.orgId).to.equal('pgam-acme-publisher');
    });

    it('carries placementId into imp.tagid', () => {
      const built = spec.buildRequests(
        [bannerBid({ params: { orgId: 'pgam-x', placementId: 'leader-728x90' } })],
        bidderRequest(),
      );
      expect(built.data.imp[0].tagid).to.equal('leader-728x90');
    });

    it('omits tagid when placementId is not set', () => {
      const built = spec.buildRequests([bannerBid()], bidderRequest());
      expect(built.data.imp[0].tagid).to.be.undefined;
    });
  });

  describe('imp hook — params.bidfloor legacy fallback', () => {
    it('applies params.bidfloor when floors module did not populate imp.bidfloor', () => {
      const built = spec.buildRequests(
        [bannerBid({ params: { orgId: 'pgam-x', bidfloor: 0.75 } })],
        bidderRequest(),
      );
      expect(built.data.imp[0].bidfloor).to.equal(0.75);
      expect(built.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('ignores params.bidfloor when it is negative', () => {
      const built = spec.buildRequests(
        [bannerBid({ params: { orgId: 'pgam-x', bidfloor: -1 } })],
        bidderRequest(),
      );
      // No floors module active + negative param → no floor set.
      expect(built.data.imp[0].bidfloor || 0).to.equal(0);
    });
  });

  describe('request hook — first-price + currency default', () => {
    it('sets request.at = 1 (first-price)', () => {
      const built = spec.buildRequests([bannerBid()], bidderRequest());
      expect(built.data.at).to.equal(1);
    });

    it('defaults currency to USD when none is set upstream', () => {
      const built = spec.buildRequests([bannerBid()], bidderRequest());
      expect(built.data.cur).to.deep.equal(['USD']);
    });

    it('respects an existing currency when the converter already set one', () => {
      const built = spec.buildRequests(
        [bannerBid()],
        bidderRequest({ ortb2: { cur: ['EUR'] } }),
      );
      expect(built.data.cur).to.deep.equal(['EUR']);
    });
  });
});

// ---------- interpretResponse ----------------------------------------------

describe('pgamdirect: interpretResponse', () => {
  // A minimal valid built request so fromORTB can correlate impids back
  // to their bidRequest. The adapter's interpretResponse hands the same
  // request.data it produced in buildRequests back to ortbConverter.
  function builtRequestFor(bids) {
    return spec.buildRequests(bids || [bannerBid()], bidderRequest());
  }

  it('returns an empty array when the body is missing', () => {
    const request = builtRequestFor();
    expect(spec.interpretResponse({}, request)).to.deep.equal([]);
    expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
  });

  it('maps a single banner bid with advertiserDomains + networkName from seat', () => {
    const request = builtRequestFor();
    const body = {
      id: request.data.id,
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
          w: 300,
          h: 250,
          exp: 180,
          mtype: 1, // ORTB: 1=banner
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0].cpm).to.equal(2.5);
    expect(bids[0].currency).to.equal('USD');
    expect(bids[0].width).to.equal(300);
    expect(bids[0].height).to.equal(250);
    expect(bids[0].creativeId).to.equal('creative-001');
    expect(bids[0].ttl).to.equal(180);
    expect(bids[0].mediaType).to.equal(BANNER);
    expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    // The one thing this adapter explicitly layers on the response:
    expect(bids[0].meta.networkName).to.equal('pgam-test-dsp');
  });

  it('omits meta.networkName when seatbid has no seat', () => {
    const request = builtRequestFor();
    const body = {
      id: request.data.id,
      cur: 'USD',
      seatbid: [{
        bid: [{
          id: 'd',
          impid: 'bid-1',
          price: 1.0,
          adm: '<html>',
          crid: 'c',
          w: 300,
          h: 250,
          mtype: 1,
        }],
      }],
    };
    const bids = spec.interpretResponse({ body }, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0].meta.networkName).to.be.undefined;
  });
});

// ---------- onBidWon -------------------------------------------------------

describe('pgamdirect: onBidWon', () => {
  let sandbox;
  let pixelStub;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    pixelStub = sandbox.stub(utils, 'triggerPixel');
  });
  afterEach(() => sandbox.restore());

  it('does not throw on arbitrary bid input', () => {
    expect(() => spec.onBidWon({})).to.not.throw();
    expect(() => spec.onBidWon(null)).to.not.throw();
    expect(() => spec.onBidWon(undefined)).to.not.throw();
  });

  it('does not throw when bid has malformed nurl', () => {
    // Defensive: adapters must never propagate an exception out of
    // onBidWon — it runs inside the renderer chain, and a throw here
    // can block the creative from displaying.
    expect(() => spec.onBidWon({ nurl: 12345 })).to.not.throw();
    expect(() => spec.onBidWon({ ext: { pgam: { winurl: null } } })).to.not.throw();
  });

  it('fires nurl when ext.pgam.winurl is absent', () => {
    spec.onBidWon({ nurl: 'https://win.example/?p=${AUCTION_PRICE}', cpm: 1.23 });
    expect(pixelStub.calledOnce).to.equal(true);
    expect(pixelStub.firstCall.args[0]).to.equal('https://win.example/?p=1.23');
  });

  it('prefers ext.pgam.winurl over bid.nurl and substitutes AUCTION_ID', () => {
    spec.onBidWon({
      ext: { pgam: { winurl: 'https://p.example/?a=${AUCTION_ID}&c=${AUCTION_PRICE}' } },
      nurl: 'https://should-not-fire.example',
      cpm: 2.5,
      auctionId: 'auc-7',
    });
    expect(pixelStub.calledOnce).to.equal(true);
    expect(pixelStub.firstCall.args[0]).to.equal('https://p.example/?a=auc-7&c=2.5');
  });

  it('does NOT fire a pixel when neither winurl nor nurl is provided', () => {
    spec.onBidWon({ cpm: 1 });
    expect(pixelStub.called).to.equal(false);
  });
});

// ---------- onTimeout ------------------------------------------------------

describe('pgamdirect: onTimeout', () => {
  // Low-priority telemetry uses fetch() + keepalive per AGENTS.md §Review
  // guidelines. Stub the global so we can assert on the URL without
  // making a real network call.
  let sandbox;
  let fetchStub;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub(window, 'fetch').resolves({ ok: true });
  });
  afterEach(() => sandbox.restore());

  it('swallows empty and malformed input', () => {
    expect(() => spec.onTimeout([])).to.not.throw();
    expect(() => spec.onTimeout(null)).to.not.throw();
    expect(() => spec.onTimeout(undefined)).to.not.throw();
    expect(fetchStub.called).to.equal(false);
  });

  it('sends a keepalive beacon with tmax + auction on a real timeout record', () => {
    spec.onTimeout([
      { auctionId: 'a1', timeout: 300, bidId: 'b1', bidder: 'pgamdirect' },
    ]);
    expect(fetchStub.calledOnce).to.equal(true);
    const [url, init] = fetchStub.firstCall.args;
    expect(url).to.include('/rtb/v1/metrics/timeout');
    expect(url).to.include('tmax=300');
    expect(url).to.include('auction=a1');
    // keepalive=true is the whole point — without it Chrome drops the
    // request on unload and we undercount timeouts.
    expect(init).to.have.property('keepalive', true);
  });
});

// ---------- onBidBillable --------------------------------------------------

describe('pgamdirect: onBidBillable', () => {
  let sandbox;
  let fetchStub;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub(window, 'fetch').resolves({ ok: true });
  });
  afterEach(() => sandbox.restore());

  it('sends keepalive beacon with cpm / auction / adid', () => {
    spec.onBidBillable({ cpm: 1.75, auctionId: 'auc-9', adId: 'pbid-42' });
    expect(fetchStub.calledOnce).to.equal(true);
    const [url, init] = fetchStub.firstCall.args;
    expect(url).to.include('/rtb/v1/metrics/billable');
    expect(url).to.include('cpm=1.75');
    expect(url).to.include('auction=auc-9');
    expect(url).to.include('adid=pbid-42');
    expect(init).to.have.property('keepalive', true);
  });

  it('tolerates missing fields without throwing', () => {
    expect(() => spec.onBidBillable({})).to.not.throw();
    expect(() => spec.onBidBillable(null)).to.not.throw();
    expect(() => spec.onBidBillable(undefined)).to.not.throw();
  });
});

// ---------- onAdRenderSucceeded --------------------------------------------

describe('pgamdirect: onAdRenderSucceeded', () => {
  let sandbox;
  let fetchStub;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub(window, 'fetch').resolves({ ok: true });
  });
  afterEach(() => sandbox.restore());

  it('sends keepalive beacon keyed on adId + auctionId', () => {
    spec.onAdRenderSucceeded({ adId: 'pbid-1', auctionId: 'auc-1' });
    expect(fetchStub.calledOnce).to.equal(true);
    const [url, init] = fetchStub.firstCall.args;
    expect(url).to.include('/rtb/v1/metrics/render');
    expect(url).to.include('ok=1');
    expect(url).to.include('adid=pbid-1');
    expect(url).to.include('auction=auc-1');
    expect(init).to.have.property('keepalive', true);
  });

  it('swallows arbitrary input', () => {
    expect(() => spec.onAdRenderSucceeded({})).to.not.throw();
    expect(() => spec.onAdRenderSucceeded(null)).to.not.throw();
    expect(() => spec.onAdRenderSucceeded(undefined)).to.not.throw();
  });
});

// ---------- PAAPI / Protected Audience API ---------------------------------

describe('pgamdirect: interpretResponse PAAPI passthrough', () => {
  function builtRequest() {
    return spec.buildRequests([bannerBid()], bidderRequest());
  }

  it('returns a plain bids array when response has no ext.paapi', () => {
    const request = builtRequest();
    const body = {
      id: request.data.id,
      cur: 'USD',
      seatbid: [{
        seat: 'pgam-test-dsp',
        bid: [{
          id: 'b', impid: 'bid-1', price: 2.5, adm: '<html>', crid: 'c', w: 300, h: 250, mtype: 1,
        }],
      }],
    };
    const out = spec.interpretResponse({ body }, request);
    expect(Array.isArray(out)).to.equal(true);
    expect(out).to.have.lengthOf(1);
  });

  it('surfaces paapi auction configs as { bids, paapi } when present', () => {
    const request = builtRequest();
    const body = {
      id: request.data.id,
      cur: 'USD',
      seatbid: [{
        seat: 'pgam-test-dsp',
        bid: [{
          id: 'b', impid: 'bid-1', price: 2.5, adm: '<html>', crid: 'c', w: 300, h: 250, mtype: 1,
        }],
      }],
      ext: {
        paapi: [
          { impid: 'bid-1', config: { seller: 'pgammedia.com', decisionLogicUrl: 'https://…' } },
        ],
      },
    };
    const out = spec.interpretResponse({ body }, request);
    // When paapi is returned Prebid accepts the wrapped { bids, paapi } shape.
    expect(out).to.have.property('bids');
    expect(out).to.have.property('paapi');
    expect(out.bids).to.have.lengthOf(1);
    expect(out.paapi).to.have.lengthOf(1);
    expect(out.paapi[0].bidId).to.equal('bid-1');
    expect(out.paapi[0].config).to.have.property('seller', 'pgammedia.com');
  });

  it('filters out paapi entries with no config', () => {
    const request = builtRequest();
    const body = {
      id: request.data.id,
      cur: 'USD',
      seatbid: [{ seat: 's', bid: [{ id: 'b', impid: 'bid-1', price: 1, adm: '<a>', crid: 'c', w: 300, h: 250, mtype: 1 }] }],
      ext: { paapi: [{ impid: 'bid-1' }, null, { impid: 'bid-1', config: {} }] },
    };
    const out = spec.interpretResponse({ body }, request);
    // Only one usable paapi entry — a plain { impid, config: {} } pair.
    expect(out.paapi).to.have.lengthOf(1);
  });

  it('accepts bidId OR impid as the correlation key on paapi entries', () => {
    const request = builtRequest();
    const body = {
      id: request.data.id,
      cur: 'USD',
      seatbid: [{ seat: 's', bid: [{ id: 'b', impid: 'bid-1', price: 1, adm: '<a>', crid: 'c', w: 300, h: 250, mtype: 1 }] }],
      ext: { paapi: [{ bidId: 'explicit-1', config: { x: 1 } }] },
    };
    const out = spec.interpretResponse({ body }, request);
    expect(out.paapi[0].bidId).to.equal('explicit-1');
  });
});

// ---------- getUserSyncs ---------------------------------------------------

describe('pgamdirect: getUserSyncs', () => {
  it('returns empty when both sync modes disabled', () => {
    expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, []))
      .to.deep.equal([]);
  });

  it('prefers iframe when both enabled', () => {
    const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('iframe');
    expect(syncs[0].url).to.match(/\/rtb\/v1\/usersync\?t=i/);
  });

  it('falls back to image when iframe disabled', () => {
    const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('image');
    expect(syncs[0].url).to.match(/\/rtb\/v1\/usersync\?t=p/);
  });

  it('forwards GDPR consent params when gdprApplies=true', () => {
    const syncs = spec.getUserSyncs(
      { iframeEnabled: true, pixelEnabled: false }, [],
      { gdprApplies: true, consentString: 'CPaaaaaaaaa' },
    );
    expect(syncs[0].url).to.include('gdpr=1');
    expect(syncs[0].url).to.include('gdpr_consent=CPaaaaaaaaa');
  });

  it('forwards USP (CCPA) consent', () => {
    const syncs = spec.getUserSyncs(
      { iframeEnabled: true, pixelEnabled: false }, [],
      undefined, '1YYY',
    );
    expect(syncs[0].url).to.include('us_privacy=1YYY');
  });

  it('forwards GPP string + SID list', () => {
    const syncs = spec.getUserSyncs(
      { iframeEnabled: true, pixelEnabled: false }, [],
      undefined, undefined,
      { gppString: 'DBABMA~CPY...', applicableSections: [7, 6] },
    );
    expect(syncs[0].url).to.include('gpp=DBABMA~CPY');
    expect(syncs[0].url).to.include('gpp_sid=7%2C6');
  });
});

// ---------- bidResponse hook — enriched meta -------------------------------

describe('pgamdirect: bidResponse meta enrichment', () => {
  // Build a request + a response that correlates with it. ortbConverter's
  // fromORTB uses both request.id (top-level) and imp.id (bid.impid) to
  // match responses back to their originating bidRequest, so BOTH have to
  // line up or the bid is silently dropped and the hook never runs.
  function fire({ seat = 'acme-dsp', ext = {}, adomain = [], cat = [] } = {}) {
    const request = spec.buildRequests([bannerBid()], bidderRequest());
    const resp = {
      id: request.data.id,
      cur: 'USD',
      seatbid: [{
        seat,
        bid: [{
          id: 'b1',
          impid: 'bid-1',
          price: 2.5,
          adomain,
          cat,
          adm: '<html>a</html>',
          crid: 'c1',
          w: 300,
          h: 250,
          mtype: 1,
          ext,
        }],
      }],
    };
    return { bids: spec.interpretResponse({ body: resp }, request), resp };
  }

  it('populates advertiserDomains from bid.adomain', () => {
    const { bids } = fire({ adomain: ['cnn.com'] });
    expect(bids[0].meta.advertiserDomains).to.deep.equal(['cnn.com']);
  });

  it('splits bid.cat into primaryCatId + secondaryCatIds', () => {
    const { bids } = fire({ cat: ['IAB12', 'IAB12-1', 'IAB19'] });
    expect(bids[0].meta.primaryCatId).to.equal('IAB12');
    expect(bids[0].meta.secondaryCatIds).to.deep.equal(['IAB12-1', 'IAB19']);
  });

  it('surfaces networkName from seatbid.seat', () => {
    const { bids } = fire();
    expect(bids[0].meta.networkName).to.equal('acme-dsp');
  });

  it('surfaces numeric networkId when seat is all digits', () => {
    const { bids } = fire({ seat: '162623' });
    expect(bids[0].meta.networkId).to.equal(162623);
    expect(bids[0].meta.networkName).to.equal('162623');
  });

  it('reads brandId / brandName / agencyId / buyerId from bid.ext.meta (both snake+camel)', () => {
    const { bids } = fire({
      ext: {
        meta: { brand_id: 42, brand_name: 'Acme', agencyId: 'agency-7', buyer_id: 'buyer-1' },
      },
    });
    expect(bids[0].meta.brandId).to.equal(42);
    expect(bids[0].meta.brandName).to.equal('Acme');
    expect(bids[0].meta.agencyId).to.equal('agency-7');
    expect(bids[0].meta.buyerId).to.equal('buyer-1');
  });

  it('surfaces dsa + dchain blocks from bid.ext', () => {
    const dsa = { adrender: 1, paid: 'paid-abc', behalf: 'AcmeCorp' };
    const dchain = { ver: '1.0', complete: 1, nodes: [] };
    const { bids } = fire({ ext: { dsa, dchain } });
    expect(bids[0].meta.dsa).to.deep.equal(dsa);
    expect(bids[0].meta.dchain).to.deep.equal(dchain);
  });
});

// ---------- imp hook — displaymanager --------------------------------------

describe('pgamdirect: imp displaymanager', () => {
  it('sets displaymanager + displaymanagerver on every imp', () => {
    const req = spec.buildRequests([bannerBid()], bidderRequest());
    const imp = req.data.imp[0];
    expect(imp.displaymanager).to.equal('Prebid.js');
    expect(imp.displaymanagerver).to.be.a('string');
    expect(imp.displaymanagerver.length).to.be.greaterThan(0);
  });
});

// ---------- getUserSyncs ---------------------------------------------------

describe('pgamdirect: getUserSyncs', () => {
  const enabledAll = { iframeEnabled: true, pixelEnabled: true };
  const iframeOnly = { iframeEnabled: true, pixelEnabled: false };

  it('returns [] when serverResponses is empty or missing', () => {
    expect(spec.getUserSyncs(enabledAll, [])).to.deep.equal([]);
    expect(spec.getUserSyncs(enabledAll, undefined)).to.deep.equal([]);
  });

  it('returns [] when the response body carries no ext.cookies', () => {
    const resp = { body: { seatbid: [] } };
    expect(spec.getUserSyncs(enabledAll, [resp])).to.deep.equal([]);
  });

  it('forwards iframe + image pixels when both are allowed', () => {
    const resp = {
      body: {
        ext: {
          cookies: [
            { type: 'iframe', url: 'https://dsp-a.example/sync?gdpr=1' },
            { type: 'image', url: 'https://dsp-b.example/px.gif' },
          ],
        },
      },
    };
    const syncs = spec.getUserSyncs(enabledAll, [resp]);
    expect(syncs).to.deep.equal([
      { type: 'iframe', url: 'https://dsp-a.example/sync?gdpr=1' },
      { type: 'image', url: 'https://dsp-b.example/px.gif' },
    ]);
  });

  it('drops image pixels when the publisher disabled pixel syncs', () => {
    const resp = {
      body: {
        ext: {
          cookies: [
            { type: 'iframe', url: 'https://dsp-a.example/sync' },
            { type: 'image', url: 'https://dsp-b.example/px.gif' },
          ],
        },
      },
    };
    const syncs = spec.getUserSyncs(iframeOnly, [resp]);
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0].type).to.equal('iframe');
  });

  it('ignores malformed entries (missing url or wrong type)', () => {
    const resp = {
      body: {
        ext: {
          cookies: [
            { type: 'iframe' }, // missing url
            { url: 'https://x.example/sync' }, // missing type
            { type: 'something-else', url: 'https://y.example/px' }, // unknown type
            { type: 'iframe', url: 'https://ok.example/sync' },
          ],
        },
      },
    };
    const syncs = spec.getUserSyncs(enabledAll, [resp]);
    expect(syncs).to.deep.equal([
      { type: 'iframe', url: 'https://ok.example/sync' },
    ]);
  });

  it('returns all eligible syncs and lets Prebid core enforce the per-bidder cap', () => {
    // Per Codex review on #14777: we deliberately do NOT cap here.
    // `userSync.syncsPerBidder` is the authoritative limit and lives
    // in src/userSync.ts; capping inside the adapter would silently
    // override publishers who raised the limit (or set 0 = unlimited).
    const cookies = Array.from({ length: 10 }, (_, i) => ({
      type: 'image',
      url: `https://dsp-${i}.example/px`,
    }));
    const resp = { body: { ext: { cookies } } };
    const syncs = spec.getUserSyncs(enabledAll, [resp]);
    expect(syncs).to.have.lengthOf(10);
  });
});

// ---------- supportedMediaTypes / gvlid ------------------------------------

describe('pgamdirect: adapter metadata', () => {
  it('declares BANNER, VIDEO, NATIVE as supported media types', () => {
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE]);
  });

  it('registers GVL ID 1353 (PGAM Media LLC)', () => {
    expect(spec.gvlid).to.equal(1353);
  });

  it('has the correct bidder code', () => {
    expect(spec.code).to.equal('pgamdirect');
  });
});
