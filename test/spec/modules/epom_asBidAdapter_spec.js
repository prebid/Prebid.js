import { expect } from 'chai';
import { spec } from 'modules/epom_asBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config.js';
import { hook } from 'src/hook.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

// Prebid core plus the modules that register the ORTB processors the converter
// relies on — without them the floors, currency and consent assertions below
// would pass vacuously against processors that were never installed.
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

function videoBid(overrides = {}) {
  return bannerBid({
    mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } },
    sizes: [[640, 480]],
    ...overrides,
  });
}

function nativeBid(overrides = {}) {
  return bannerBid({
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } },
          ],
        },
      },
    },
    ...overrides,
  });
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

async function buildOne(bids) {
  return spec.buildRequests(bids, await addFPDToBidderRequest(bidderRequestFor(bids)));
}

describe('Epom Ad Server adapter', function () {
  before(function () {
    hook.ready();
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(newBidder(spec).callBids).to.be.a('function');
    });
  });

  describe('spec metadata', function () {
    it('declares the bidder code, GVL ID and the media types the ad server serves', function () {
      expect(spec.code).to.equal('epom_as');
      expect(spec.gvlid).to.equal(849);
      // Prebid will not offer a slot to a bidder that has not declared its media type, so
      // this list is what decides which auctions ever reach us — not the ad server.
      expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', 'native']);
    });

    // The POST is credentialed, so the ad server's identity cookie reaches the
    // auction; the disclosure is what a TCF vendor-849 check resolves to.
    it('discloses the device storage the credentialed request relies on', function () {
      expect(spec.disclosureURL).to.be.a('string').that.is.not.empty;
    });

    it('exposes the whole bidder surface', function () {
      expect(spec).to.have.property('isBidRequestValid').that.is.a('function');
      expect(spec).to.have.property('buildRequests').that.is.a('function');
      expect(spec).to.have.property('interpretResponse').that.is.a('function');
      expect(spec).to.have.property('getUserSyncs').that.is.a('function');
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
      expect(spec.isBidRequestValid(bannerBid({ params: { host: null, placementKey: PLACEMENT } }))).to.equal(false);
    });

    it('rejects a port outside the range a URL can carry', function () {
      // The shape alone would accept it, and `new URL()` then throws rather than returning
      // something unusable — buildRequests is not called inside a try, so one mistyped port in a
      // page's configuration would take the whole request down instead of costing a single bid.
      ['ads.example.com:0', 'ads.example.com:65536', 'ads.example.com:99999'].forEach((host) => {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host, placementKey: PLACEMENT },
        })), host).to.equal(false);
      });
      expect(spec.isBidRequestValid(bannerBid({
        params: { host: 'ads.example.com:65535', placementKey: PLACEMENT },
      }))).to.equal(true);
    });

    it('rejects a missing, empty or non-string placementKey', function () {
      expect(spec.isBidRequestValid(bannerBid({ params: { host: HOST } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { host: HOST, placementKey: '' } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { host: HOST, placementKey: 7 } }))).to.equal(false);
    });

    it('accepts a host with a port, as the Prebid Server schema does', function () {
      expect(spec.isBidRequestValid(bannerBid({ params: { host: 'ads.example.com:8443', placementKey: PLACEMENT } }))).to.equal(true);
    });

    // The host pattern is byte-identical to the one Prebid Server validates the
    // same parameter with, and that one accepts a single label — an internal
    // deployment reachable as `api-us` is a legitimate configuration.
    it('accepts a single-label host, as the Prebid Server schema does', function () {
      ['localhost', 'api-us'].forEach((host) => {
        expect(spec.isBidRequestValid(bannerBid({ params: { host, placementKey: PLACEMENT } })), host).to.equal(true);
      });
    });

    // The host is the only publisher-controlled part of the URL, so anything
    // that could carry a scheme, path, credentials or a query string would let
    // a page config redirect the payload elsewhere.
    it('rejects a host that is not a bare hostname', function () {
      const bad = [
        'https://ads.example.com',
        'ads.example.com/collect',
        'user@ads.example.com',
        'ads.example.com?x=1',
        'ads.example.com#f',
        '',
        ' ads.example.com',
        'ads.example.com/../evil.com',
        'ads.example.com:80x',
      ];
      bad.forEach((host) => {
        expect(spec.isBidRequestValid(bannerBid({ params: { host, placementKey: PLACEMENT } })), host).to.equal(false);
      });
    });

    describe('customParams', function () {
      it('accepts scalar values of every allowed type', function () {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: { section: 'sport', tier: 2, premium: true } },
        }))).to.equal(true);
      });

      it('accepts an empty object and an absent value', function () {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: {} },
        }))).to.equal(true);
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: undefined },
        }))).to.equal(true);
      });

      // No cap lives in the adapter, so a large-but-well-formed set is valid
      // here; the ad server applies its own ingest limits.
      it('accepts far more keys than the ad server will ingest', function () {
        const many = {};
        for (let i = 0; i < 40; i++) {
          many['k' + i] = 'v' + i;
        }
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: many },
        }))).to.equal(true);
      });

      it('rejects a customParams that is not an object', function () {
        ['section=sport', 42, null, true].forEach((customParams) => {
          expect(spec.isBidRequestValid(bannerBid({
            params: { host: HOST, placementKey: PLACEMENT, customParams },
          })), String(customParams)).to.equal(false);
        });
      });

      it('rejects an array, which stringifies to something no campaign matches', function () {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: [['section', 'sport']] },
        }))).to.equal(false);
      });

      it('rejects a non-scalar value', function () {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: { nested: { a: 1 } } },
        }))).to.equal(false);
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: { list: [1, 2] } },
        }))).to.equal(false);
      });
    });

    describe('bidFloor', function () {
      it('accepts a positive floor and an explicit zero', function () {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, bidFloor: 1.25 },
        }))).to.equal(true);
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, bidFloor: 0 },
        }))).to.equal(true);
      });

      it('rejects a negative floor, matching the schema minimum of 0', function () {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, bidFloor: -1 },
        }))).to.equal(false);
      });

      it('rejects a floor that is not a number', function () {
        ['1.25', null, NaN].forEach((bidFloor) => {
          expect(spec.isBidRequestValid(bannerBid({
            params: { host: HOST, placementKey: PLACEMENT, bidFloor },
          })), String(bidFloor)).to.equal(false);
        });
      });

      // The params schema declares no format for bidFloorCur, so the adapter
      // must not invent one and reject a bid the server would have accepted.
      it('does not police the shape of bidFloorCur', function () {
        expect(spec.isBidRequestValid(bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, bidFloor: 1, bidFloorCur: 'eur' },
        }))).to.equal(true);
      });
    });
  });

  describe('buildRequests', function () {
    it('returns nothing when there are no bids', function () {
      expect(spec.buildRequests([], bidderRequestFor([]))).to.deep.equal([]);
    });

    it('POSTs to https://{host}/hb/bid as text/plain with credentials', async function () {
      const requests = await buildOne([bannerBid()]);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT);
      // text/plain keeps the POST a simple request, so the browser skips the
      // CORS preflight; credentials carry an existing Epom identity.
      expect(requests[0].options.contentType).to.equal('text/plain');
      expect(requests[0].options.withCredentials).to.equal(true);
    });

    it('packs every ad unit of one host into a single request, one imp each', async function () {
      const requests = await buildOne([
        bannerBid(),
        bannerBid({ bidId: 'bid-2', adUnitCode: 'div-sidebar', params: { host: HOST, placementKey: '6d0e83b415' } }),
        bannerBid({ bidId: 'bid-3', adUnitCode: 'div-footer', params: { host: HOST, placementKey: 'ff0011aa22' } }),
      ]);

      expect(requests).to.have.lengthOf(1);
      const { imp } = requests[0].data;
      expect(imp).to.have.lengthOf(3);
      expect(imp.map((i) => i.id)).to.deep.equal(['bid-1', 'bid-2', 'bid-3']);
      expect(imp.map((i) => i.tagid)).to.deep.equal([PLACEMENT, '6d0e83b415', 'ff0011aa22']);
    });

    it('splits by host so impressions never reach the wrong deployment', async function () {
      const requests = await buildOne([
        bannerBid(),
        bannerBid({ bidId: 'bid-2', params: { host: OTHER_HOST, placementKey: '6d0e83b415' } }),
        bannerBid({ bidId: 'bid-3', params: { host: HOST, placementKey: 'ff0011aa22' } }),
      ]);

      expect(requests).to.have.lengthOf(2);
      const byUrl = Object.fromEntries(requests.map((r) => [r.url, r.data.imp.map((i) => i.id)]));
      expect(byUrl[ENDPOINT]).to.deep.equal(['bid-1', 'bid-3']);
      expect(byUrl[`https://${OTHER_HOST}/hb/bid`]).to.deep.equal(['bid-2']);
    });

    it('carries banner sizes through to imp.banner.format', async function () {
      const requests = await buildOne([bannerBid()]);

      expect(requests[0].data.imp[0].banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 728, h: 90 },
      ]);
    });

    // A mixed ad unit now offers both, and the ad server answers with whichever it
    // filled — the bid's mtype says which. Stripping video here, as this adapter did
    // while it sold banner only, would decide the auction on the page's behalf.
    it('offers both formats for a mixed banner+video ad unit', async function () {
      const requests = await buildOne([bannerBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { context: 'outstream', playerSize: [[640, 480]], mimes: ['video/mp4'] },
        },
      })]);

      expect(requests[0].data.imp[0].banner).to.exist;
      if (FEATURES.VIDEO) {
        expect(requests[0].data.imp[0].video).to.exist;
        expect(requests[0].data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
      }
    });

    it('defaults the request currency to USD', async function () {
      const requests = await buildOne([bannerBid()]);

      expect(requests[0].data.cur).to.deep.equal(['USD']);
    });

    // USD is a default, not an override: once the currency module is active it
    // owns request.cur, and the adapter must leave what it set alone.
    it('leaves a request currency set by the currency module alone', async function () {
      config.setConfig({ currency: { adServerCurrency: 'USD' } });
      try {
        const requests = await buildOne([bannerBid()]);

        expect(requests[0].data.cur).to.deep.equal(['USD']);
      } finally {
        config.resetConfig();
      }
    });

    it('forwards the page URL from refererInfo', async function () {
      const requests = await buildOne([bannerBid()]);

      expect(requests[0].data.site.page).to.equal('https://publisher.example.com/article');
    });

    describe('floors', function () {
      it('applies params.bidFloor when no floors module value is present', async function () {
        const requests = await buildOne([bannerBid({ params: { host: HOST, placementKey: PLACEMENT, bidFloor: 1.25 } })]);

        expect(requests[0].data.imp[0].bidfloor).to.equal(1.25);
        expect(requests[0].data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('honours params.bidFloorCur', async function () {
        const requests = await buildOne([bannerBid({ params: { host: HOST, placementKey: PLACEMENT, bidFloor: 2, bidFloorCur: 'EUR' } })]);

        expect(requests[0].data.imp[0].bidfloorcur).to.equal('EUR');
      });

      // 0 is the schema's way of saying "no floor", so nothing goes on the wire
      // and the ad server is left to apply its own.
      it('treats a bidFloor of 0 as no floor', async function () {
        const requests = await buildOne([bannerBid({ params: { host: HOST, placementKey: PLACEMENT, bidFloor: 0 } })]);

        expect(requests[0].data.imp[0].bidfloor).to.equal(undefined);
        expect(requests[0].data.imp[0].bidfloorcur).to.equal(undefined);
      });

      it('lets the Price Floors module win over params.bidFloor', async function () {
        const requests = await buildOne([bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, bidFloor: 1.25 },
          getFloor: () => ({ currency: 'USD', floor: 3.5 }),
        })]);

        expect(requests[0].data.imp[0].bidfloor).to.equal(3.5);
      });

      // The adapter pins only the request currency, never the floor's: a module
      // floor quoted in another currency travels verbatim, with its own
      // bidfloorcur, rather than being reinterpreted as USD.
      it('passes a non-USD floors module value through with its own currency', async function () {
        const requests = await buildOne([bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, bidFloor: 1.25, bidFloorCur: 'USD' },
          getFloor: () => ({ currency: 'EUR', floor: 2.2 }),
        })]);

        expect(requests[0].data.imp[0].bidfloor).to.equal(2.2);
        expect(requests[0].data.imp[0].bidfloorcur).to.equal('EUR');
      });
    });

    describe('channel and custom params', function () {
      it('sends the channel under our own namespace', async function () {
        const requests = await buildOne([bannerBid({ params: { host: HOST, placementKey: PLACEMENT, channel: 'sports-uk' } })]);

        expect(requests[0].data.imp[0].ext.epom_as.channel).to.equal('sports-uk');
      });

      it('omits an empty channel rather than sending a blank one', async function () {
        const requests = await buildOne([bannerBid({ params: { host: HOST, placementKey: PLACEMENT, channel: '' } })]);

        expect(requests[0].data.imp[0].ext?.epom_as).to.equal(undefined);
      });

      // Custom params share imp.ext.data with first-party data and RTD modules, so the
      // ad server has one place to read targetable key-values from.
      it('merges custom params into imp.ext.data as strings', async function () {
        const requests = await buildOne([bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: { section: 'sport', tier: 2, premium: true } },
        })]);

        expect(requests[0].data.imp[0].ext.data).to.deep.equal({
          section: 'sport', tier: '2', premium: 'true',
        });
      });

      // Nothing is capped or dropped in the adapter — a publisher who configures
      // more keys than the ad server ingests sees them all leave the page, and
      // which ones survive is the ad server's documented decision, not a
      // nondeterministic one taken here.
      it('keeps every scalar entry, well past the ad server ingest limit', async function () {
        const many = {};
        for (let i = 0; i < 40; i++) {
          many['k' + i] = 'v' + i;
        }
        const requests = await buildOne([bannerBid({ params: { host: HOST, placementKey: PLACEMENT, customParams: many } })]);

        const sent = requests[0].data.imp[0].ext.data;
        expect(Object.keys(sent)).to.have.lengthOf(40);
        expect(sent.k0).to.equal('v0');
        expect(sent.k39).to.equal('v39');
      });

      it('lets first-party data on the impression win over a custom param of the same name', async function () {
        const requests = await buildOne([bannerBid({
          params: { host: HOST, placementKey: PLACEMENT, customParams: { section: 'sport', tier: '2' } },
          ortb2Imp: { ext: { data: { section: 'news' } } },
        })]);

        expect(requests[0].data.imp[0].ext.data.section).to.equal('news');
        expect(requests[0].data.imp[0].ext.data.tier).to.equal('2');
      });

      it('sends no imp.ext.data for an empty customParams object', async function () {
        const requests = await buildOne([bannerBid({ params: { host: HOST, placementKey: PLACEMENT, customParams: {} } })]);

        expect(requests[0].data.imp[0].ext?.data).to.equal(undefined);
      });

      it('adds nothing when neither is configured', async function () {
        const requests = await buildOne([bannerBid()]);

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
      request = (await buildOne([bannerBid()]))[0];
    });

    it('returns nothing for an empty response', function () {
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
      expect(spec.interpretResponse(undefined, request)).to.deep.equal([]);
    });

    // A misconfigured host or a proxy in front of the ad server answers with
    // something that is not OpenRTB at all. That must cost the auction one
    // bidder, not throw out of the whole response handler.
    it('returns nothing for a non-ORTB body', function () {
      const htmlErrorPage = '<!doctype html><html><body><h1>502 Bad Gateway</h1></body></html>';
      expect(spec.interpretResponse({ body: htmlErrorPage }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: 'no bid' }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: 42 }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: [] }, request)).to.deep.equal([]);
    });

    it('returns nothing when the body carries no seatbid at all', function () {
      expect(spec.interpretResponse({ body: { id: request.data.id } }, request)).to.deep.equal([]);
    });

    it('returns nothing when the ad server has no bid', function () {
      const response = { body: { id: request.data.id, seatbid: [], cur: 'USD' } };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    // mtype is what tells the converter which kind of creative came back. The ad server
    // stamps it per creative; without it a bid is discarded rather than guessed at, which
    // is why every fixture here carries one.
    it('reads a video bid back as video, with the VAST document as its markup', async function () {
      const videoRequest = (await buildOne([videoBid()]))[0];
      const vast = '<VAST version="4.0"><Ad><InLine/></Ad></VAST>';
      const response = {
        body: {
          id: videoRequest.data.id,
          cur: 'USD',
          seatbid: [{ bid: [{ id: 's1', impid: 'bid-1', price: 12, adm: vast, crid: 'c1', w: 640, h: 480, mtype: 2 }] }],
        },
      };
      const bids = spec.interpretResponse(response, videoRequest);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal('video');
      // The VAST itself is only unpacked when the build carries video support; the media
      // type is decided above it either way.
      if (FEATURES.VIDEO) {
        expect(bids[0].vastXml).to.equal(vast);
      }
    });

    it('reads a native bid back as native, with the assets the page asked for', async function () {
      const nativeRequest = (await buildOne([nativeBid()]))[0];
      const adm = JSON.stringify({
        assets: [
          { id: 1, required: 1, title: { text: 'Northwind Autumn Sale' } },
          { id: 2, required: 1, img: { url: 'https://cdn.test/main.jpg', w: 1200, h: 627 } },
        ],
        link: { url: 'https://ads.test/click' },
        imptrackers: ['https://ads.test/imp'],
      });
      const response = {
        body: {
          id: nativeRequest.data.id,
          cur: 'USD',
          seatbid: [{ bid: [{ id: 's1', impid: 'bid-1', price: 4, adm, crid: 'c1', mtype: 4 }] }],
        },
      };
      const bids = spec.interpretResponse(response, nativeRequest);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal('native');
      if (FEATURES.NATIVE) {
        // The renderer matches a response asset to a requested one by id alone.
        expect(bids[0].native.ortb.assets.map((a) => a.id)).to.deep.equal([1, 2]);
      }
    });

    it('discards a bid that names no media type rather than rendering it as the wrong one', function () {
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{ bid: [{ id: 's1', impid: 'bid-1', price: 1, adm: '<div>a</div>', crid: 'c1', w: 300, h: 250 }] }],
        },
      };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    it('returns nothing for a seatbid entry with no bids', function () {
      const response = { body: { id: request.data.id, seatbid: [{ seat: 'epom' }], cur: 'USD' } };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    // fromORTB matches bids to impressions by impid; a bid naming an impression
    // that is not in this request belongs to some other auction.
    it('drops a bid whose impid matches no impression in the request', function () {
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{ bid: [{ id: 's1', impid: 'not-our-imp', price: 3, adm: '<div>x</div>', crid: 'c1', w: 300, h: 250, mtype: 1 }] }],
        },
      };

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
              mtype: 1,
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
      expect(bids[0].ttl).to.equal(25);
      // Derived from bid.adomain by the converter — Epom Ad Server does not
      // populate it today, so this pins the wiring rather than the ad server.
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.example.com']);
    });

    // Today's ad server sends no adomain, so nothing is fabricated in its place —
    // the field is simply absent, and a brand-safety line item keyed on it will
    // not match an Epom bid until the ad server starts populating it.
    it('leaves advertiserDomains unset when the ad server sends no adomain', function () {
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{ bid: [{ id: 's1', impid: 'bid-1', price: 1, adm: '<div>a</div>', crid: 'c1', w: 300, h: 250, mtype: 1 }] }],
        },
      };

      const bid = spec.interpretResponse(response, request)[0];
      expect(bid.meta).to.be.an('object');
      expect(bid.meta.advertiserDomains).to.equal(undefined);
    });

    // The 25s default is the impression beacon's window, not a ceiling: a
    // deployment configured wider says so per bid.
    it('honours a per-bid exp over the default ttl', function () {
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{ bid: [{ id: 's1', impid: 'bid-1', price: 1, adm: '<div>a</div>', crid: 'c1', w: 300, h: 250, mtype: 1, exp: 120 }] }],
        },
      };

      expect(spec.interpretResponse(response, request)[0].ttl).to.equal(120);
    });

    it('honours a response currency other than the requested one', function () {
      const response = {
        body: {
          id: request.data.id,
          cur: 'EUR',
          seatbid: [{ bid: [{ id: 's1', impid: 'bid-1', price: 1.8, adm: '<div>a</div>', crid: 'c1', w: 300, h: 250, mtype: 1 }] }],
        },
      };

      expect(spec.interpretResponse(response, request)[0].currency).to.equal('EUR');
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
              mtype: 1,
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
      const multiRequest = (await buildOne([
        bannerBid(),
        bannerBid({ bidId: 'bid-2', adUnitCode: 'div-sidebar', params: { host: HOST, placementKey: '6d0e83b415' } }),
      ]))[0];
      const response = {
        body: {
          id: multiRequest.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [
              { id: 's1', impid: 'bid-1', price: 1.5, adm: '<div>a</div>', crid: 'c1', w: 300, h: 250, mtype: 1 },
              { id: 's2', impid: 'bid-2', price: 4.0, adm: '<div>b</div>', crid: 'c2', w: 728, h: 90, mtype: 1 },
            ],
          }],
        },
      };

      const interpreted = spec.interpretResponse(response, multiRequest);
      expect(interpreted.map((b) => b.requestId)).to.deep.equal(['bid-1', 'bid-2']);
      expect(interpreted.map((b) => b.cpm)).to.deep.equal([1.5, 4.0]);
    });
  });

  describe('getUserSyncs', function () {
    it('registers no user syncs', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [])).to.deep.equal([]);
    });
  });
});
