import { expect } from 'chai';
import { spec } from 'modules/linaBidAdapter';
import { config } from 'src/config';
import { toFetchRequest } from 'src/ajax';
import sinon from 'sinon';
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/priceFloors.js';

const BID_REQUEST = {
  bidder: 'lina',
  params: {
    publisherId: 'pub-10001',
    placementId: '550e8400-e29b-41d4-a716-446655440000',
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [728, 90]],
    },
  },
  ortb2Imp: {
    ext: { gpid: '/1234/lina-banner' },
  },
  adUnitCode: 'lina-banner',
  transactionId: 'transaction-001',
  bidId: 'bid-001',
  bidderRequestId: 'bidder-request-001',
  auctionId: 'auction-001',
  sizes: [[300, 250], [728, 90]],
};

const BIDDER_REQUEST = {
  auctionId: 'auction-001',
  bidderRequestId: 'bidder-request-001',
  timeout: 1000,
  ortb2: {
    site: {
      page: 'https://publisher.example/article',
      domain: 'publisher.example',
      ref: 'https://referrer.example',
    },
    device: { ua: 'test-user-agent' },
    source: { ext: { schain: { ver: '1.0', nodes: [] } } },
    regs: {
      coppa: 0,
      gpp: 'gpp-001',
      gpp_sid: [7, 8],
      ext: { gdpr: 1, us_privacy: '1YNN' },
    },
    user: { ext: { consent: 'consent-001' } },
  },
};

const NATIVE_REQUEST = {
  ver: '1.2',
  assets: [{ id: 1, required: 1, title: { len: 80 } }],
};

const VALID_BID = {
  id: 'ssp-bid-001',
  impid: 'bid-001',
  price: 2.5,
  crid: 'creative-001',
  exp: 300,
  mtype: 1,
  w: 300,
  h: 250,
  adm: '<div>test creative</div>',
  adomain: ['advertiser.example'],
};

function responseFor(request, bids = [VALID_BID], overrides = {}) {
  return {
    id: request.data.id,
    cur: 'USD',
    seatbid: [{ bid: bids }],
    ...overrides,
  };
}

