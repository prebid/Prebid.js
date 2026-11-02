/// <reference types="mocha" />
import { expect } from 'chai';
import type { Bid } from '../../../src/bidfactory.js';
import { server } from '../../mocks/xhr.js';
import { config } from '../../../src/config.js';
import { spec, fillPriceMacros, getEndpoint } from '../../../modules/melvadBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';

const ENDPOINT = 'https://pub.supplier.melvad.com/prebid';
// the OpenRTB macros of our links, spelled apart from a template string for the linter
const PRICE_MACRO = '$' + '{AUCTION_PRICE}';
const CURRENCY_MACRO = '$' + '{AUCTION_CURRENCY}';
const WIN_LINK = `https://pub.supplier.melvad.com/win/abc?price=${PRICE_MACRO}&cur=${CURRENCY_MACRO}`;
const BILLING_LINK = `https://pub.supplier.melvad.com/bill/abc?price=${PRICE_MACRO}&cur=${CURRENCY_MACRO}`;

function bannerBid(overrides: Record<string, unknown> = {}) {
  return {
    bidder: 'melvad',
    bidId: 'bid-banner',
    bidderRequestId: 'req-1',
    auctionId: 'auction-1',
    adUnitCode: 'banner-div',
    transactionId: 'tx-1',
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    sizes: [[300, 250], [728, 90]],
    params: { placementId: 'pl-banner' },
    ...overrides,
  } as any;
}

const NATIVE_REQUEST = {
  ver: '1.2',
  assets: [
    { id: 1, required: 1, title: { len: 25 } },
    { id: 2, required: 1, img: { type: 3, wmin: 1200, hmin: 627 } },
  ],
};

function nativeBid() {
  return {
    bidder: 'melvad',
    bidId: 'bid-native',
    bidderRequestId: 'req-1',
    auctionId: 'auction-1',
    adUnitCode: 'native-div',
    transactionId: 'tx-2',
    mediaTypes: { native: { ortb: NATIVE_REQUEST } },
    // the core derives the ORTB native request of the ad unit before the adapter sees the bid request
    nativeOrtbRequest: NATIVE_REQUEST,
    params: { placementId: 'pl-native' },
  } as any;
}

function videoBid() {
  return {
    bidder: 'melvad',
    bidId: 'bid-video',
    bidderRequestId: 'req-1',
    auctionId: 'auction-1',
    adUnitCode: 'video-div',
    transactionId: 'tx-3',
    mediaTypes: {
      video: { context: 'instream', playerSize: [640, 360], mimes: ['video/mp4'], protocols: [2, 3], plcmt: 1 },
    },
    params: { placementId: 'pl-video' },
  } as any;
}

function bidderRequest(bids: any[]) {
  return {
    bidderCode: 'melvad',
    auctionId: 'auction-1',
    bidderRequestId: 'req-1',
    bids,
    timeout: 1000,
    refererInfo: { page: 'https://publisher.example/article', domain: 'publisher.example', ref: '' },
    ortb2: { site: { page: 'https://publisher.example/article', domain: 'publisher.example' } },
  } as any;
}

function sspBid(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aid-1',
    impid: 'bid-banner',
    price: 80,
    crid: 'creative-1',
    w: 300,
    h: 250,
    exp: 3600,
    adomain: ['advertiser.example'],
    adm: `<div>ad</div><img src="https://pub.supplier.melvad.com/bill/abc?price=${PRICE_MACRO}">`,
    nurl: WIN_LINK,
    burl: BILLING_LINK,
    ext: { melvad: { mediaType: 'banner' } },
    ...overrides,
  };
}

// cur null leaves the currency out of the response
function sspResponse(bids: any[], cur: string | null = 'RUB') {
  const body: any = { id: 'net-1', bidid: 'aid', seatbid: [{ seat: 'dsp-7', bid: bids }] };
  if (cur !== null) {
    body.cur = cur;
  }
  return { body, headers: { get: () => '' } } as any;
}

