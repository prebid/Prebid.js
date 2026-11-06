import { expect } from 'chai';
import { spec } from 'modules/boldwinxBidAdapter.ts';
import { setConfig as setCurrencyConfig } from 'modules/currency.js';
import 'modules/priceFloors.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';

const BID_URL = 'https://pbjs.algotoro.com/bid';
const SYNC_URL = 'https://pbjs.algotoro.com/usersync';

const VIDEO_PARAMS = { context: 'instream', playerSize: [640, 480], mimes: ['video/mp4'], protocols: [2, 3, 5, 6] };
const NATIVE_REQUEST = {
  ver: '1.2',
  assets: [
    { id: 1, required: 1, title: { len: 90 } },
    { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
  ],
};
const VAST = '<VAST version="3.0"><Ad><InLine></InLine></Ad></VAST>';
const NATIVE_ADM = JSON.stringify({
  ver: '1.2',
  assets: [{ id: 1, title: { text: 'Title' } }, { id: 2, img: { url: 'https://cdn.example.com/img.png', w: 300, h: 250 } }],
  link: { url: 'https://example.com/click' },
  imptrackers: ['https://example.com/imp'],
});

function makeBid(overrides = {}) {
  return {
    bidder: 'boldwinx',
    bidId: 'bid-1',
    adUnitCode: 'div-1',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    params: { epid: '1234' },
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    ...overrides,
  };
}

function makeBidderRequest(bids, overrides = {}) {
  return {
    bidderCode: 'boldwinx',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    bids,
    timeout: 1000,
    refererInfo: { page: 'https://example.com/page', domain: 'example.com' },
    ortb2: { site: { page: 'https://example.com/page', domain: 'example.com' } },
    ...overrides,
  };
}

function buildRequests(bids, bidderRequestOverrides = {}) {
  return spec.buildRequests(bids, makeBidderRequest(bids, bidderRequestOverrides));
}

function makeResponse(request, bids) {
  return {
    body: {
      id: request.data.id,
      cur: 'USD',
      seatbid: [{ seat: 'boldwin', bid: bids }],
    },
  };
}

describe('boldwinx bid adapter', function () {
  describe('spec', function () {
    it('registers the bidder code, GVL ID and media types', function () {
      expect(spec.code).to.equal('boldwinx');
      expect(spec.gvlid).to.equal(1151);
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE]);
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a non-empty string epid', function () {
      expect(spec.isBidRequestValid(makeBid({ params: { epid: '1234' } }))).to.equal(true);
    });

    it('accepts a numeric epid', function () {
      expect(spec.isBidRequestValid(makeBid({ params: { epid: 1234 } }))).to.equal(true);
    });

    it('rejects a missing, empty or malformed epid', function () {
      expect(spec.isBidRequestValid(makeBid({ params: {} }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { epid: '' } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { epid: NaN } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: { epid: { id: 1 } } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid({ params: undefined }))).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('posts one OpenRTB request with epid in the URL', function () {
      const requests = buildRequests([makeBid()]);
      expect(requests).to.have.lengthOf(1);
      const [request] = requests;
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(`${BID_URL}?epid=1234`);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(request.data.cur).to.deep.equal(['USD']);
      expect(request.data.site.page).to.equal('https://example.com/page');
    });

    it('url-encodes the epid', function () {
      const [request] = buildRequests([makeBid({ params: { epid: 'a b&c' } })]);
      expect(request.url).to.equal(`${BID_URL}?epid=a%20b%26c`);
    });

    it('sends every bid in its own request, even when bids share an epid', function () {
      const bids = [
        makeBid({ bidId: 'bid-1', params: { epid: '1' } }),
        makeBid({ bidId: 'bid-2', params: { epid: '2' } }),
        makeBid({ bidId: 'bid-3', params: { epid: 1 } }),
      ];
      const requests = buildRequests(bids);
      expect(requests.map((request) => request.url)).to.deep.equal([`${BID_URL}?epid=1`, `${BID_URL}?epid=2`, `${BID_URL}?epid=1`]);
      requests.forEach((request) => expect(request.data.imp).to.have.lengthOf(1));
      expect(new Set(requests.map((request) => request.data.id)).size).to.equal(3);
    });

    it('builds video and native impressions', function () {
      const bids = [
        makeBid({ bidId: 'bid-v', mediaTypes: { video: VIDEO_PARAMS } }),
        makeBid({ bidId: 'bid-n', mediaTypes: { native: { ortb: NATIVE_REQUEST } }, nativeOrtbRequest: NATIVE_REQUEST }),
      ];
      const [video, native] = buildRequests(bids).map((request) => request.data.imp[0]);
      expect(video.video).to.include({ w: 640, h: 480 });
      expect(video.video.mimes).to.deep.equal(['video/mp4']);
      expect(JSON.parse(native.native.request).assets).to.have.lengthOf(2);
    });

    it('passes consent, COPPA, schain and eids from first-party data', function () {
      const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'exchange.com', sid: '1', hp: 1 }] };
      const eids = [{ source: 'id5-sync.com', uids: [{ id: 'id5-id', atype: 1 }] }];
      const [request] = buildRequests([makeBid()], {
        ortb2: {
          regs: { coppa: 1, gpp: 'DBABTA~1YNN', gpp_sid: [7], ext: { gdpr: 1, us_privacy: '1YNN' } },
          source: { ext: { schain } },
          user: { ext: { consent: 'CONSENT', eids } },
        },
      });
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('CONSENT');
      expect(request.data.regs.ext.us_privacy).to.equal('1YNN');
      expect(request.data.regs.gpp).to.equal('DBABTA~1YNN');
      expect(request.data.regs.gpp_sid).to.deep.equal([7]);
      expect(request.data.regs.coppa).to.equal(1);
      expect(request.data.source.ext.schain).to.deep.equal(schain);
      expect(request.data.user.ext.eids).to.deep.equal(eids);
    });

    it('reads floors in USD', function () {
      const bid = makeBid({
        getFloor({ currency, mediaType, size }) {
          return { currency, floor: mediaType === '*' && size === '*' ? 1.5 : 0.5 };
        },
      });
      const [request] = buildRequests([bid]);
      expect(request.data.imp[0].bidfloor).to.equal(1.5);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('drops a floor that is not in USD', function () {
      const bid = makeBid({
        getFloor() {
          return { currency: 'EUR', floor: 2 };
        },
      });
      const [request] = buildRequests([bid]);
      expect(request.data.imp[0]).to.not.have.property('bidfloor');
      expect(request.data.imp[0]).to.not.have.property('bidfloorcur');
    });

    it('sets request.cur to USD regardless of the ad server currency', function () {
      setCurrencyConfig({ adServerCurrency: 'EUR' });
      try {
        const [request] = buildRequests([makeBid()]);
        expect(request.data.cur).to.deep.equal(['USD']);
      } finally {
        setCurrencyConfig({});
      }
    });

    it('returns nothing when there are no bids', function () {
      expect(buildRequests([])).to.deep.equal([]);
    });
  });

  describe('interpretResponse', function () {
    it('returns no bids for an empty or malformed body', function () {
      const [request] = buildRequests([makeBid()]);
      expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: undefined }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { id: request.data.id } }, request)).to.deep.equal([]);
    });

    it('converts a banner bid with mtype', function () {
      const [request] = buildRequests([makeBid()]);
      const response = makeResponse(request, [{
        id: 'b1',
        impid: request.data.imp[0].id,
        price: 1.25,
        adm: '<div>ad</div>',
        crid: 'cr-1',
        w: 300,
        h: 250,
        mtype: 1,
        adomain: ['advertiser.com'],
      }]);
      const [bid] = spec.interpretResponse(response, request);
      expect(bid).to.include({
        requestId: 'bid-1',
        cpm: 1.25,
        currency: 'USD',
        mediaType: BANNER,
        ad: '<div>ad</div>',
        creativeId: 'cr-1',
        width: 300,
        height: 250,
        netRevenue: true,
        ttl: 300,
      });
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('uses bid.exp as ttl when present', function () {
      const [request] = buildRequests([makeBid()]);
      const response = makeResponse(request, [{ id: 'b1', impid: request.data.imp[0].id, price: 1, adm: 'ad', crid: 'c', w: 300, h: 250, mtype: 1, exp: 60 }]);
      expect(spec.interpretResponse(response, request)[0].ttl).to.equal(60);
    });

    it('converts a video bid with VAST in adm and a VAST URL in nurl', function () {
      const [request] = buildRequests([makeBid({ mediaTypes: { video: VIDEO_PARAMS } })]);
      const impid = request.data.imp[0].id;
      const response = makeResponse(request, [
        { id: 'v1', impid, price: 3, adm: VAST, crid: 'cr-v', mtype: 2 },
      ]);
      const [bid] = spec.interpretResponse(response, request);
      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.vastXml).to.equal(VAST);
      expect(bid.playerWidth).to.equal(640);
      expect(bid.playerHeight).to.equal(480);

      const urlResponse = makeResponse(request, [{ id: 'v2', impid, price: 3, nurl: 'https://cdn.example.com/vast.xml', crid: 'cr-v', mtype: 2 }]);
      expect(spec.interpretResponse(urlResponse, request)[0].vastUrl).to.equal('https://cdn.example.com/vast.xml');
    });

    it('converts a native bid', function () {
      const [request] = buildRequests([makeBid({ mediaTypes: { native: { ortb: NATIVE_REQUEST } }, nativeOrtbRequest: NATIVE_REQUEST })]);
      const response = makeResponse(request, [{ id: 'n1', impid: request.data.imp[0].id, price: 2, adm: NATIVE_ADM, crid: 'cr-n', mtype: 4 }]);
      const [bid] = spec.interpretResponse(response, request);
      expect(bid.mediaType).to.equal(NATIVE);
      expect(bid.native.ortb.link.url).to.equal('https://example.com/click');
      expect(bid.native.ortb.assets).to.have.lengthOf(2);
    });

    describe('without mtype', function () {
      it('takes the media type from a single-format impression', function () {
        const bids = [
          makeBid({ bidId: 'bid-b' }),
          makeBid({ bidId: 'bid-v', mediaTypes: { video: VIDEO_PARAMS } }),
          makeBid({ bidId: 'bid-n', mediaTypes: { native: { ortb: NATIVE_REQUEST } }, nativeOrtbRequest: NATIVE_REQUEST }),
        ];
        const markups = [
          { adm: '<div>ad</div>', w: 300, h: 250 },
          { adm: VAST },
          { adm: NATIVE_ADM },
        ];
        const result = buildRequests(bids).flatMap((request, i) => {
          const response = makeResponse(request, [{ id: `b${i}`, impid: request.data.imp[0].id, price: 1, crid: 'c', ...markups[i] }]);
          return spec.interpretResponse(response, request);
        });
        expect(result.map((bid) => [bid.requestId, bid.mediaType])).to.deep.equal([
          ['bid-b', BANNER], ['bid-v', VIDEO], ['bid-n', NATIVE],
        ]);
      });

      it('inspects the markup for a multi-format impression', function () {
        const bid = makeBid({
          mediaTypes: { banner: { sizes: [[300, 250]] }, video: VIDEO_PARAMS, native: { ortb: NATIVE_REQUEST } },
          nativeOrtbRequest: NATIVE_REQUEST,
        });
        const [request] = buildRequests([bid]);
        const impid = request.data.imp[0].id;
        const cases = [
          [{ adm: VAST }, VIDEO],
          [{ adm: '<?xml version="1.0"?><VAST version="3.0"></VAST>' }, VIDEO],
          [{ nurl: 'https://cdn.example.com/vast.xml' }, VIDEO],
          [{ adm: NATIVE_ADM }, NATIVE],
          [{ adm: '<div>ad</div>', w: 300, h: 250 }, BANNER],
        ];
        cases.forEach(([fields, expected]) => {
          const response = makeResponse(request, [{ id: 'x', impid, price: 1, crid: 'c', ...fields }]);
          const result = spec.interpretResponse(response, request);
          expect(result, JSON.stringify(fields)).to.have.lengthOf(1);
          expect(result[0].mediaType, JSON.stringify(fields)).to.equal(expected);
        });
      });

      it('prefers banner markup over video when both formats are offered and the markup is HTML', function () {
        const bid = makeBid({ mediaTypes: { banner: { sizes: [[300, 250]] }, video: VIDEO_PARAMS } });
        const [request] = buildRequests([bid]);
        const response = makeResponse(request, [{ id: 'x', impid: request.data.imp[0].id, price: 1, crid: 'c', adm: '<div>ad</div>', w: 300, h: 250 }]);
        expect(spec.interpretResponse(response, request)[0].mediaType).to.equal(BANNER);
      });
    });
  });

  describe('getUserSyncs', function () {
    const PIXEL = { iframeEnabled: false, pixelEnabled: true };

    it('returns one image pixel', function () {
      expect(spec.getUserSyncs(PIXEL, [], null, null, null, false)).to.deep.equal([{ type: 'image', url: SYNC_URL }]);
    });

    it('returns no sync when pixels are disabled, even if iframes are allowed', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, [], null, null, null, false)).to.deep.equal([]);
    });

    it('returns no sync under COPPA', function () {
      expect(spec.getUserSyncs(PIXEL, [], null, '1YNN', null, true)).to.deep.equal([]);
    });

    it('adds every privacy signal that is present, in the documented order', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'CONSENT' };
      const gppConsent = { gppString: 'DBABTA~1YNN', applicableSections: [7, 8] };
      expect(spec.getUserSyncs(PIXEL, [], gdprConsent, '1YNN', gppConsent, false)).to.deep.equal([{
        type: 'image',
        url: `${SYNC_URL}?gdpr=1&gdpr_consent=CONSENT&us_privacy=1YNN&gpp=DBABTA%7E1YNN&gpp_sid=7%2C8`,
      }]);
    });

    it('sends gdpr=0 when GDPR does not apply and leaves gdpr out when unknown', function () {
      expect(spec.getUserSyncs(PIXEL, [], { gdprApplies: false }, null, null, false)[0].url).to.equal(`${SYNC_URL}?gdpr=0`);
      expect(spec.getUserSyncs(PIXEL, [], { consentString: 'CONSENT' }, null, null, false)[0].url).to.equal(`${SYNC_URL}?gdpr_consent=CONSENT`);
    });

    it('leaves out empty privacy signals', function () {
      const gppConsent = { gppString: '', applicableSections: [] };
      expect(spec.getUserSyncs(PIXEL, [], { consentString: '' }, '', gppConsent, false)).to.deep.equal([{ type: 'image', url: SYNC_URL }]);
    });
  });
});
