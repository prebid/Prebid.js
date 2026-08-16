import { expect } from 'chai';
import { spec } from 'modules/epom_asBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

// Prebid core + the ORTB processors the converter relies on.
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';

const HOST = 'ads.example.com';
const OTHER_HOST = 'ads.other-network.com';
const PLACEMENT = 'a4f21c9e7b';
const ENDPOINT = `https://${HOST}/hb/bid`;

function bannerBid(overrides = {}) {
  return {
    bidder: 'epom_as',
    params: { host: HOST, placementKey: PLACEMENT },
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    adUnitCode: 'div-leaderboard',
    transactionId: 'txn-1',
    bidId: 'bid-1',
    bidderRequestId: 'req-1',
    auctionId: 'auction-1',
    sizes: [[300, 250], [728, 90]],
    ...overrides,
  };
}

function bidderRequestFor(bids) {
  return {
    bidderCode: 'epom_as',
    auctionId: 'auction-1',
    bidderRequestId: 'req-1',
    timeout: 1000,
    refererInfo: { page: 'https://publisher.example.com/article', domain: 'publisher.example.com' },
    bids,
  };
}

describe('Epom Ad Server adapter', function () {
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(newBidder(spec).callBids).to.be.a('function');
    });
  });

  describe('spec metadata', function () {
    it('declares the bidder code, GVL ID and banner support', function () {
      expect(spec.code).to.equal('epom_as');
      expect(spec.gvlid).to.equal(849);
      expect(spec.supportedMediaTypes).to.deep.equal(['banner']);
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a bid carrying host and placementKey', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });

    it('rejects a bid with no params at all', function () {
      expect(spec.isBidRequestValid({ bidder: 'epom_as' })).to.equal(false);
    });

    it('rejects a missing or non-string host', function () {
      expect(spec.isBidRequestValid(bannerBid({ params: { placementKey: PLACEMENT } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { host: 42, placementKey: PLACEMENT } }))).to.equal(false);
    });

    it('rejects a missing or non-string placementKey', function () {
      expect(spec.isBidRequestValid(bannerBid({ params: { host: HOST } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { host: HOST, placementKey: 7 } }))).to.equal(false);
    });

    // The host is the only publisher-controlled part of the URL, so it must be a
    // bare hostname — anything that could carry a scheme, path, port, credentials
    // or a query string would let a page config redirect the payload elsewhere.
    it('rejects a host that is not a bare hostname', function () {
      const bad = [
        'https://ads.example.com',
        'ads.example.com/collect',
        'ads.example.com:8080',
        'user@ads.example.com',
        'ads.example.com?x=1',
        'ads.example.com#f',
        'localhost',
        '',
        ' ads.example.com',
        'ads.example.com/../evil.com',
      ];
      bad.forEach((host) => {
        expect(spec.isBidRequestValid(bannerBid({ params: { host, placementKey: PLACEMENT } })), host).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    it('returns nothing when there are no bids', function () {
      expect(spec.buildRequests([], bidderRequestFor([]))).to.deep.equal([]);
    });

    it('POSTs to https://{host}/hb/bid as text/plain without credentials', async function () {
      const bids = [bannerBid()];
      const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT);
      // text/plain keeps the POST a simple request, so the browser skips the
      // CORS preflight; withCredentials false means no cookies leave the page.
      expect(requests[0].options.contentType).to.equal('text/plain');
      expect(requests[0].options.withCredentials).to.equal(false);
    });

    it('packs every ad unit of one host into a single request, one imp each', async function () {
      const bids = [
        bannerBid(),
        bannerBid({ bidId: 'bid-2', adUnitCode: 'div-sidebar', params: { host: HOST, placementKey: '6d0e83b415' } }),
        bannerBid({ bidId: 'bid-3', adUnitCode: 'div-footer', params: { host: HOST, placementKey: 'ff0011aa22' } }),
      ];
      const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

      expect(requests).to.have.lengthOf(1);
      const { imp } = requests[0].data;
      expect(imp).to.have.lengthOf(3);
      expect(imp.map((i) => i.id)).to.deep.equal(['bid-1', 'bid-2', 'bid-3']);
      expect(imp.map((i) => i.tagid)).to.deep.equal([PLACEMENT, '6d0e83b415', 'ff0011aa22']);
    });

    it('splits by host so impressions never reach the wrong deployment', async function () {
      const bids = [
        bannerBid(),
        bannerBid({ bidId: 'bid-2', params: { host: OTHER_HOST, placementKey: '6d0e83b415' } }),
        bannerBid({ bidId: 'bid-3', params: { host: HOST, placementKey: 'ff0011aa22' } }),
      ];
      const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

      expect(requests).to.have.lengthOf(2);
      const byUrl = Object.fromEntries(requests.map((r) => [r.url, r.data.imp.map((i) => i.id)]));
      expect(byUrl[ENDPOINT]).to.deep.equal(['bid-1', 'bid-3']);
      expect(byUrl[`https://${OTHER_HOST}/hb/bid`]).to.deep.equal(['bid-2']);
    });

    it('carries banner sizes through to imp.banner.format', async function () {
      const bids = [bannerBid()];
      const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

      expect(requests[0].data.imp[0].banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 728, h: 90 },
      ]);
    });

    it('defaults the request currency to USD', async function () {
      const bids = [bannerBid()];
      const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

      expect(requests[0].data.cur).to.deep.equal(['USD']);
    });

    it('forwards the page URL from refererInfo', async function () {
      const bids = [bannerBid()];
      const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

      expect(requests[0].data.site.page).to.equal('https://publisher.example.com/article');
    });

    describe('floors', function () {
      it('applies params.bidFloor when no floors module value is present', async function () {
        const bids = [bannerBid({ params: { host: HOST, placementKey: PLACEMENT, bidFloor: 1.25 } })];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(requests[0].data.imp[0].bidfloor).to.equal(1.25);
        expect(requests[0].data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('honours params.bidFloorCur', async function () {
        const bids = [bannerBid({ params: { host: HOST, placementKey: PLACEMENT, bidFloor: 2, bidFloorCur: 'EUR' } })];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(requests[0].data.imp[0].bidfloorcur).to.equal('EUR');
      });

      it('lets the Price Floors module win over params.bidFloor', async function () {
        const bids = [bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, bidFloor: 1.25 },
          getFloor: () => ({ currency: 'USD', floor: 3.5 }),
        })];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(requests[0].data.imp[0].bidfloor).to.equal(3.5);
      });
    });

    describe('channel and custom params', function () {
      it('sends the channel under our own namespace', async function () {
        const bids = [bannerBid({ params: { host: HOST, placementKey: PLACEMENT, channel: 'sports-uk' } })];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(requests[0].data.imp[0].ext.epom_as.channel).to.equal('sports-uk');
      });

      // Custom params share imp.ext.data with first-party data and RTD modules, so the
      // ad server has one place to read targetable key-values from.
      it('merges custom params into imp.ext.data as strings', async function () {
        const bids = [bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: { section: 'sport', tier: 2, premium: true } },
        })];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(requests[0].data.imp[0].ext.data).to.deep.equal({
          section: 'sport', tier: '2', premium: 'true',
        });
      });

      it('drops non-scalar values and oversized entries', async function () {
        const bids = [bannerBid({
          params: {
            host: HOST,
            placementKey: PLACEMENT,
            customParams: {
              ok: 'yes',
              nested: { a: 1 },
              list: [1, 2],
              ['k'.repeat(129)]: 'long-key',
              tooLong: 'v'.repeat(513),
            },
          },
        })];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(requests[0].data.imp[0].ext.data).to.deep.equal({ ok: 'yes' });
      });

      it('caps the number of custom params', async function () {
        const many = {};
        for (let i = 0; i < 50; i++) {
          many['k' + i] = 'v';
        }
        const bids = [bannerBid({ params: { host: HOST, placementKey: PLACEMENT, customParams: many } })];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(Object.keys(requests[0].data.imp[0].ext.data)).to.have.lengthOf(32);
      });

      it('adds nothing when neither is configured', async function () {
        const bids = [bannerBid()];
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));

        expect(requests[0].data.imp[0].ext?.epom_as).to.equal(undefined);
        expect(requests[0].data.imp[0].ext?.data).to.equal(undefined);
      });
    });

    describe('consent', function () {
      it('forwards TCF consent and the GDPR flag', async function () {
        const bids = [bannerBid()];
        const bidderRequest = bidderRequestFor(bids);
        bidderRequest.gdprConsent = {
          gdprApplies: true,
          consentString: 'CONSENT-STRING',
        };
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequest));

        expect(requests[0].data.regs.ext.gdpr).to.equal(1);
        expect(requests[0].data.user.ext.consent).to.equal('CONSENT-STRING');
      });

      // US privacy, GPP and COPPA are resolved into ortb2.regs by core, so what
      // the adapter owes is simply not to drop them on the way out.
      it('forwards the regs object untouched', async function () {
        const bids = [bannerBid()];
        const bidderRequest = bidderRequestFor(bids);
        bidderRequest.ortb2 = {
          regs: { coppa: 1, gpp: 'GPP-STRING', gpp_sid: [7], ext: { us_privacy: '1YNN' } },
        };
        const requests = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequest));

        expect(requests[0].data.regs.ext.us_privacy).to.equal('1YNN');
        expect(requests[0].data.regs.gpp).to.equal('GPP-STRING');
        expect(requests[0].data.regs.gpp_sid).to.deep.equal([7]);
        expect(requests[0].data.regs.coppa).to.equal(1);
      });
    });
  });

  describe('interpretResponse', function () {
    let request;

    beforeEach(async function () {
      const bids = [bannerBid()];
      request = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)))[0];
    });

    it('returns nothing for an empty response', function () {
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
    });

    it('returns nothing when the ad server has no bid', function () {
      const response = { body: { id: request.data.id, seatbid: [], cur: 'USD' } };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    it('maps a seatbid into a Prebid bid', function () {
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            seat: 'epom',
            bid: [{
              id: 'server-bid-1',
              impid: 'bid-1',
              price: 2.75,
              adm: '<div>creative</div>',
              crid: 'creative-99',
              w: 300,
              h: 250,
              adomain: ['advertiser.example.com'],
            }],
          }],
        },
      };

      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('bid-1');
      expect(bids[0].cpm).to.equal(2.75);
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<div>creative</div>');
      expect(bids[0].creativeId).to.equal('creative-99');
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.example.com']);
    });

    // The whole Google Ad Manager integration hangs off hb_deal_epom_as: a
    // Sponsorship line item keyed on the deal id is what makes an Epom bid
    // outrank AdX rather than compete with it on price.
    it('surfaces the deal id the ad server stamps on every bid', function () {
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'server-bid-1',
              impid: 'bid-1',
              price: 2.75,
              adm: '<div>creative</div>',
              crid: 'creative-99',
              dealid: 'epom-direct',
              w: 300,
              h: 250,
            }],
          }],
        },
      };

      expect(spec.interpretResponse(response, request)[0].dealId).to.equal('epom-direct');
    });

    it('maps one bid per impression back to its own ad unit', async function () {
      const bids = [
        bannerBid(),
        bannerBid({ bidId: 'bid-2', adUnitCode: 'div-sidebar', params: { host: HOST, placementKey: '6d0e83b415' } }),
      ];
      const multiRequest = spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)))[0];
      const response = {
        body: {
          id: multiRequest.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [
              { id: 's1', impid: 'bid-1', price: 1.5, adm: '<div>a</div>', crid: 'c1', w: 300, h: 250 },
              { id: 's2', impid: 'bid-2', price: 4.0, adm: '<div>b</div>', crid: 'c2', w: 728, h: 90 },
            ],
          }],
        },
      };

      const interpreted = spec.interpretResponse(response, multiRequest);
      expect(interpreted.map((b) => b.requestId)).to.deep.equal(['bid-1', 'bid-2']);
      expect(interpreted.map((b) => b.cpm)).to.deep.equal([1.5, 4.0]);
    });
  });
});