describe('linaBidAdapter', function () {
  const sandbox = sinon.createSandbox();

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('endpoint and identifiers', function () {
    it('uses the fixed HTTPS endpoint and ignores configuration overrides', function () {
      const getConfig = sandbox.stub(config, 'getConfig');
      [
        'https://dev-ssp.example/v1/prebid/bids',
        'http://ssp-api.qa.web3lge.com/v1/prebid/bids',
        'http://127.0.0.1:3000/v1/prebid/bids',
        '//other.example/v1/prebid/bids',
      ].forEach((endpoint) => {
        getConfig.withArgs('lina.endpoint').returns(endpoint);
        expect(spec.buildRequests([BID_REQUEST], BIDDER_REQUEST).url)
          .to.equal('https://ssp-api.qa.web3lge.com/v1/prebid/bids');
      });
      expect(getConfig.calledWith('lina.endpoint')).to.equal(false);
    });

    it('requires publisher and placement identifiers and normalizes them', function () {
      expect(spec.isBidRequestValid(BID_REQUEST)).to.equal(true);
      expect(spec.isBidRequestValid({
        ...BID_REQUEST,
        params: { publisherId: '', placementId: BID_REQUEST.params.placementId },
      })).to.equal(false);
      expect(spec.isBidRequestValid({
        ...BID_REQUEST,
        params: { publisherId: 'pub-10001', placementId: '' },
        ortb2Imp: { ...BID_REQUEST.ortb2Imp, tagid: 'fallback-is-not-used' },
      })).to.equal(false);
      expect(spec.isBidRequestValid({
        ...BID_REQUEST,
        params: { publisherId: 'pub\r\ninvalid', placementId: BID_REQUEST.params.placementId },
      })).to.equal(false);

      const request = spec.buildRequests([{
        ...BID_REQUEST,
        params: { publisherId: ' pub-10001 ', placementId: ' placement-001 ' },
      }], BIDDER_REQUEST);
      expect(request.data.ext.lina.publisherId).to.equal('pub-10001');
      expect(request.data.imp[0].tagid).to.equal('placement-001');
    });

    it('falls back to ortb2Imp.tagid when no placement parameter is present', function () {
      const bid = {
        ...BID_REQUEST,
        params: { publisherId: 'pub-10001' },
        ortb2Imp: { ...BID_REQUEST.ortb2Imp, tagid: 'imp-tag-001' },
      };
      const request = spec.buildRequests([bid], BIDDER_REQUEST);

      expect(spec.isBidRequestValid(bid)).to.equal(true);
      expect(request.data.imp[0].tagid).to.equal('imp-tag-001');
    });
  });

  describe('request conversion', function () {
    it('builds a direct standard OpenRTB request without the legacy wrapper', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://ssp-api.qa.web3lge.com/v1/prebid/bids');
      expect(request.data).to.include({ id: BIDDER_REQUEST.bidderRequestId, tmax: 1000 });
      expect(request.data).not.to.have.any.keys(
        'auctionId',
        'publisherId',
        'timeoutMs',
        'ortb2',
        'bids',
        'privacy',
      );
      expect(request.data.site).to.deep.include(BIDDER_REQUEST.ortb2.site);
      expect(request.data.device).to.deep.equal(BIDDER_REQUEST.ortb2.device);
      expect(request.data.source).to.deep.include(BIDDER_REQUEST.ortb2.source);
      expect(request.data.user).to.deep.include(BIDDER_REQUEST.ortb2.user);
      expect(request.data.regs).to.deep.include(BIDDER_REQUEST.ortb2.regs);
      expect(request.data).not.to.have.property('cur');
      expect(request.data.ext.lina.publisherId).to.equal(BID_REQUEST.params.publisherId);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0]).to.deep.include({
        id: BID_REQUEST.bidId,
        tagid: BID_REQUEST.params.placementId,
      });
      expect(request.data.imp[0]).not.to.have.any.keys(
        'bidId',
        'transactionId',
        'adUnitCode',
        'placementId',
        'ortb2Imp',
      );
      expect(request.data.imp[0].banner.format)
        .to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(request.data.imp[0].ext).to.deep.include(BID_REQUEST.ortb2Imp.ext);
    });

    it('uses text/plain, no custom headers, and no cross-origin credentials', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      const transport = toFetchRequest(request.url, JSON.stringify(request.data), {
        method: request.method,
        ...request.options,
      });

      expect(request.options).to.deep.include({
        contentType: 'text/plain',
        withCredentials: false,
      });
      expect(request.options).not.to.have.property('customHeaders');
      expect(transport.method).to.equal('POST');
      expect([...transport.headers.keys()].sort()).to.deep.equal(['content-type']);
      expect(transport.headers.get('Content-Type')).to.equal('text/plain');
      expect(transport.credentials).not.to.equal('include');
    });

    it('uses the Prebid bidder timeout as OpenRTB tmax without modifying the input', function () {
      const ortb2 = { ...BIDDER_REQUEST.ortb2, tmax: 3000 };
      const before = JSON.stringify(ortb2);
      const request = spec.buildRequests([BID_REQUEST], {
        ...BIDDER_REQUEST,
        timeout: 1000,
        ortb2,
      });

      expect(request.data.tmax).to.equal(1000);
      expect(request.data).not.to.have.property('timeoutMs');
      expect(JSON.stringify(ortb2)).to.equal(before);
    });

    it('passes through shared standard TIDs without generating missing TIDs', function () {
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        ortb2Imp: {
          ...BID_REQUEST.ortb2Imp,
          ext: { ...BID_REQUEST.ortb2Imp.ext, tid: 'shared-imp-tid' },
        },
      }], {
        ...BIDDER_REQUEST,
        ortb2: {
          ...BIDDER_REQUEST.ortb2,
          source: { ...BIDDER_REQUEST.ortb2.source, tid: 'shared-auction-tid' },
        },
      });
      const requestWithoutTids = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);

      expect(request.data.source.tid).to.equal('shared-auction-tid');
      expect(request.data.imp[0].ext.tid).to.equal('shared-imp-tid');
      expect(requestWithoutTids.data.source).not.to.have.property('tid');
      expect(requestWithoutTids.data.imp[0].ext).not.to.have.property('tid');
    });

    it('batches bids for one publisher and splits different publishers', function () {
      const secondBid = {
        ...BID_REQUEST,
        bidId: 'bid-002',
        adUnitCode: 'lina-banner-2',
      };
      const samePublisherRequest = spec.buildRequests([BID_REQUEST, secondBid], BIDDER_REQUEST);
      const splitRequests = spec.buildRequests([BID_REQUEST, {
        ...secondBid,
        params: {
          publisherId: 'pub-second',
          placementId: '550e8400-e29b-41d4-a716-446655440001',
        },
      }], BIDDER_REQUEST);

      expect(samePublisherRequest.data.imp.map((imp) => imp.id))
        .to.deep.equal(['bid-001', 'bid-002']);
      expect(splitRequests).to.have.lengthOf(2);
      expect(splitRequests.map((request) => request.data.ext.lina.publisherId))
        .to.deep.equal(['pub-10001', 'pub-second']);
    });
  });

  describe('media conversion', function () {
    it('declares the supported media types', function () {
      expect(spec.supportedMediaTypes)
        .to.deep.equal(['banner', 'video', ...(FEATURES.NATIVE ? ['native'] : [])]);
    });

    it('does not call getFloor while validating a bid', function () {
      const getFloor = sandbox.stub().returns({ floor: 1, currency: 'USD' });
      expect(spec.isBidRequestValid({ ...BID_REQUEST, getFloor })).to.equal(true);
      expect(getFloor.called).to.equal(false);
    });

    it('rejects malformed or empty video-only inputs', function () {
      [
        {
          ...BID_REQUEST,
          mediaTypes: { video: { playerSize: [640, 360] } },
          sizes: undefined,
        },
        {
          ...BID_REQUEST,
          mediaTypes: { video: { playerSize: [640, 360], mimes: [] } },
          sizes: undefined,
        },
        {
          ...BID_REQUEST,
          mediaTypes: { video: { playerSize: [640, 360], mimes: [' '] } },
          sizes: undefined,
        },
      ].forEach((bid) => {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    if (FEATURES.NATIVE) {
      it('rejects malformed or empty Native-only inputs', function () {
        [
          {
            ...BID_REQUEST,
            mediaTypes: { native: { title: { required: true, len: 80 } } },
            sizes: undefined,
          },
          {
            ...BID_REQUEST,
            mediaTypes: { native: { title: { required: true, len: 80 } } },
            nativeOrtbRequest: { ver: '1.2', assets: [] },
            sizes: undefined,
          },
          {
            ...BID_REQUEST,
            mediaTypes: { native: { title: { required: true, len: 80 } } },
            nativeOrtbRequest: { ver: '1.2', assets: [{ id: 1 }] },
            sizes: undefined,
          },
        ].forEach((bid) => {
          expect(spec.isBidRequestValid(bid)).to.equal(false);
        });
      });
    }

    it('maps standard banner sizes through the converter', function () {
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]],
      }], BIDDER_REQUEST);

      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
    });

    if (FEATURES.VIDEO) {
      it('maps standard video parameters and leaves no banner in a video-only imp', function () {
        const request = spec.buildRequests([{
          ...BID_REQUEST,
          mediaTypes: {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4', 'application/x-mpegURL'],
              protocols: [2, 3],
              minduration: 5,
              maxduration: 30,
              skip: 0,
            },
          },
          sizes: undefined,
        }], BIDDER_REQUEST);

        expect(request.data.imp[0].video).to.deep.include({
          w: 640,
          h: 360,
          mimes: ['video/mp4', 'application/x-mpegURL'],
          protocols: [2, 3],
          minduration: 5,
          maxduration: 30,
          skip: 0,
        });
        expect(request.data.imp[0]).not.to.have.property('banner');
      });

      it('lets active video arrays replace stale FPD arrays while retaining extensions', function () {
        const bid = {
          ...BID_REQUEST,
          mediaTypes: {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/webm'],
              protocols: [3],
              minduration: 10,
              maxduration: 20,
            },
          },
          sizes: undefined,
          ortb2Imp: {
            ...BID_REQUEST.ortb2Imp,
            video: {
              w: 1280,
              h: 720,
              mimes: ['video/mp4'],
              protocols: [2],
              ext: { custom: true },
            },
          },
        };
        const before = JSON.stringify(bid);
        const request = spec.buildRequests([bid], BIDDER_REQUEST);

        expect(request.data.imp[0].video).to.deep.include({
          w: 640,
          h: 360,
          mimes: ['video/webm'],
          protocols: [3],
          minduration: 10,
          maxduration: 20,
          ext: { custom: true },
        });
        expect(JSON.stringify(bid)).to.equal(before);
      });
    }

    it('filters unusable converter imps without dropping a valid batch member', function () {
      const unusable = [
        {
          ...BID_REQUEST,
          bidId: 'bid-empty-banner',
          mediaTypes: { banner: { sizes: [] } },
          sizes: [],
        },
        {
          ...BID_REQUEST,
          bidId: 'bid-no-media',
          mediaTypes: {},
          ortb2Imp: { ext: { gpid: '/no-media' } },
          sizes: undefined,
        },
        {
          ...BID_REQUEST,
          bidId: 'bid-empty-video',
          mediaTypes: { video: { playerSize: [640, 360], mimes: [] } },
          sizes: undefined,
        },
      ];
      if (FEATURES.NATIVE) {
        unusable.push({
          ...BID_REQUEST,
          bidId: 'bid-empty-native',
          mediaTypes: { native: { title: { required: true, len: 80 } } },
          nativeOrtbRequest: { ver: '1.2', assets: [] },
          sizes: undefined,
        });
      }
      unusable.forEach((bid) => {
        expect(spec.buildRequests([bid], BIDDER_REQUEST)).to.deep.equal([]);
      });

      const request = spec.buildRequests([...unusable, BID_REQUEST], BIDDER_REQUEST);
      expect(request.data.imp.map((imp) => imp.id)).to.deep.equal([BID_REQUEST.bidId]);
      expect(request.data.imp[0].banner.format)
        .to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    });

    if (FEATURES.NATIVE) {
      it('maps the Core-normalized Native request through the converter', function () {
        const request = spec.buildRequests([{
          ...BID_REQUEST,
          mediaTypes: {
            native: {
              title: { required: true, len: 80 },
            },
          },
          nativeOrtbRequest: NATIVE_REQUEST,
          sizes: undefined,
        }], BIDDER_REQUEST);

        expect(JSON.parse(request.data.imp[0].native.request)).to.deep.equal(NATIVE_REQUEST);
        expect(request.data.imp[0].native.ver).to.equal(NATIVE_REQUEST.ver);
      });
    }

    it('removes media sections filtered out by bidder media filtering', function () {
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        nativeOrtbRequest: NATIVE_REQUEST,
        ortb2Imp: {
          ext: { gpid: '/1234/lina-banner' },
          video: {
            w: 640,
            h: 360,
            mimes: ['video/mp4'],
          },
        },
        sizes: [[300, 250]],
      }], BIDDER_REQUEST);

      expect(request.data.imp[0]).not.to.have.property('video');
      if (FEATURES.NATIVE) {
        expect(request.data.imp[0]).not.to.have.property('native');
      }
    });

    it('keeps one multi-format imp and one wildcard client floor lookup', function () {
      const getFloor = sandbox.stub().returns({ floor: 0, currency: 'KRW' });
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          ...(FEATURES.VIDEO ? {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
              protocols: [3],
            }
          } : {}),
          ...(FEATURES.NATIVE ? {
            native: { title: { required: true, len: 80 } },
          } : {}),
        },
        ...(FEATURES.NATIVE ? { nativeOrtbRequest: NATIVE_REQUEST } : {}),
        sizes: undefined,
        getFloor,
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['KRW'] },
      });

      expect(getFloor.calledWithExactly({
        currency: 'KRW',
        mediaType: '*',
        size: '*',
      })).to.equal(true);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      if (FEATURES.VIDEO) {
        expect(request.data.imp[0].video).to.deep.include({ w: 640, h: 360 });
      }
      if (FEATURES.NATIVE) {
        expect(JSON.parse(request.data.imp[0].native.request)).to.deep.equal(NATIVE_REQUEST);
      }
      expect(request.data.imp[0]).to.include({ bidfloor: 0, bidfloorcur: 'KRW' });
    });

    it('preserves per-format and per-size publisher floors', function () {
      const getFloor = sandbox.stub().callsFake(({ mediaType, size }) => {
        if (mediaType === '*') return { floor: 0.5, currency: 'USD' };
        if (mediaType === 'banner' && size === '*') return { floor: 1, currency: 'USD' };
        if (mediaType === 'banner' && Array.isArray(size)) return { floor: 1.5, currency: 'USD' };
        if (mediaType === 'video') return { floor: 5, currency: 'USD' };
        if (mediaType === 'native') return { floor: 2, currency: 'USD' };
        return null;
      });
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          ...(FEATURES.VIDEO ? {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
            }
          } : {}),
          ...(FEATURES.NATIVE ? {
            native: { title: { required: true, len: 80 } },
          } : {}),
        },
        ...(FEATURES.NATIVE ? { nativeOrtbRequest: NATIVE_REQUEST } : {}),
        sizes: undefined,
        getFloor,
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['USD'] },
      });

      const imp = request.data.imp[0];
      expect(imp).to.include({ bidfloor: 0.5, bidfloorcur: 'USD' });
      expect(imp.banner.ext).to.deep.equal({ bidfloor: 1, bidfloorcur: 'USD' });
      expect(imp.banner.format[0].ext).to.deep.equal({ bidfloor: 1.5, bidfloorcur: 'USD' });
      if (FEATURES.VIDEO) {
        expect(imp.video.ext).to.deep.equal({ bidfloor: 5, bidfloorcur: 'USD' });
      }
      if (FEATURES.NATIVE) {
        expect(imp.native.ext).to.deep.equal({ bidfloor: 2, bidfloorcur: 'USD' });
      }
    });

    it('defaults missing granular currencies to the effective currency', function () {
      const getFloor = sandbox.stub().callsFake(({ mediaType, size }) => {
        if (mediaType === '*') return { floor: 0.5 };
        if (mediaType === 'banner' && size === '*') return { floor: 1 };
        if (mediaType === 'banner' && Array.isArray(size)) return { floor: 1.5 };
        if (mediaType === 'video') return { floor: 5 };
        if (mediaType === 'native') return { floor: 2 };
        return null;
      });
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          ...(FEATURES.VIDEO ? {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
            }
          } : {}),
          ...(FEATURES.NATIVE ? {
            native: { title: { required: true, len: 80 } },
          } : {}),
        },
        ...(FEATURES.NATIVE ? { nativeOrtbRequest: NATIVE_REQUEST } : {}),
        sizes: undefined,
        getFloor,
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['USD'] },
      });

      const imp = request.data.imp[0];
      expect(imp).to.include({ bidfloor: 0.5, bidfloorcur: 'USD' });
      expect(imp.banner.ext).to.deep.equal({ bidfloor: 1, bidfloorcur: 'USD' });
      expect(imp.banner.format[0].ext).to.deep.equal({ bidfloor: 1.5, bidfloorcur: 'USD' });
      if (FEATURES.VIDEO) {
        expect(imp.video.ext).to.deep.equal({ bidfloor: 5, bidfloorcur: 'USD' });
      }
      if (FEATURES.NATIVE) {
        expect(imp.native.ext).to.deep.equal({ bidfloor: 2, bidfloorcur: 'USD' });
      }
    });

    it('drops granular floors that conflict with the request currency', function () {
      const getFloor = sandbox.stub().callsFake(({ mediaType, size }) => {
        if (mediaType === '*') return { floor: 0.5, currency: 'USD' };
        if (Array.isArray(size)) return { floor: 1.5, currency: 'EUR' };
        return { floor: 1, currency: 'EUR' };
      });
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          ...(FEATURES.VIDEO ? {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
            }
          } : {}),
          ...(FEATURES.NATIVE ? {
            native: { title: { required: true, len: 80 } },
          } : {}),
        },
        ...(FEATURES.NATIVE ? { nativeOrtbRequest: NATIVE_REQUEST } : {}),
        sizes: undefined,
        getFloor,
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['USD'] },
      });

      const imp = request.data.imp[0];
      expect(imp).to.include({ bidfloor: 0.5, bidfloorcur: 'USD' });
      expect(imp.banner).not.to.have.nested.property('ext.bidfloor');
      imp.banner.format.forEach(format =>
        expect(format).not.to.have.nested.property('ext.bidfloor'));
      if (FEATURES.VIDEO) {
        expect(imp.video).not.to.have.nested.property('ext.bidfloor');
      }
      if (FEATURES.NATIVE) {
        expect(imp.native).not.to.have.nested.property('ext.bidfloor');
      }
    });

    it('preserves a per-format zero floor that differs from the top-level floor', function () {
      const getFloor = sandbox.stub().callsFake(({ mediaType }) => {
        if (mediaType === '*') return { floor: 0.5, currency: 'USD' };
        return { floor: 0, currency: 'USD' };
      });
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          ...(FEATURES.VIDEO ? {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
            }
          } : {}),
          ...(FEATURES.NATIVE ? {
            native: { title: { required: true, len: 80 } },
          } : {}),
        },
        ...(FEATURES.NATIVE ? { nativeOrtbRequest: NATIVE_REQUEST } : {}),
        sizes: undefined,
        getFloor,
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['USD'] },
      });

      const imp = request.data.imp[0];
      expect(imp).to.include({ bidfloor: 0.5, bidfloorcur: 'USD' });
      expect(imp.banner.ext).to.deep.equal({ bidfloor: 0, bidfloorcur: 'USD' });
      expect(imp.banner.format[0].ext).to.deep.equal({ bidfloor: 0, bidfloorcur: 'USD' });
      if (FEATURES.VIDEO) {
        expect(imp.video.ext).to.deep.equal({ bidfloor: 0, bidfloorcur: 'USD' });
      }
      if (FEATURES.NATIVE) {
        expect(imp.native.ext).to.deep.equal({ bidfloor: 0, bidfloorcur: 'USD' });
      }
    });

    it('removes stale granular floors when no new match is returned', function () {
      const getFloor = sandbox.stub().callsFake(({ mediaType }) =>
        mediaType === '*' ? { floor: 0.5, currency: 'USD' } : null);
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          ...(FEATURES.VIDEO ? {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
            }
          } : {}),
          ...(FEATURES.NATIVE ? {
            native: { title: { required: true, len: 80 } },
          } : {}),
        },
        ...(FEATURES.NATIVE ? { nativeOrtbRequest: NATIVE_REQUEST } : {}),
        ortb2Imp: {
          ext: { gpid: '/1234/lina-mixed' },
          banner: {
            ext: { bidfloor: 10, bidfloorcur: 'USD' },
            format: [{
              w: 300,
              h: 250,
              ext: { bidfloor: 20, bidfloorcur: 'USD' },
            }],
          },
          ...(FEATURES.VIDEO ? {
            video: {
              w: 640,
              h: 360,
              mimes: ['video/mp4'],
              ext: { bidfloor: 30, bidfloorcur: 'USD' },
            }
          } : {}),
          ...(FEATURES.NATIVE ? {
            native: {
              ext: { bidfloor: 40, bidfloorcur: 'USD' },
            },
          } : {}),
        },
        sizes: undefined,
        getFloor,
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['USD'] },
      });

      const imp = request.data.imp[0];
      expect(imp).to.include({ bidfloor: 0.5, bidfloorcur: 'USD' });
      expect(imp.banner).not.to.have.nested.property('ext.bidfloor');
      imp.banner.format.forEach(format =>
        expect(format).not.to.have.nested.property('ext.bidfloor'));
      if (FEATURES.VIDEO) {
        expect(imp.video).not.to.have.nested.property('ext.bidfloor');
      }
      if (FEATURES.NATIVE) {
        expect(imp.native).not.to.have.nested.property('ext.bidfloor');
      }
    });

    it('clears granular floors without mutating the ad unit ortb2Imp', function () {
      const getFloor = sandbox.stub().callsFake(({ mediaType }) =>
        mediaType === '*' ? { floor: 0.5, currency: 'USD' } : null);
      const ortb2Imp = {
        ext: { gpid: '/1234/lina-mixed' },
        banner: {
          ext: { bidfloor: 10, bidfloorcur: 'USD' },
          format: [{ w: 300, h: 250, ext: { bidfloor: 20, bidfloorcur: 'USD' } }],
        },
        video: {
          w: 640,
          h: 360,
          mimes: ['video/mp4'],
          ext: { bidfloor: 30, bidfloorcur: 'USD' },
        },
      };
      const before = JSON.parse(JSON.stringify(ortb2Imp));
      const bid = {
        ...BID_REQUEST,
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          ...(FEATURES.VIDEO ? {
            video: { playerSize: [[640, 360]], mimes: ['video/mp4'] },
          } : {}),
        },
        ortb2Imp: FEATURES.VIDEO ? ortb2Imp : {
          ...ortb2Imp,
          video: undefined,
        },
        sizes: undefined,
        getFloor,
      };
      const bidderRequest = {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['USD'] },
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
      expect(ortb2Imp).to.deep.equal(before);

      const request = spec.buildRequests([bid], bidderRequest);
      expect(ortb2Imp).to.deep.equal(before);

      const imp = request.data.imp[0];
      expect(imp.banner.format[0]).not.to.have.nested.property('ext.bidfloor');
      if (FEATURES.VIDEO) {
        expect(imp.video).not.to.have.nested.property('ext.bidfloor');
      }
    });
  });

  describe('floors and currency', function () {
    it('does not propagate an implicit adServerCurrency into request cur', function () {
      config.setConfig({
        currency: {
          adServerCurrency: 'JPY',
          rates: { JPY: { JPY: 1 } },
        },
      });
      const bidderRequest = {
        ...BIDDER_REQUEST,
        ortb2: {
          ...BIDDER_REQUEST.ortb2,
          ext: { prebid: { adServerCurrency: 'JPY' } },
        },
      };
      const request = spec.buildRequests([BID_REQUEST], bidderRequest);

      expect(request.data).not.to.have.property('cur');
      expect(request.data.ext.prebid.adServerCurrency).to.equal('JPY');
    });

    it('preserves an explicit zero floor in standard imp fields', function () {
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        ortb2Imp: {
          ...BID_REQUEST.ortb2Imp,
          bidfloor: 0,
          bidfloorcur: 'USD',
        },
      }], BIDDER_REQUEST);

      expect(request.data.imp[0]).to.include({ bidfloor: 0, bidfloorcur: 'USD' });
      expect(request.data).not.to.have.property('cur');
    });

    it('uses the request or bid floor currency, then USD, for a wildcard lookup', function () {
      [
        { requestCurrency: 'KRW', bidCurrency: 'KRW', expected: 'KRW' },
        { requestCurrency: undefined, bidCurrency: 'EUR', expected: 'EUR' },
        { requestCurrency: undefined, bidCurrency: undefined, expected: 'USD' },
      ].forEach(({ requestCurrency, bidCurrency, expected }) => {
        const getFloor = sandbox.stub().returns({ floor: 1.25 });
        const bid = {
          ...BID_REQUEST,
          ortb2Imp: {
            ...BID_REQUEST.ortb2Imp,
            ...(bidCurrency === undefined ? {} : { bidfloorcur: bidCurrency }),
          },
          getFloor,
        };
        const bidderRequest = {
          ...BIDDER_REQUEST,
          ortb2: {
            ...BIDDER_REQUEST.ortb2,
            ...(requestCurrency === undefined ? {} : { cur: [requestCurrency] }),
          },
        };
        const request = spec.buildRequests([bid], bidderRequest);

        expect(getFloor.calledWithExactly({
          currency: expected,
          mediaType: '*',
          size: '*',
        })).to.equal(true);
        expect(request.data.imp[0]).to.include({
          bidfloor: 1.25,
          bidfloorcur: expected,
        });
      });
    });

    it('retains a static floor when the Floors Module has no matching rule', function () {
      [null, {}].forEach((floorResult) => {
        const request = spec.buildRequests([{
          ...BID_REQUEST,
          ortb2Imp: {
            ...BID_REQUEST.ortb2Imp,
            bidfloor: 500,
            bidfloorcur: 'KRW',
          },
          getFloor: () => floorResult,
        }], BIDDER_REQUEST);

        expect(request.data.imp[0]).to.include({
          bidfloor: 500,
          bidfloorcur: 'KRW',
        });
      });
    });

    it('fails closed for invalid or multiple request currencies', function () {
      [['usd'], ['USD', 'EUR'], [], 'USD'].forEach((cur) => {
        const getFloor = sandbox.stub().returns({ floor: 1, currency: 'USD' });
        const request = spec.buildRequests([{ ...BID_REQUEST, getFloor }], {
          ...BIDDER_REQUEST,
          ortb2: { ...BIDDER_REQUEST.ortb2, cur },
        });

        expect(getFloor.called).to.equal(false);
        expect(request).to.deep.equal([]);
      });
    });

    it('fails closed for unusable wildcard floor results', function () {
      [
        () => ({ floor: -1, currency: 'USD' }),
        () => ({ floor: NaN, currency: 'USD' }),
        () => ({ floor: Infinity, currency: 'USD' }),
        () => ({ floor: 1, currency: 'usd' }),
        () => { throw new Error('floor unavailable'); },
      ].forEach((getFloor) => {
        expect(spec.buildRequests([{ ...BID_REQUEST, getFloor }], BIDDER_REQUEST))
          .to.deep.equal([]);
      });
    });

    it('rejects request/static and request/dynamic floor currency mismatches', function () {
      const staticMismatch = spec.buildRequests([{
        ...BID_REQUEST,
        ortb2Imp: {
          ...BID_REQUEST.ortb2Imp,
          bidfloor: 1000,
          bidfloorcur: 'USD',
        },
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['KRW'] },
      });
      const dynamicMismatch = spec.buildRequests([{
        ...BID_REQUEST,
        getFloor: () => ({ floor: 1000, currency: 'USD' }),
      }], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['KRW'] },
      });

      expect(staticMismatch).to.deep.equal([]);
      expect(dynamicMismatch).to.deep.equal([]);
    });

    it('does not use adServerCurrency for floor lookup or wire cur', function () {
      [
        { adServerCurrency: 'JPY', bidfloorcur: undefined, expected: 'USD' },
        { adServerCurrency: 'JPY', bidfloorcur: 'EUR', expected: 'EUR' },
        { adServerCurrency: 'jpy', bidfloorcur: undefined, expected: 'USD' },
      ].forEach(({ adServerCurrency, bidfloorcur, expected }) => {
        const getFloor = sandbox.stub().callsFake(({ currency }) => ({
          floor: 1.25,
          currency,
        }));
        const request = spec.buildRequests([{
          ...BID_REQUEST,
          ortb2Imp: {
            ...BID_REQUEST.ortb2Imp,
            ...(bidfloorcur === undefined ? {} : { bidfloorcur }),
          },
          getFloor,
        }], {
          ...BIDDER_REQUEST,
          ortb2: {
            ...BIDDER_REQUEST.ortb2,
            ext: { prebid: { adServerCurrency } },
          },
        });

        expect(getFloor.calledWithExactly({
          currency: expected,
          mediaType: '*',
          size: '*',
        })).to.equal(true);
        expect(request.data).not.to.have.property('cur');
        expect(request.data.imp[0]).to.include({
          bidfloor: 1.25,
          bidfloorcur: expected,
        });
        expect(request.data.ext.prebid).to.deep.equal({ adServerCurrency });
      });
    });

    it('uses explicit OpenRTB currency independently of adServerCurrency with no FX', function () {
      const getFloor = sandbox.stub().returns({ floor: 1500, currency: 'KRW' });
      const request = spec.buildRequests([{ ...BID_REQUEST, getFloor }], {
        ...BIDDER_REQUEST,
        ortb2: {
          ...BIDDER_REQUEST.ortb2,
          cur: ['KRW'],
          ext: { prebid: { adServerCurrency: 'USD' } },
        },
      });

      expect(getFloor.calledWithExactly({
        currency: 'KRW',
        mediaType: '*',
        size: '*',
      })).to.equal(true);
      expect(request.data.cur).to.deep.equal(['KRW']);
      expect(request.data.imp[0]).to.include({
        bidfloor: 1500,
        bidfloorcur: 'KRW',
      });
      expect(request.data.ext.prebid.adServerCurrency).to.equal('USD');
    });
  });

  describe('response conversion', function () {
    it('maps standard banner fields, nurl, creative, domain, deal, ttl, and net revenue', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      const nurl = 'https://tracker.example/impression?auction=1';
      const response = responseFor(request, [{
        ...VALID_BID,
        nurl,
        dealid: 'deal-001',
      }]);

      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.include({
        requestId: BID_REQUEST.bidId,
        seatBidId: VALID_BID.id,
        cpm: VALID_BID.price,
        currency: response.cur,
        creativeId: VALID_BID.crid,
        ttl: VALID_BID.exp,
        netRevenue: true,
        mediaType: 'banner',
        width: VALID_BID.w,
        height: VALID_BID.h,
        dealId: 'deal-001',
        meta: { advertiserDomains: VALID_BID.adomain },
      });
      expect(bids[0].ad).to.include(nurl);
      expect(bids[0].ad).to.include(VALID_BID.adm);
    });

    it('does not throw or return a bid for adm plus malformed nurl that SSP must reject before delivery', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      let bids;

      expect(() => {
        bids = spec.interpretResponse({
          body: responseFor(request, [{
            ...VALID_BID,
            nurl: 'https://tracker.example/%E0%A4%A',
          }]),
        }, request);
      }).not.to.throw();
      expect(bids).to.deep.equal([]);
    });

    it('drops banner adm with invalid UTF-8 nurl without throwing; SSP must reject it before persistence', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      let bids;

      expect(() => {
        bids = spec.interpretResponse({
          body: responseFor(request, [{
            ...VALID_BID,
            nurl: 'https://tracker.example/%FF',
          }]),
        }, request);
      }).not.to.throw();
      expect(bids).to.deep.equal([]);
    });

    it('maps an nurl-only Banner response to adUrl without propagating custom reward ext data', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      const nurl = 'https://tracker.example/banner?auction=1';
      const response = responseFor(request, [{
        ...VALID_BID,
        adm: undefined,
        nurl,
        reward: 'custom-reward',
        ext: { reward: { amount: 3 }, custom: true },
      }]);

      const bids = spec.interpretResponse({ body: response }, request);

      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.include({
        requestId: BID_REQUEST.bidId,
        seatBidId: VALID_BID.id,
        cpm: VALID_BID.price,
        currency: response.cur,
        creativeId: VALID_BID.crid,
        ttl: VALID_BID.exp,
        netRevenue: true,
        mediaType: 'banner',
        width: VALID_BID.w,
        height: VALID_BID.h,
        adUrl: nurl,
      });
      expect(bids[0].meta).to.deep.equal({
        advertiserDomains: VALID_BID.adomain,
      });
      expect(bids[0]).not.to.have.any.keys('ad', 'adm', 'mtype', 'reward', 'ext');
    });

    if (FEATURES.VIDEO) {
      it('maps standard video mtype and markup through the converter', function () {
        const request = spec.buildRequests([{
          ...BID_REQUEST,
          mediaTypes: {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
              protocols: [3],
            },
          },
          sizes: undefined,
        }], BIDDER_REQUEST);
        const bids = spec.interpretResponse({
          body: responseFor(request, [{
            ...VALID_BID,
            mtype: 2,
            w: 640,
            h: 360,
            adm: '<VAST version="3.0"></VAST>',
          }]),
        }, request);

        expect(bids).to.have.lengthOf(1);
        expect(bids[0]).to.include({
          mediaType: 'video',
          width: 640,
          height: 360,
          playerWidth: 640,
          playerHeight: 360,
          vastXml: '<VAST version="3.0"></VAST>',
        });
        expect(bids[0]).not.to.have.property('ad');
      });

      it('maps an nurl-only Video response to vastUrl without propagating custom reward ext data', function () {
        const request = spec.buildRequests([{
          ...BID_REQUEST,
          mediaTypes: {
            video: {
              playerSize: [[640, 360]],
              mimes: ['video/mp4'],
              protocols: [3],
            },
          },
          sizes: undefined,
        }], BIDDER_REQUEST);
        const nurl = 'https://tracker.example/vast.xml?auction=1';
        const response = responseFor(request, [{
          ...VALID_BID,
          mtype: 2,
          w: 640,
          h: 360,
          adm: undefined,
          nurl,
          reward: 'custom-reward',
          ext: { reward: { amount: 3 }, custom: true },
        }]);

        const bids = spec.interpretResponse({ body: response }, request);

        expect(bids).to.have.lengthOf(1);
        expect(bids[0]).to.deep.include({
          requestId: BID_REQUEST.bidId,
          seatBidId: VALID_BID.id,
          cpm: VALID_BID.price,
          currency: response.cur,
          creativeId: VALID_BID.crid,
          ttl: VALID_BID.exp,
          netRevenue: true,
          mediaType: 'video',
          width: 640,
          height: 360,
          playerWidth: 640,
          playerHeight: 360,
          vastUrl: nurl,
        });
        expect(bids[0].meta).to.deep.equal({
          advertiserDomains: VALID_BID.adomain,
        });
        expect(bids[0]).not.to.have.any.keys('adm', 'mtype', 'vastXml', 'reward', 'ext');
      });
    }

    if (FEATURES.NATIVE) {
      it('maps the standard Native response wrapper to Prebid Native ORTB markup', function () {
        const request = spec.buildRequests([{
          ...BID_REQUEST,
          mediaTypes: {
            native: { title: { required: true, len: 80 } },
          },
          nativeOrtbRequest: NATIVE_REQUEST,
          sizes: undefined,
        }], BIDDER_REQUEST);
        const nativeMarkup = {
          native: {
            ver: '1.2',
            assets: [{ id: 1, title: { text: 'Native title' } }],
          },
        };
        const bids = spec.interpretResponse({
          body: responseFor(request, [{
            ...VALID_BID,
            mtype: 4,
            w: 0,
            h: 0,
            adm: JSON.stringify(nativeMarkup),
          }]),
        }, request);

        expect(bids).to.have.lengthOf(1);
        expect(bids[0]).to.deep.include({
          mediaType: 'native',
          width: 0,
          height: 0,
          native: { ortb: nativeMarkup.native },
        });
      });
    }

    it('filters unknown impression IDs and maps multiple matching bids', function () {
      const request = spec.buildRequests([BID_REQUEST, {
        ...BID_REQUEST,
        bidId: 'bid-002',
        adUnitCode: 'lina-banner-2',
      }], BIDDER_REQUEST);
      const bids = spec.interpretResponse({
        body: responseFor(request, [
          VALID_BID,
          { ...VALID_BID, id: 'ssp-bid-002', impid: 'bid-002', crid: 'creative-002' },
          { ...VALID_BID, id: 'ssp-bid-unknown', impid: 'unknown' },
        ]),
      }, request);

      expect(bids.map((bid) => bid.requestId)).to.deep.equal(['bid-001', 'bid-002']);
      expect(bids.map((bid) => bid.seatBidId))
        .to.deep.equal(['ssp-bid-001', 'ssp-bid-002']);
    });

    it('requires the exact converter request object when interpreting a response', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      const clonedRequest = {
        ...request,
        data: JSON.parse(JSON.stringify(request.data)),
      };
      const response = responseFor(request);

      expect(spec.interpretResponse({ body: response }, request)).to.have.lengthOf(1);
      expect(spec.interpretResponse({ body: response }, clonedRequest)).to.deep.equal([]);
    });

    it('accepts only responses whose request ID matches the submitted request', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      const otherRequest = spec.buildRequests([{
        ...BID_REQUEST,
        bidId: 'bid-other',
      }], {
        ...BIDDER_REQUEST,
        bidderRequestId: 'bidder-request-other',
      });

      expect(spec.interpretResponse({
        body: responseFor(request, [VALID_BID], { id: 'unknown-request' }),
      }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({
        body: responseFor(request),
      }, otherRequest)).to.deep.equal([]);
    });

    it('accepts response currency when the request omitted cur and performs no FX', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      const bids = spec.interpretResponse({
        body: responseFor(request, [{ ...VALID_BID, price: 101 }], { cur: 'JPY' }),
      }, request);

      expect(request.data).not.to.have.property('cur');
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.include({ cpm: 101, currency: 'JPY' });
    });

    it('rejects a response currency that differs from explicit request cur', function () {
      const request = spec.buildRequests([BID_REQUEST], {
        ...BIDDER_REQUEST,
        ortb2: { ...BIDDER_REQUEST.ortb2, cur: ['KRW'] },
      });

      expect(spec.interpretResponse({
        body: responseFor(request, [VALID_BID], { cur: 'USD' }),
      }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({
        body: responseFor(request, [{ ...VALID_BID, price: 1500 }], { cur: 'KRW' }),
      }, request)).to.have.lengthOf(1);
    });

    it('drops responses with missing or unknown mtype values', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      [undefined, 0, 99].forEach((mtype) => {
        expect(spec.interpretResponse({
          body: responseFor(request, [{ ...VALID_BID, mtype }]),
        }, request)).to.deep.equal([]);
      });
    });

    it('returns no bid for malformed OpenRTB envelopes', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
      [
        undefined,
        null,
        {},
        { ...responseFor(request), id: 123 },
        { ...responseFor(request), cur: 'usd' },
        { ...responseFor(request), seatbid: undefined },
        { ...responseFor(request), seatbid: 'invalid' },
        { ...responseFor(request), seatbid: [null] },
      ].forEach((body) => {
        expect(spec.interpretResponse({ body }, request)).to.deep.equal([]);
      });
    });

    it('treats 204 and empty seatbid or bids as No Bid', function () {
      const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);

      expect(spec.interpretResponse({ status: 204, body: undefined }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({
        body: responseFor(request, [], { seatbid: [] }),
      }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({
        body: responseFor(request, []),
      }, request)).to.deep.equal([]);
    });
  });

  it('does not register user syncs', function () {
    expect(spec.getUserSyncs()).to.deep.equal([]);
  });
});
