import { expect } from 'chai';
import { spec } from 'modules/pgamdirectBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';

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
  it('does not throw on arbitrary bid input', () => {
    expect(() => spec.onBidWon({})).to.not.throw();
    expect(() => spec.onBidWon(null)).to.not.throw();
    expect(() => spec.onBidWon(undefined)).to.not.throw();
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
