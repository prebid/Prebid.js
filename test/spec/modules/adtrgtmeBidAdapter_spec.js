import { expect } from 'chai';
import { config } from 'src/config.js';
import { spec } from 'modules/adtrgtmeBidAdapter.js';
import 'modules/priceFloors.js';

const DEFAULT_SID = '1220291391';
const DEFAULT_BID_ID = '84ab500420319d';
const DEFAULT_PIXEL_URL = 'https://cdn.adtarget.me/libs/1x1.gif';
const DEFAULT_BANNER_URL = 'https://cdn.adtarget.me/libs/banner/300x250.jpg';
const BIDDER_VERSION = '1.0.8';
const PREBIDJS_VERSION = '$prebid.version$';

const createBidRequest = ({ bidId, adUnitCode, bidOverride, zid, ortb2, mediaTypes } = {}) => {
  const bidRequest = {
    auctionId: 'f3c594t-3o0ch1b0rm-ayn93c3o0ch1b0rm',
    adUnitCode: adUnitCode || '/1220291391/banner',
    bidId: bidId || DEFAULT_BID_ID,
    bidder: 'adtrgtme',
    mediaTypes: mediaTypes || { banner: { sizes: [[300, 250]] } },
    sizes: [[300, 250]],
    params: {
      sid: DEFAULT_SID,
      bidOverride: bidOverride || {},
    },
    transactionId: '5b17b67d-7704-4732-8cc9-5b1723e9bcf9',
    ortb2: ortb2 || {},
  };

  if (typeof zid === 'string') {
    bidRequest.params.zid = zid;
  }
  return bidRequest;
};

const createBidderRequest = (bids, ortb2 = {}) => ({
  adUnitCode: '/1220291391/banner',
  auctionId: 'd4c83a3b-18e4-4208-b98b-63848449c7aa',
  bidderCode: 'adtrgtme',
  bids,
  refererInfo: {
    page: 'https://partner-site.com',
    stack: ['https://partner-site.com'],
  },
  gdprConsent: {
    consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
    vendorData: {},
    gdprApplies: true,
  },
  timeout: 1000,
  ortb2,
});

const createRequestMock = (opts = {}) => {
  const bidRequest = createBidRequest(opts);
  const validBR = [bidRequest];
  const bidderRequest = createBidderRequest(validBR, opts.ortb2 || {});
  return { bidRequest, validBR, bidderRequest };
};

// builds the request and returns the first server-request object (multi-request mode)
const buildFirst = (validBR, bidderRequest) => spec.buildRequests(validBR, bidderRequest)[0];

const createSeatBid = (overrides = {}) => ({
  id: '5qtvluj7bk6jhzmqwu4zzulv',
  impid: DEFAULT_BID_ID,
  price: 1,
  w: 300,
  h: 250,
  crid: 'creativeid',
  mtype: 1,
  adomain: ['some-advertiser-domain.com'],
  ...overrides,
});

const createServerResponse = (bid) => ({
  body: {
    id: '5qtvluj7bk6jhzmqwu4zzulv',
    cur: 'USD',
    seatbid: [{ bid: [bid], seat: 12345 }],
  },
});

