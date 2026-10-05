import { expect } from 'chai';
import { spec } from 'modules/motorikBidAdapter.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import { deepClone } from 'src/utils.js';
import 'modules/priceFloors.js';

const ENDPOINT = 'https://lb-east.motorik.io/pjs';

const PARAMS = {
  accountId: 'motorikTest',
  placementId: 'a7402708185f6a0c00700fd21c4260d2',
};

const NATIVE_ORTB = {
  assets: [
    { id: 1, required: 1, title: { len: 90 } },
    { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
  ],
};

const makeBid = (mediaTypes, overrides = {}) => ({
  bidder: 'motorik',
  bidId: 'bid-1',
  adUnitCode: 'adunit-1',
  auctionId: 'auction-1',
  transactionId: 'tr-1',
  mediaTypes,
  params: { ...PARAMS },
  ...overrides,
});

const BANNER_BID = makeBid({ banner: { sizes: [[300, 250], [728, 90]] } });
const VIDEO_BID = makeBid({ video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } }, { bidId: 'bid-2' });
// nativeOrtbRequest is filled by Prebid core from mediaTypes.native.ortb
const NATIVE_BID = makeBid({ native: { ortb: NATIVE_ORTB } }, { bidId: 'bid-3', nativeOrtbRequest: NATIVE_ORTB });

const BIDDER_REQUEST = {
  bidderCode: 'motorik',
  auctionId: 'auction-1',
  bidderRequestId: 'bidder-request-1',
  timeout: 1000,
  refererInfo: { page: 'https://example.com/page', domain: 'example.com', ref: 'https://google.com' },
  ortb2: {
    site: { page: 'https://example.com/page', domain: 'example.com' },
    device: { ua: 'Mozilla/5.0', language: 'en' },
    source: { ext: { schain: { ver: '1.0', complete: 1, nodes: [{ asi: 'example.com', sid: '1', hp: 1 }] } } },
    regs: { ext: { gdpr: 1, us_privacy: '1YNN' } },
    user: { ext: { consent: 'consent-string' } },
    bcat: ['IAB25'],
    badv: ['blocked.com'],
  },
};

const buildRequest = (bid) => spec.buildRequests([deepClone(bid)], deepClone(BIDDER_REQUEST))[0];

