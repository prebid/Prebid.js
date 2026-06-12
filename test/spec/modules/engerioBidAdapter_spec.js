import { expect } from 'chai';
import { spec } from 'modules/engerioBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { server } from 'test/mocks/xhr.js';

const ENDPOINT_URL = 'https://api.engerio.sk/api/v1/adserver/prebid/auction/';

describe('engerioBidAdapter', () => {
  const adapter = newBidder(spec);

  // ── Fixtures ────────────────────────────────────────────────────────────────

  const validBid = {
    bidder: 'engerio',
    bidId: 'bid-001',
    adUnitCode: 'div-banner',
    params: {
      adUnitCode: 'homepage-sidebar',
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]],
      },
    },
  };

  const fallbackBid = {
    bidder: 'engerio',
    bidId: 'bid-003',
    adUnitCode: 'homepage-sidebar',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
  };

  const validBidRequest = {
    method: 'POST',
    url: ENDPOINT_URL,
    data: JSON.stringify({
      id: 'req-001',
      imp: [
        {
          id: 'bid-001',
          banner: { format: [{ w: 300, h: 250 }, { w: 728, h: 90 }], w: 300, h: 250 },
          ext: { adUnitCode: 'homepage-sidebar' },
        },
      ],
      site: { page: 'https://example.com/article', domain: 'example.com' },
      device: { ua: 'Mozilla/5.0 (test)' },
    }),
  };

  const serverResponse = {
    body: {
      id: 'req-001',
      cur: 'EUR',
      seatbid: [
        {
          seat: 'engerio',
          bid: [
            {
              id: 'response-bid-001',
              impid: 'bid-001',
              price: 1.75,
              adm: '<a href="https://example.com"><img src="https://cdn.example.com/ad.png" width="300" height="250"></a>',
              crid: '44444444-0000-0000-0000-000000000001',
              w: 300,
              h: 250,
              nurl: 'https://api.engerio.sk/api/v1/adserver/prebid/win/abc-123/',
              adomain: ['example.com'],
            },
          ],
        },
      ],
    },
  };

  // ── isBidRequestValid ────────────────────────────────────────────────────────

  describe('isBidRequestValid', () => {
    it('returns true for a valid bid with params.adUnitCode', () => {
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('returns true when params.adUnitCode is missing but adUnitCode is present', () => {
      expect(spec.isBidRequestValid(fallbackBid)).to.be.true;
    });

    it('returns false when params.adUnitCode and adUnitCode are both missing', () => {
      const bid = { bidder: 'engerio', bidId: 'bid-002' };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('uses adUnitCode as a fallback when params.adUnitCode is an empty string', () => {
      const bid = { ...fallbackBid, params: { adUnitCode: '' } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
  });

  // ── buildRequests ────────────────────────────────────────────────────────────

  describe('buildRequests', () => {
    const bidderRequest = {
      refererInfo: {
        page: 'https://example.com/article',
        domain: 'example.com',
      },
      ortb2: {
        regs: {
          ext: {
            gdpr: 1,
          },
        },
        user: {
          ext: {
            consent: 'consent-string',
          },
        },
        site: {
          page: 'https://stale.example.com/page',
          domain: 'stale.example.com',
          ext: {
            data: {
              section: 'sports',
            },
          },
        },
        device: {
          ua: 'Mozilla/5.0 (normalized by Prebid)',
          lmt: 1,
        },
      },
    };

    it('returns a single POST request to the Engerio endpoint', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
    });

    it('sets Content-Type to text/plain', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(request.options.contentType).to.equal('text/plain');
    });

    it('does not send credentials', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      expect(request.options.withCredentials).to.be.false;
    });

    it('populates imp[].ext.adUnitCode from params.adUnitCode', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.imp[0].ext.adUnitCode).to.equal('homepage-sidebar');
    });

    it('falls back to bid.adUnitCode when params.adUnitCode is absent', () => {
      const request = spec.buildRequests([fallbackBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.imp[0].ext.adUnitCode).to.equal('homepage-sidebar');
    });

    it('maps bid ID to imp[].id', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.imp[0].id).to.equal('bid-001');
    });

    it('builds banner format array from mediaTypes.banner.sizes', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.imp[0].banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 728, h: 90 },
      ]);
    });

    it('sets banner.w and banner.h from the first size', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.imp[0].banner.w).to.equal(300);
      expect(body.imp[0].banner.h).to.equal(250);
    });

    it('populates site.page and site.domain from refererInfo', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.site.page).to.equal('https://example.com/article');
      expect(body.site.domain).to.equal('example.com');
    });

    it('preserves consent and other ortb2 fields while overriding site.page/site.domain', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.regs.ext.gdpr).to.equal(1);
      expect(body.user.ext.consent).to.equal('consent-string');
      expect(body.site.ext.data.section).to.equal('sports');
      expect(body.device.lmt).to.equal(1);
      expect(body.site.page).to.equal('https://example.com/article');
      expect(body.site.domain).to.equal('example.com');
    });

    it('populates device.ua from normalized bidderRequest.ortb2.device.ua', () => {
      const request = spec.buildRequests([validBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.device.ua).to.equal('Mozilla/5.0 (normalized by Prebid)');
    });

    it('builds one imp per bid request', () => {
      const secondBid = {
        ...validBid,
        bidId: 'bid-002',
        params: { adUnitCode: 'article-leaderboard' },
      };
      const request = spec.buildRequests([validBid, secondBid], bidderRequest);
      const body = JSON.parse(request.data);
      expect(body.imp).to.have.lengthOf(2);
      expect(body.imp[1].ext.adUnitCode).to.equal('article-leaderboard');
    });

    it('handles missing refererInfo gracefully', () => {
      const request = spec.buildRequests([validBid], {});
      const body = JSON.parse(request.data);
      expect(body.site).to.be.undefined;
      expect(body.device).to.be.undefined;
    });
  });

  // ── interpretResponse ────────────────────────────────────────────────────────

  describe('interpretResponse', () => {
    it('returns an array of Prebid bid objects', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids).to.be.an('array').with.lengthOf(1);
    });

    it('maps price to cpm', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].cpm).to.equal(1.75);
    });

    it('maps response currency', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].currency).to.equal('EUR');
    });

    it('defaults currency to EUR when not present in response', () => {
      const resp = { body: { ...serverResponse.body, cur: undefined } };
      const bids = spec.interpretResponse(resp, validBidRequest);
      expect(bids[0].currency).to.equal('EUR');
    });

    it('maps adm to ad', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].ad).to.equal(serverResponse.body.seatbid[0].bid[0].adm);
    });

    it('maps impid to requestId', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].requestId).to.equal('bid-001');
    });

    it('maps width and height', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
    });

    it('maps crid to creativeId', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].creativeId).to.equal('44444444-0000-0000-0000-000000000001');
    });

    it('sets netRevenue to true', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].netRevenue).to.be.true;
    });

    it('includes nurl when present', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].nurl).to.equal(
        'https://api.engerio.sk/api/v1/adserver/prebid/win/abc-123/'
      );
    });

    it('populates meta.advertiserDomains from adomain', () => {
      const bids = spec.interpretResponse(serverResponse, validBidRequest);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('returns empty array for empty seatbid', () => {
      const resp = { body: { id: 'req-001', cur: 'EUR', seatbid: [] } };
      expect(spec.interpretResponse(resp, validBidRequest)).to.deep.equal([]);
    });

    it('returns empty array when body is missing', () => {
      expect(spec.interpretResponse({}, validBidRequest)).to.deep.equal([]);
    });

    it('skips bids with empty adm', () => {
      const resp = {
        body: {
          ...serverResponse.body,
          seatbid: [
            {
              bid: [{ ...serverResponse.body.seatbid[0].bid[0], adm: '' }],
            },
          ],
        },
      };
      expect(spec.interpretResponse(resp, validBidRequest)).to.have.lengthOf(0);
    });

    it('skips bids with zero price', () => {
      const resp = {
        body: {
          ...serverResponse.body,
          seatbid: [
            {
              bid: [{ ...serverResponse.body.seatbid[0].bid[0], price: 0 }],
            },
          ],
        },
      };
      expect(spec.interpretResponse(resp, validBidRequest)).to.have.lengthOf(0);
    });
  });

  // ── onBidWon ─────────────────────────────────────────────────────────────────

  describe('onBidWon', () => {
    // The win notice is sent through Prebid's `ajax` helper. The `ajax` binding is
    // rewritten at build time by the callerContext babel plugin and is a `const`
    // export, so it can't be stubbed on the module namespace; instead we assert
    // against the global fetch mock's recorded requests (server.requests).
    it('fires a GET request to the nurl', () => {
      const bid = {
        nurl: 'https://api.engerio.sk/api/v1/adserver/prebid/win/abc-123/',
      };
      spec.onBidWon(bid);
      const winRequests = server.requests.filter((req) => req.url === bid.nurl);
      expect(winRequests.length).to.equal(1);
      expect(winRequests[0].method).to.equal('GET');
      expect(winRequests[0].fetch.request.keepalive).to.be.true;
    });

    it('does nothing when nurl is absent', () => {
      spec.onBidWon({ cpm: 1.5 });
      expect(server.requests.length).to.equal(0);
    });
  });
});