describe('Adtrgtme Bid Adapter:', () => {
  afterEach(() => {
    config.resetConfig();
  });

  describe('check basic properties', () => {
    it('should define bidder code', () => {
      expect(spec.code).to.equal('adtrgtme');
    });
    it('should support banner, video and native', () => {
      expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', 'native']);
    });
  });

  describe('isBidRequestValid', () => {
    const BAD_VALUE = [
      {},
      { params: {} },
      { params: { sid: 1220291391, zid: '1836455615' } },
      { params: { sid: '1220291391', zid: 'A' } },
      { params: { sid: '', zid: '1836455615' } },
      { params: { sid: '', zid: 'A' } },
      { params: { zid: '' } },
    ];
    BAD_VALUE.forEach((value) => {
      it(`should determine bad bid for ${JSON.stringify(value)}`, () => {
        expect(spec.isBidRequestValid(value)).to.be.false;
      });
    });

    const OK_VALUE = [
      { params: { sid: '1220291391' } },
      { params: { sid: '1220291391', zid: 1836455615 } },
      { params: { sid: '1220291391', zid: '1836455615' } },
      { params: { sid: '1220291391', zid: '1836455615A' } },
    ];
    OK_VALUE.forEach((value) => {
      it(`should determine OK bid for ${JSON.stringify(value)}`, () => {
        expect(spec.isBidRequestValid(value)).to.be.true;
      });
    });
  });

  describe('buildRequests - basics', () => {
    it('should return undefined when no bids', () => {
      expect(spec.buildRequests([])).to.be.undefined;
    });

    it('should return one server-request per bid', () => {
      const { validBR, bidderRequest } = createRequestMock();
      const requests = spec.buildRequests(validBR, bidderRequest);
      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
    });

    it('should attach content-type and withCredentials when purpose-1 consent is granted', () => {
      const { validBR, bidderRequest } = createRequestMock();
      bidderRequest.gdprConsent.gdprApplies = false;
      const { options } = buildFirst(validBR, bidderRequest);
      expect(options).to.deep.equal({
        contentType: 'application/json',
        withCredentials: true,
      });
    });

    it('should not send cookies when purpose-1 consent is missing', () => {
      const { validBR, bidderRequest } = createRequestMock();
      bidderRequest.gdprConsent = {
        consentString: 'BOtmiBKO234234tmiBKABABAEN234AFAAAAACeAAA',
        apiVersion: 2,
        vendorData: { purpose: { consents: { 1: false } } },
        gdprApplies: true,
      };
      const { options } = buildFirst(validBR, bidderRequest);
      expect(options.withCredentials).to.be.false;
    });
  });

  describe('Endpoint & singleRequestMode', () => {
    it('should route request to default endpoint + sid', () => {
      const { validBR, bidderRequest } = createRequestMock();
      const { url, method } = buildFirst(validBR, bidderRequest);
      expect(method).to.equal('POST');
      expect(url).to.equal('https://rtb.cdn.adtarget.market/ssp?prebid&s=' + DEFAULT_SID);
    });

    it('should route request to config override endpoint', () => {
      const overrideEndpoint = 'http://partner-adserv-domain.com/ssp?s=';
      config.setConfig({ adtrgtme: { endpoint: overrideEndpoint } });
      const { validBR, bidderRequest } = createRequestMock();
      const { url } = buildFirst(validBR, bidderRequest);
      expect(url).to.equal(overrideEndpoint + DEFAULT_SID);
    });

    it('should return a single server-request with all imps in singleRequestMode', () => {
      config.setConfig({ adtrgtme: { singleRequestMode: true } });
      const a = createBidRequest({ bidId: DEFAULT_BID_ID, adUnitCode: '/1220291391/banner' });
      const b = createBidRequest({ bidId: '6heos7ks8z0j', adUnitCode: 'bidder-code', zid: '98876543210' });
      const validBR = [a, b];
      const bidderRequest = createBidderRequest(validBR);
      const request = spec.buildRequests(validBR, bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.data.imp).to.be.an('array').with.lengthOf(2);
      expect(request.data.imp[0]).to.deep.include({ id: DEFAULT_BID_ID });
      expect(request.data.imp[0].ext).to.deep.include({ dfp_ad_unit_code: '/1220291391/banner' });
      expect(request.data.imp[1]).to.deep.include({ id: '6heos7ks8z0j', tagid: '98876543210' });
      expect(request.data.imp[1].ext).to.deep.include({ dfp_ad_unit_code: 'bidder-code' });
    });
  });

  describe('oRTB request data', () => {
    it('should build a valid base oRTB request', () => {
      const { validBR, bidderRequest } = createRequestMock();
      const { data } = buildFirst(validBR, bidderRequest);

      expect(data.site).to.deep.include({
        id: DEFAULT_SID,
        page: bidderRequest.refererInfo.page,
      });
      expect(data.device).to.be.an('object');
      expect(data.device.dnt).to.be.undefined;
      expect(data.regs).to.deep.equal({ us_privacy: '', gdpr: 1 });
      expect(data.cur).to.deep.equal(['USD']);
    });

    it('should attach adapter identity to source.ext', () => {
      const { validBR, bidderRequest } = createRequestMock();
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.source.ext).to.deep.equal({
        hb: 1,
        bidderver: BIDDER_VERSION,
        prebidjsver: PREBIDJS_VERSION,
      });
      expect(data.source.fd).to.equal(1);
    });

    it('should forward core-enriched ortb2.device fields (ua, sua, language)', () => {
      const ortb2 = {
        device: {
          ua: 'core-enriched-ua',
          language: 'en',
          sua: { source: 2, browsers: [{ brand: 'Chromium', version: ['149'] }] },
        },
      };
      const { validBR, bidderRequest } = createRequestMock({ ortb2 });
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.device.ua).to.equal('core-enriched-ua');
      expect(data.device.language).to.equal('en');
      expect(data.device.sua).to.deep.equal(ortb2.device.sua);
    });

    it('should add GPP consent to regs when present', () => {
      const { validBR, bidderRequest } = createRequestMock();
      bidderRequest.gppConsent = {
        gppString: 'DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
        applicableSections: [7],
      };
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.regs.gpp).to.equal(bidderRequest.gppConsent.gppString);
      expect(data.regs.gpp_sid).to.deep.equal([7]);
    });

    it('should not add GPP consent to regs when absent', () => {
      const { validBR, bidderRequest } = createRequestMock();
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.regs.gpp).to.be.undefined;
      expect(data.regs.gpp_sid).to.be.undefined;
    });

    it('should set site.id from params.sid', () => {
      const { validBR, bidderRequest } = createRequestMock();
      validBR[0].params.sid = '9876543210';
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.site.id).to.equal('9876543210');
    });

    it('should set app.id (and no site) for app requests', () => {
      const ortb2 = { app: { bundle: 'com.adtarget.example' } };
      const { validBR, bidderRequest } = createRequestMock({ ortb2 });
      const request = buildFirst(validBR, bidderRequest);
      expect(request.data.app.id).to.equal(DEFAULT_SID);
      expect(request.data.app.bundle).to.equal('com.adtarget.example');
      expect(request.data.site).to.be.undefined;
      expect(request.url).to.equal('https://rtb.cdn.adtarget.market/ssp?prebid&s=' + DEFAULT_SID);
    });

    it('should set imp.tagid from params.zid', () => {
      const { validBR, bidderRequest } = createRequestMock();
      validBR[0].params.zid = '54321';
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.imp[0].tagid).to.equal('54321');
    });

    it('should pass through ortb2 site fields', () => {
      const ortb2 = { site: { name: 'a-name', cat: ['IAB1'] } };
      const { validBR, bidderRequest } = createRequestMock({ ortb2 });
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.site.name).to.equal('a-name');
      expect(data.site.cat).to.deep.equal(['IAB1']);
    });

    it('should pass through ortb2 user fields', () => {
      const ortb2 = { user: { id: 'user-1', ext: { a: '123', b: '456' } } };
      const { validBR, bidderRequest } = createRequestMock({ ortb2 });
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.user.id).to.equal('user-1');
      expect(data.user.ext).to.deep.include({ a: '123', b: '456' });
    });

    it('should pass through ortb2Imp.ext.data', () => {
      const { validBR, bidderRequest } = createRequestMock();
      validBR[0].ortb2Imp = { ext: { data: { pbadslot: 'homepage-top-rect', adUnitSpecificAttribute: '123' } } };
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.imp[0].ext.data).to.deep.equal(validBR[0].ortb2Imp.ext.data);
    });

    it('should pass through ortb2Imp.instl === 1', () => {
      const { validBR, bidderRequest } = createRequestMock();
      validBR[0].ortb2Imp = { instl: 1 };
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.imp[0].instl).to.equal(1);
    });
  });

  describe('Bidfloor support', () => {
    it('should set imp.bidfloor and request currency from the price floors module', () => {
      const { bidRequest, validBR, bidderRequest } = createRequestMock();
      bidRequest.getFloor = () => ({ floor: 1.111, currency: 'AUD' });
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.cur).to.deep.equal(['AUD']);
      expect(data.imp[0].bidfloor).to.equal(1.111);
    });

    it('should set imp.bidfloor from params.bidOverride.imp as a fallback', () => {
      const { validBR, bidderRequest } = createRequestMock({
        bidOverride: { imp: { bidfloor: 2.5, bidfloorcur: 'EUR' } },
      });
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.imp[0].bidfloor).to.equal(2.5);
      expect(data.imp[0].bidfloorcur).to.equal('EUR');
      expect(data.cur).to.deep.equal(['EUR']);
    });

    it('should query getFloor with the sole media type (banner-specific floor rule)', () => {
      const { bidRequest, validBR, bidderRequest } = createRequestMock();
      // floor is defined only for the banner media type, not the '*' wildcard
      bidRequest.getFloor = ({ mediaType }) =>
        (mediaType === 'banner' ? { floor: 2.0, currency: 'USD' } : {});
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.imp[0].bidfloor).to.equal(2.0);
    });
  });

  describe('Schain support', () => {
    it('should forward ortb2.source.ext.schain to source.schain', () => {
      const { bidRequest, validBR, bidderRequest } = createRequestMock();
      const globalSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'adtarget-partner.com', sid: '1234567890', rid: bidRequest.bidId, hp: 1 }],
      };
      bidRequest.ortb2 = { source: { ext: { schain: globalSchain } } };
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.source.schain.nodes).to.have.lengthOf(1);
      expect(data.source.schain).to.equal(globalSchain);
    });
  });

  describe('Media type imps', () => {
    it('should build a default banner imp', () => {
      const { validBR, bidderRequest } = createRequestMock();
      const { data } = buildFirst(validBR, bidderRequest);
      expect(data.imp[0].banner).to.deep.include({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{ w: 300, h: 250 }],
      });
      expect(data.imp[0].secure).to.equal(1);
    });

    if (FEATURES.VIDEO) {
      it('should build a video imp and drop non-ORTB params', () => {
        const mediaTypes = {
          video: {
            playerSize: [[640, 480]],
            mimes: ['video/mp4'],
            protocols: [2, 3],
            api: [2],
            maxduration: 30,
            context: 'instream',
          },
        };
        const { validBR, bidderRequest } = createRequestMock({ mediaTypes });
        const { data } = buildFirst(validBR, bidderRequest);
        expect(data.imp[0].video).to.deep.include({
          mimes: ['video/mp4'],
          protocols: [2, 3],
          api: [2],
          maxduration: 30,
          w: 640,
          h: 480,
        });
        expect(data.imp[0].video.context).to.be.undefined;
        expect(data.imp[0].banner).to.be.undefined;
      });

      it('should support multi-format (banner + video) imps', () => {
        const mediaTypes = {
          banner: { sizes: [[300, 250]] },
          video: { playerSize: [[300, 250]], mimes: ['video/mp4'] },
        };
        const { validBR, bidderRequest } = createRequestMock({ mediaTypes });
        const { data } = buildFirst(validBR, bidderRequest);
        expect(data.imp[0].banner).to.exist;
        expect(data.imp[0].video).to.deep.include({ mimes: ['video/mp4'], w: 300, h: 250 });
      });
    }

    if (FEATURES.NATIVE) {
      it('should build a native imp from nativeOrtbRequest', () => {
        const mediaTypes = { native: { ortb: { assets: [] } } };
        const { validBR, bidderRequest } = createRequestMock({ mediaTypes });
        validBR[0].nativeOrtbRequest = {
          ver: '1.2',
          assets: [{ id: 1, required: 1, title: { len: 80 } }],
        };
        const { data } = buildFirst(validBR, bidderRequest);
        expect(data.imp[0].native).to.exist;
        expect(data.imp[0].native.ver).to.equal('1.2');
        const nativeReq = JSON.parse(data.imp[0].native.request);
        expect(nativeReq.assets).to.have.lengthOf(1);
        expect(nativeReq.assets[0].title.len).to.equal(80);
        expect(data.imp[0].banner).to.be.undefined;
      });

      it('should skip the native imp when no assets are specified', () => {
        const mediaTypes = { native: { ortb: { assets: [] } } };
        const { validBR, bidderRequest } = createRequestMock({ mediaTypes });
        validBR[0].nativeOrtbRequest = { assets: [] };
        const { data } = buildFirst(validBR, bidderRequest);
        expect(data.imp[0].native).to.be.undefined;
      });
    }
  });

  describe('interpretResponse', () => {
    const buildAndInterpret = (bid, opts = {}) => {
      const { validBR, bidderRequest } = createRequestMock(opts);
      const request = buildFirst(validBR, bidderRequest);
      return spec.interpretResponse(createServerResponse(bid), request);
    };

    it('should return [] for an empty response', () => {
      const { validBR, bidderRequest } = createRequestMock();
      const request = buildFirst(validBR, bidderRequest);
      expect(spec.interpretResponse({ body: {} }, request)).to.deep.equal([]);
    });

    it('should interpret a banner bid into bidResponse.ad', () => {
      const adm = `<script>(new Image()).src="${DEFAULT_PIXEL_URL}"</script>\n<img src="${DEFAULT_BANNER_URL}" />`;
      const response = buildAndInterpret(createSeatBid({ adm }));
      expect(response[0].mediaType).to.equal('banner');
      expect(response[0].ad).to.equal(adm);
      expect(response[0].meta.mediaType).to.equal('banner');
    });

    it('should expose advertiser domains in meta', () => {
      const response = buildAndInterpret(createSeatBid({ adm: '<div>ad</div>' }));
      expect(response[0].meta.advertiserDomains).to.deep.equal(['some-advertiser-domain.com']);
    });

    if (FEATURES.VIDEO) {
      it('should set mediaType video with vastXml/vastUrl', () => {
        const response = buildAndInterpret(
          createSeatBid({ mtype: 2, adm: '<VAST version="4.0"></VAST>', nurl: 'https://vast.example/win' }),
          { mediaTypes: { video: { playerSize: [[640, 480]], mimes: ['video/mp4'] } } }
        );
        expect(response[0].mediaType).to.equal('video');
        expect(response[0].vastXml).to.equal('<VAST version="4.0"></VAST>');
        expect(response[0].vastUrl).to.equal('https://vast.example/win');
        expect(response[0].ad).to.be.undefined;
      });

      it('should infer video mediaType from VAST markup when mtype is absent', () => {
        const response = buildAndInterpret(
          createSeatBid({ mtype: undefined, adm: '<VAST version="4.0"></VAST>' }),
          { mediaTypes: { video: { playerSize: [[640, 480]], mimes: ['video/mp4'] } } }
        );
        expect(response[0].mediaType).to.equal('video');
      });

      it('should infer video mediaType from the matched imp when mtype/adm are absent and only nurl is set', () => {
        const response = buildAndInterpret(
          createSeatBid({ mtype: undefined, adm: undefined, nurl: 'https://vast.example/win' }),
          { mediaTypes: { video: { playerSize: [[640, 480]], mimes: ['video/mp4'] } } }
        );
        expect(response[0].mediaType).to.equal('video');
        expect(response[0].vastUrl).to.equal('https://vast.example/win');
        expect(response[0].ad).to.be.undefined;
      });
    }

    if (FEATURES.NATIVE) {
      it('should parse an ORTB native adm into native.ortb', () => {
        const ortbNative = {
          ver: '1.2',
          assets: [{ id: 1, title: { text: 'Native title' } }],
          link: { url: 'https://click.example' },
        };
        const response = buildAndInterpret(
          createSeatBid({ mtype: 4, adm: JSON.stringify(ortbNative), crid: 'native-crid' }),
          { mediaTypes: { native: { ortb: { assets: [] } } } }
        );
        expect(response[0].mediaType).to.equal('native');
        expect(response[0].native.ortb).to.deep.equal(ortbNative);
        expect(response[0].ad).to.be.undefined;
      });

      it('should drop a native bid-response that contains no assets', () => {
        const response = buildAndInterpret(
          createSeatBid({ mtype: 4, adm: '{"ver":"1.2"}' }),
          { mediaTypes: { native: { ortb: { assets: [] } } } }
        );
        expect(response).to.have.lengthOf(0);
      });

      it('should infer native mediaType from JSON markup when mtype is absent', () => {
        const ortbNative = { ver: '1.2', assets: [{ id: 1, title: { text: 'x' } }] };
        const response = buildAndInterpret(
          createSeatBid({ mtype: undefined, adm: JSON.stringify(ortbNative), crid: 'native-crid' }),
          { mediaTypes: { native: { ortb: { assets: [] } } } }
        );
        expect(response[0].mediaType).to.equal('native');
        expect(response[0].native.ortb).to.deep.equal(ortbNative);
      });
    }

    describe('adId fallbacks', () => {
      it('should use adId if present', () => {
        const response = buildAndInterpret(createSeatBid({ adId: 'bid-response-adId', adm: '<div>ad</div>' }));
        expect(response[0].adId).to.equal('bid-response-adId');
      });
      it('should fall back to impid when adId missing', () => {
        const response = buildAndInterpret(createSeatBid({ adm: '<div>ad</div>' }));
        expect(response[0].adId).to.equal(DEFAULT_BID_ID);
      });
    });

    describe('currency', () => {
      const interpret = (body) => {
        const { validBR, bidderRequest } = createRequestMock();
        const request = buildFirst(validBR, bidderRequest);
        return spec.interpretResponse({ body }, request);
      };

      it('should keep the top-level response currency instead of forcing USD', () => {
        const response = interpret({
          cur: 'EUR',
          seatbid: [{ bid: [createSeatBid({ adm: '<div>ad</div>' })] }],
        });
        expect(response[0].currency).to.equal('EUR');
      });

      it('should let a non-standard per-bid cur override the response currency', () => {
        const response = interpret({
          cur: 'EUR',
          seatbid: [{ bid: [createSeatBid({ adm: '<div>ad</div>', cur: 'GBP' })] }],
        });
        expect(response[0].currency).to.equal('GBP');
      });
    });

    describe('ttl resolution', () => {
      const interpretWithTtl = (configure) => {
        const { validBR, bidderRequest } = createRequestMock();
        configure(validBR, bidderRequest);
        const request = buildFirst(validBR, bidderRequest);
        return spec.interpretResponse(createServerResponse(createSeatBid({ adm: '<div>ad</div>' })), request);
      };

      const BAD_TTL = ['string', [1, 2, 3], true, false, null, undefined, -1, 12345];
      BAD_TTL.forEach((value) => {
        it(`should default to 300 for invalid global ttl ${JSON.stringify(value)}`, () => {
          const response = interpretWithTtl(() => config.setConfig({ adtrgtme: { ttl: value } }));
          expect(response[0].ttl).to.equal(300);
        });
        it(`should default to 300 for invalid params.ttl ${JSON.stringify(value)}`, () => {
          const response = interpretWithTtl((validBR) => { validBR[0].params.ttl = value; });
          expect(response[0].ttl).to.equal(300);
        });
      });

      it('should prefer global ttl over params.ttl', () => {
        const response = interpretWithTtl((validBR) => {
          config.setConfig({ adtrgtme: { ttl: 500 } });
          validBR[0].params.ttl = 400;
        });
        expect(response[0].ttl).to.equal(500);
      });

      it('should use a valid params.ttl', () => {
        const response = interpretWithTtl((validBR) => { validBR[0].params.ttl = 400; });
        expect(response[0].ttl).to.equal(400);
      });
    });
  });

  describe('getUserSyncs', () => {
    const BAD_SYNC_URL = 'cdn.adtarget.me/libs/1x1.gif?image&rnd=5fr55r';
    const IMAGE_SYNC_URL = `${DEFAULT_PIXEL_URL}?image&rnd=5fr55r`;
    const IFRAME_SYNC_ONE_URL = `${DEFAULT_PIXEL_URL}?iframe1&rnd=5fr55r`;
    const IFRAME_SYNC_TWO_URL = `${DEFAULT_PIXEL_URL}?iframe2&rnd=5fr55r`;

    let serverResponses;
    beforeEach(() => {
      serverResponses = [{
        body: {
          ext: {
            pixels: [
              ['image', BAD_SYNC_URL],
              ['invalid', IMAGE_SYNC_URL],
              ['image', IMAGE_SYNC_URL],
              ['iframe', IFRAME_SYNC_ONE_URL],
              ['iframe', IFRAME_SYNC_TWO_URL],
            ],
          },
        },
      }];
    });

    it('should return [] when no sync is enabled', () => {
      expect(spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: false }, serverResponses)).to.deep.equal([]);
    });

    it('should skip bad urls and unknown types', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses);
      expect(syncs).to.have.lengthOf(3);
    });

    it('should return iframe syncs only', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses);
      expect(syncs).to.deep.equal([
        { type: 'iframe', url: IFRAME_SYNC_ONE_URL },
        { type: 'iframe', url: IFRAME_SYNC_TWO_URL },
      ]);
    });

    it('should return image syncs only', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'image', url: IMAGE_SYNC_URL }]);
    });

    it('should append consent params when consent is provided', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: true },
        serverResponses,
        { gdprApplies: true, consentString: 'consent-123' },
        '1YNN'
      );
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=consent-123');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('should append gpp params when gpp consent is provided', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: true },
        serverResponses,
        undefined,
        undefined,
        { gppString: 'DBABMA~CPXxRfA', applicableSections: [7] }
      );
      expect(syncs[0].url).to.include('gpp=DBABMA');
      expect(syncs[0].url).to.include('gpp_sid=7');
    });
  });
});