describe('motorikBidAdapter', function () {
  describe('spec', function () {
    it('should expose bidder code and supported media types', function () {
      expect(spec.code).to.equal('motorik');
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE]);
    });

    it('should not declare user syncs', function () {
      expect(spec.getUserSyncs).to.be.undefined;
    });
  });

  describe('isBidRequestValid', function () {
    it('should accept a bid with accountId and placementId', function () {
      expect(spec.isBidRequestValid(deepClone(BANNER_BID))).to.equal(true);
      expect(spec.isBidRequestValid(deepClone(VIDEO_BID))).to.equal(true);
      expect(spec.isBidRequestValid(deepClone(NATIVE_BID))).to.equal(true);
    });

    it('should reject a bid without params', function () {
      expect(spec.isBidRequestValid(makeBid(BANNER_BID.mediaTypes, { params: undefined }))).to.equal(false);
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });

    it('should reject a bid with missing or empty accountId', function () {
      expect(spec.isBidRequestValid(makeBid(BANNER_BID.mediaTypes, { params: { placementId: 'p' } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid(BANNER_BID.mediaTypes, { params: { accountId: '', placementId: 'p' } }))).to.equal(false);
    });

    it('should reject a bid with missing or non-string placementId', function () {
      expect(spec.isBidRequestValid(makeBid(BANNER_BID.mediaTypes, { params: { accountId: 'a' } }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid(BANNER_BID.mediaTypes, { params: { accountId: 'a', placementId: 123 } }))).to.equal(false);
    });

    it('should reject a bid without supported media type', function () {
      expect(spec.isBidRequestValid(makeBid({ audio: {} }))).to.equal(false);
      expect(spec.isBidRequestValid(makeBid(undefined))).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should return empty array when there are no bids', function () {
      expect(spec.buildRequests([], deepClone(BIDDER_REQUEST))).to.deep.equal([]);
    });

    it('should build one POST request per bid', function () {
      const requests = spec.buildRequests([deepClone(BANNER_BID), deepClone(VIDEO_BID)], deepClone(BIDDER_REQUEST));

      expect(requests).to.have.lengthOf(2);
      requests.forEach((request) => {
        expect(request.method).to.equal('POST');
        expect(request.data.imp).to.have.lengthOf(1);
      });
      expect(requests[0].data.imp[0].id).to.equal('bid-1');
      expect(requests[1].data.imp[0].id).to.equal('bid-2');
    });

    it('should put accountId and placementId into url', function () {
      const request = buildRequest(BANNER_BID);

      expect(request.url).to.equal(`${ENDPOINT}?k=${PARAMS.accountId}&name=${PARAMS.placementId}`);
    });

    it('should url-encode params', function () {
      const bid = makeBid(BANNER_BID.mediaTypes, { params: { accountId: 'a&b', placementId: 'c d' } });

      expect(buildRequest(bid).url).to.equal(`${ENDPOINT}?k=a%26b&name=c%20d`);
    });

    it('should build an OpenRTB request with first party data', function () {
      const { data } = buildRequest(BANNER_BID);

      expect(data.id).to.be.a('string');
      expect(data.tmax).to.equal(1000);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.site.page).to.equal('https://example.com/page');
      expect(data.site.domain).to.equal('example.com');
      expect(data.device.ua).to.equal('Mozilla/5.0');
      expect(data.bcat).to.deep.equal(['IAB25']);
      expect(data.badv).to.deep.equal(['blocked.com']);
    });

    it('should pass privacy and supply chain data', function () {
      const { data } = buildRequest(BANNER_BID);

      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
      expect(data.user.ext.consent).to.equal('consent-string');
      expect(data.source.ext.schain.nodes[0].asi).to.equal('example.com');
    });

    it('should build banner imp', function () {
      const imp = buildRequest(BANNER_BID).data.imp[0];

      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(imp.video).to.be.undefined;
      expect(imp.native).to.be.undefined;
    });

    if (FEATURES.VIDEO) {
      it('should build video imp', function () {
        const imp = buildRequest(VIDEO_BID).data.imp[0];

        expect(imp.video.w).to.equal(640);
        expect(imp.video.h).to.equal(480);
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.banner).to.be.undefined;
      });
    }

    if (FEATURES.NATIVE) {
      it('should build native imp', function () {
        const imp = buildRequest(NATIVE_BID).data.imp[0];

        expect(imp.native.request).to.be.a('string');
        expect(JSON.parse(imp.native.request).assets).to.have.lengthOf(2);
        expect(imp.banner).to.be.undefined;
      });
    }

    it('should request only one format for multi-format ad unit', function () {
      const bid = makeBid({
        native: { ortb: NATIVE_ORTB },
        video: VIDEO_BID.mediaTypes.video,
        banner: BANNER_BID.mediaTypes.banner,
      });
      const imp = buildRequest(bid).data.imp[0];

      expect(imp.banner).to.exist;
      expect(imp.video).to.be.undefined;
      expect(imp.native).to.be.undefined;
    });

    it('should set bidfloor from floors module', function () {
      const bid = makeBid(BANNER_BID.mediaTypes, {
        getFloor: () => ({ currency: 'USD', floor: 1.25 }),
      });
      const imp = buildRequest(bid).data.imp[0];

      expect(imp.bidfloor).to.equal(1.25);
      expect(imp.bidfloorcur).to.equal('USD');
    });
  });

  describe('interpretResponse', function () {
    const makeResponse = (request, bid) => ({
      body: {
        id: request.data.id,
        seatbid: [{ bid: [{ impid: request.data.imp[0].id, ...bid }] }],
      },
    });

    it('should return empty array for empty response', function () {
      const request = buildRequest(BANNER_BID);

      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { seatbid: null } }, request)).to.deep.equal([]);
    });

    it('should interpret banner bid', function () {
      const request = buildRequest(BANNER_BID);
      const response = makeResponse(request, {
        id: 'b1',
        price: 1.5,
        adm: '<div>ad</div>',
        crid: 'crid-1',
        w: 300,
        h: 250,
        dealid: 'deal-1',
        adomain: ['adv.com'],
      });

      const [bid] = spec.interpretResponse(response, request);

      expect(bid).to.include({
        requestId: 'bid-1',
        cpm: 1.5,
        currency: 'USD',
        width: 300,
        height: 250,
        creativeId: 'crid-1',
        dealId: 'deal-1',
        netRevenue: true,
        ttl: 300,
        mediaType: BANNER,
        ad: '<div>ad</div>',
      });
      expect(bid.meta.advertiserDomains).to.deep.equal(['adv.com']);
    });

    if (FEATURES.VIDEO) {
      it('should interpret video bid with VAST XML in adm', function () {
        const request = buildRequest(VIDEO_BID);
        const vast = '<VAST version="3.0"></VAST>';
        const response = makeResponse(request, {
          id: 'b2', price: 2, adm: vast, crid: 'crid-2', w: 640, h: 480,
        });

        const [bid] = spec.interpretResponse(response, request);

        expect(bid.mediaType).to.equal(VIDEO);
        expect(bid.vastXml).to.equal(vast);
        expect(bid.requestId).to.equal('bid-2');
      });
    }

    if (FEATURES.NATIVE) {
      it('should interpret native bid wrapped into native object', function () {
        const request = buildRequest(NATIVE_BID);
        const nativeAdm = {
          native: {
            link: { url: 'https://motorik.io' },
            assets: [{ id: 1, title: { text: 'title' } }],
            imptrackers: ['https://motorik.io/imp'],
          },
        };
        const response = makeResponse(request, {
          id: 'b3', price: 0.7, adm: JSON.stringify(nativeAdm), crid: 'crid-3',
        });

        const [bid] = spec.interpretResponse(response, request);

        expect(bid.mediaType).to.equal(NATIVE);
        expect(bid.native.ortb.assets).to.deep.equal(nativeAdm.native.assets);
        expect(bid.native.ortb.link.url).to.equal('https://motorik.io');
      });
    }

    if (FEATURES.NATIVE) {
      it('should interpret native bid without wrapper', function () {
        const request = buildRequest(NATIVE_BID);
        const nativeAdm = { assets: [{ id: 1, title: { text: 'title' } }] };
        const response = makeResponse(request, {
          id: 'b4', price: 0.7, adm: JSON.stringify(nativeAdm), crid: 'crid-4',
        });

        const [bid] = spec.interpretResponse(response, request);

        expect(bid.native.ortb.assets).to.deep.equal(nativeAdm.assets);
      });
    }

    if (FEATURES.NATIVE) {
      it('should skip native bid with invalid adm', function () {
        const request = buildRequest(NATIVE_BID);
        const response = makeResponse(request, {
          id: 'b5', price: 0.7, adm: 'not a json', crid: 'crid-5',
        });

        expect(spec.interpretResponse(response, request)).to.deep.equal([]);
      });
    }

    it('should skip bids for unknown imp', function () {
      const request = buildRequest(BANNER_BID);
      const response = {
        body: {
          id: request.data.id,
          seatbid: [{ bid: [{ impid: 'unknown', price: 1, adm: '<div></div>', crid: 'c', w: 300, h: 250 }] }],
        },
      };

      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });
  });
});