describe('melvadBidAdapter', () => {
  afterEach(() => {
    config.resetConfig();
  });

  describe('isBidRequestValid', () => {
    it('accepts a placementId', () => {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });

    it('trims the placementId', () => {
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: '  pl-1 ' } }))).to.equal(true);
    });

    it('rejects a missing, empty or non-string placementId', () => {
      expect(spec.isBidRequestValid(bannerBid({ params: {} }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: '   ' } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: 200 } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: undefined }))).to.equal(false);
    });

    it('rejects an overlong placementId', () => {
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: 'x'.repeat(65) } }))).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('posts one OpenRTB request as text/plain without credentials', () => {
      const request = spec.buildRequests([bannerBid()], bidderRequest([bannerBid()])) as any;
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.options.contentType).to.equal('text/plain');
      expect(request.options.withCredentials).to.equal(false);
      expect(request.data.id).to.be.a('string').and.not.equal('');
    });

    it('uses the configured endpoint', () => {
      config.setConfig({ melvad: { endpoint: 'https://ssp.example/prebid' } });
      expect(getEndpoint()).to.equal('https://ssp.example/prebid');
      const request = spec.buildRequests([bannerBid()], bidderRequest([bannerBid()])) as any;
      expect(request.url).to.equal('https://ssp.example/prebid');
    });

    it('marks the request as first price with the contract version', () => {
      const request = spec.buildRequests([bannerBid()], bidderRequest([bannerBid()])) as any;
      expect(request.data.at).to.equal(1);
      expect(request.data.ext.melvad.contractVersion).to.equal(1);
      expect(request.data.tmax).to.equal(1000);
    });

    it('builds a banner imp with the placement and the sizes', () => {
      const request = spec.buildRequests([bannerBid()], bidderRequest([bannerBid()])) as any;
      expect(request.data.imp).to.have.lengthOf(1);
      const imp = request.data.imp[0];
      expect(imp.id).to.equal('bid-banner');
      expect(imp.ext.melvad.placementId).to.equal('pl-banner');
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(imp.video).to.equal(undefined);
      expect(imp.native).to.equal(undefined);
    });

    it('trims the placement in the imp', () => {
      const bid = bannerBid({ params: { placementId: ' pl-banner ' } });
      const request = spec.buildRequests([bid], bidderRequest([bid])) as any;
      expect(request.data.imp[0].ext.melvad.placementId).to.equal('pl-banner');
    });

    if (FEATURES.NATIVE) {
      it('builds a native imp with the ORTB request', () => {
        const request = spec.buildRequests([nativeBid()], bidderRequest([nativeBid()])) as any;
        const imp = request.data.imp[0];
        expect(imp.id).to.equal('bid-native');
        expect(imp.native).to.be.an('object');
        const nativeRequest = JSON.parse(imp.native.request);
        expect(nativeRequest.assets).to.have.lengthOf(2);
        expect(nativeRequest.assets[1].img.type).to.equal(3);
      });
    }

    if (FEATURES.VIDEO) {
      it('builds a video imp from the player parameters', () => {
        const request = spec.buildRequests([videoBid()], bidderRequest([videoBid()])) as any;
        const imp = request.data.imp[0];
        expect(imp.id).to.equal('bid-video');
        expect(imp.video.w).to.equal(640);
        expect(imp.video.h).to.equal(360);
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3]);
        expect(imp.video.plcmt).to.equal(1);
      });
    }

    it('groups several impressions into one request', () => {
      const bids = [bannerBid(), nativeBid(), videoBid()];
      const request = spec.buildRequests(bids, bidderRequest(bids)) as any;
      expect(request.data.imp.map((imp: any) => imp.id)).to.deep.equal(['bid-banner', 'bid-native', 'bid-video']);
    });

    it('passes the page and the first party user through', () => {
      const bidder = bidderRequest([bannerBid()]);
      bidder.ortb2.user = { buyeruid: '213ba1a2425be71ec5080b1d64b8450c' };
      const request = spec.buildRequests([bannerBid()], bidder) as any;
      expect(request.data.site.page).to.equal('https://publisher.example/article');
      expect(request.data.user.buyeruid).to.equal('213ba1a2425be71ec5080b1d64b8450c');
    });
  });

  describe('interpretResponse', () => {
    function interpret(response: any, bids: any[] = [bannerBid()]) {
      const request = spec.buildRequests(bids, bidderRequest(bids));
      return spec.interpretResponse(response, request as any) as any[];
    }

    it('returns no bids for an empty body (204)', () => {
      expect(interpret({ body: '', headers: { get: () => '' } })).to.deep.equal([]);
      expect(interpret({ body: undefined, headers: { get: () => '' } })).to.deep.equal([]);
      expect(interpret({ body: {}, headers: { get: () => '' } })).to.deep.equal([]);
    });

    it('turns a banner bid into a Prebid bid with its links', () => {
      const bids = interpret(sspResponse([sspBid()]));
      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.requestId).to.equal('bid-banner');
      expect(bid.cpm).to.equal(80);
      expect(bid.currency).to.equal('RUB');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.creativeId).to.equal('creative-1');
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.ad).to.contain('<div>ad</div>');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
      expect(bid.melvad).to.deep.equal({ win: WIN_LINK, billing: BILLING_LINK });
      expect(bid.nurl).to.equal(undefined);
      expect(bid.burl).to.equal(undefined);
    });

    it('caps the ttl at 300 seconds and keeps a shorter exp', () => {
      expect(interpret(sspResponse([sspBid({ exp: 3600 })]))[0].ttl).to.equal(300);
      expect(interpret(sspResponse([sspBid({ exp: 60 })]))[0].ttl).to.equal(60);
    });

    it('drops a bid without exp', () => {
      expect(interpret(sspResponse([sspBid({ exp: undefined })]))).to.deep.equal([]);
      expect(interpret(sspResponse([sspBid({ exp: 0 })]))).to.deep.equal([]);
    });

    it('drops a bid without a price', () => {
      expect(interpret(sspResponse([sspBid({ price: 0 })]))).to.deep.equal([]);
      expect(interpret(sspResponse([sspBid({ price: undefined })]))).to.deep.equal([]);
    });

    it('drops a bid without markup', () => {
      expect(interpret(sspResponse([sspBid({ adm: '' })]))).to.deep.equal([]);
      expect(interpret(sspResponse([sspBid({ adm: undefined })]))).to.deep.equal([]);
    });

    it('drops the bids of a response without a currency', () => {
      expect(interpret(sspResponse([sspBid()], null))).to.deep.equal([]);
      expect(interpret(sspResponse([sspBid()], ''))).to.deep.equal([]);
    });

    it('keeps our links out of the banner markup', () => {
      const bid = interpret(sspResponse([sspBid()]))[0];
      expect(bid.ad).to.not.contain('/win/abc');
      expect(bid.ad.startsWith('<div>ad</div>')).to.equal(true);
    });

    it('fills our price macros of the banner markup with the price and the currency of the response', () => {
      const bid = interpret(sspResponse([sspBid({ adm: `<div>ad</div><img src="https://pub.supplier.melvad.com/bill/abc?price=${PRICE_MACRO}&cur=${CURRENCY_MACRO}">` })]))[0];
      expect(bid.ad).to.contain('/bill/abc?price=80&cur=RUB');
      expect(bid.ad).to.not.contain(PRICE_MACRO);
    });

    it('keeps the API frameworks, the attributes and the ORD marking of the bid for the page', () => {
      const bid = interpret(sspResponse([sspBid({
        api: 5, attr: [1, 16], ext: { melvad: { mediaType: 'banner' }, nroa: { erid: '2SDnjdXyz12', client: { inn: '7700000000', name: 'ООО «Рекламодатель»' } } },
      })]))[0];
      expect(bid.melvad).to.deep.equal({
        win: WIN_LINK, billing: BILLING_LINK, api: [5], attr: [1, 16], nroa: { erid: '2SDnjdXyz12', inn: '7700000000', name: 'ООО «Рекламодатель»' },
      });
      const list = interpret(sspResponse([sspBid({ api: [5, 6], ext: { melvad: { mediaType: 'banner' }, nroa: { erid: ' e2 ' } } })]))[0];
      expect(list.melvad.api).to.deep.equal([5, 6]);
      expect(list.melvad.nroa).to.deep.equal({ erid: 'e2' });
      const bare = interpret(sspResponse([sspBid({ api: 0, attr: [], ext: { melvad: { mediaType: 'banner' }, nroa: { client: {} } } })]))[0];
      expect(bare.melvad).to.deep.equal({ win: WIN_LINK, billing: BILLING_LINK });
      // bid.melvad is part of the public bid type: no cast is needed to read it
      const typed: Bid = bid;
      expect(typed.melvad?.nroa?.erid).to.equal('2SDnjdXyz12');
    });

    it('drops a bid of an unknown impression and keeps the others', () => {
      const bids = interpret(sspResponse([sspBid({ impid: 'unknown' }), sspBid({ id: 'aid-2' })]));
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('bid-banner');
    });

    it('drops a bid of a format the impression did not ask for', () => {
      const bids = interpret(sspResponse([sspBid({ ext: { melvad: { mediaType: 'video' } }, adm: '<VAST/>' })]));
      expect(bids).to.deep.equal([]);
    });

    it('drops a bid without a known media type', () => {
      expect(interpret(sspResponse([sspBid({ ext: {} })]))).to.deep.equal([]);
      expect(interpret(sspResponse([sspBid({ ext: { melvad: { mediaType: 'audio' } } })]))).to.deep.equal([]);
    });

    it('takes the ORTB mtype when the SSP names no media type', () => {
      const bids = interpret(sspResponse([sspBid({ ext: {}, mtype: 1 })]));
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
    });

    it('answers several impressions in any order, partially', () => {
      const requested = [bannerBid(), videoBid()];
      const bids = interpret(sspResponse([
        sspBid({ id: 'aid-v', impid: 'bid-video', adm: '<VAST version="3.0"></VAST>', ext: { melvad: { mediaType: 'video' } } }),
        sspBid(),
      ]), requested);
      expect(bids.map((bid) => bid.requestId)).to.deep.equal(['bid-video', 'bid-banner']);
    });

    if (FEATURES.NATIVE) {
      it('turns a native bid into native.ortb', () => {
        const markup = {
          native: {
            ver: '1.2',
            assets: [{ id: 1, title: { text: 'Melvad' } }, { id: 2, img: { url: 'https://cdn.example/a.png', w: 1200, h: 627 } }],
            link: { url: 'https://pub.supplier.melvad.com/click/abc' },
            eventtrackers: [{ event: 1, method: 1, url: 'https://pub.supplier.melvad.com/imp/abc' }],
          },
        };
        const bids = interpret(sspResponse([sspBid({ impid: 'bid-native', adm: JSON.stringify(markup.native), ext: { melvad: { mediaType: 'native' } }, w: undefined, h: undefined })]), [nativeBid()]);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(bids[0].native.ortb.assets).to.have.lengthOf(2);
        expect(bids[0].native.ortb.link.url).to.equal('https://pub.supplier.melvad.com/click/abc');
      });
    }

    it('drops a native bid with broken JSON', () => {
      const bids = interpret(sspResponse([sspBid({ impid: 'bid-native', adm: '{not json', ext: { melvad: { mediaType: 'native' } } })]), [nativeBid()]);
      expect(bids).to.deep.equal([]);
    });

    if (FEATURES.VIDEO) {
      it('turns a video bid into vastXml only', () => {
        const vast = '<VAST version="3.0"><Ad id="1"><InLine></InLine></Ad></VAST>';
        const bids = interpret(sspResponse([sspBid({ impid: 'bid-video', adm: vast, w: 640, h: 360, ext: { melvad: { mediaType: 'video' } } })]), [videoBid()]);
        expect(bids).to.have.lengthOf(1);
        const bid = bids[0];
        expect(bid.mediaType).to.equal(VIDEO);
        expect(bid.vastXml).to.equal(vast);
        expect(bid.vastUrl).to.equal(undefined);
        expect(bid.playerWidth).to.equal(640);
        expect(bid.playerHeight).to.equal(360);
        expect(bid.melvad.win).to.equal(WIN_LINK);
      });
    }
  });

  describe('events', () => {
    // ajax is rewritten at build time (plugins/callerContext.js) and cannot be stubbed: the requests are read from
    // the global fetch mock
    const notices = () => server.requests.map((req: any) => ({ url: req.url, method: req.method, keepalive: req.fetch.request.keepalive }));

    const wonBid = () => ({
      cpm: 80,
      currency: 'RUB',
      melvad: { win: WIN_LINK, billing: BILLING_LINK },
    } as any);

    it('calls the win link with the price on bidWon', () => {
      spec.onBidWon(wonBid());
      expect(notices()).to.deep.equal([{ url: 'https://pub.supplier.melvad.com/win/abc?price=80&cur=RUB', method: 'GET', keepalive: true }]);
    });

    it('calls the billing link on billable', () => {
      spec.onBidBillable(wonBid());
      expect(notices()).to.deep.equal([{ url: 'https://pub.supplier.melvad.com/bill/abc?price=80&cur=RUB', method: 'GET', keepalive: true }]);
    });

    it('uses the original price when the currency module converted the bid', () => {
      const bid = wonBid();
      bid.cpm = 1.1;
      bid.currency = 'USD';
      bid.originalCpm = 80;
      bid.originalCurrency = 'RUB';
      spec.onBidWon(bid);
      expect(notices()).to.deep.equal([{ url: 'https://pub.supplier.melvad.com/win/abc?price=80&cur=RUB', method: 'GET', keepalive: true }]);
    });

    it('calls nothing without links', () => {
      spec.onBidWon({ cpm: 1, currency: 'USD' } as any);
      spec.onBidBillable({ cpm: 1, currency: 'USD', melvad: {} } as any);
      expect(server.requests).to.have.length(0);
    });

    it('fills the macros once each', () => {
      expect(fillPriceMacros(`https://x/y?p=${PRICE_MACRO}&c=${CURRENCY_MACRO}&q=${PRICE_MACRO}`, { cpm: 2.5, currency: 'EUR' } as any))
        .to.equal('https://x/y?p=2.5&c=EUR&q=2.5');
    });
  });

  describe('getUserSyncs', () => {
    it('runs no sync of its own', () => {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [], null, null, null, false)).to.deep.equal([]);
    });
  });
});
