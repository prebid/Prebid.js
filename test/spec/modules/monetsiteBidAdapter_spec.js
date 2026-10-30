import { expect } from 'chai';
import { config } from 'src/config.js';
import { spec } from 'modules/monetsiteBidAdapter.js';
import 'modules/priceFloors.js';

const ZONE_ID = '123456';
const BID_ID = '2f9c1e7a5b3d4c';

function makeBid({ params = { zoneID: ZONE_ID }, mediaTypes, bidId = BID_ID, ...rest } = {}) {
  return {
    bidder: 'monetsite',
    bidId,
    adUnitCode: 'div-gpt-ad-1',
    auctionId: 'a1b2c3d4-0000-4000-8000-000000000001',
    transactionId: 't1b2c3d4-0000-4000-8000-000000000002',
    mediaTypes: mediaTypes || { banner: { sizes: [[300, 250], [300, 600]] } },
    params,
    ortb2: {},
    ortb2Imp: {},
    ...rest,
  };
}

function makeBidderRequest(bids, overrides = {}) {
  return {
    bidderCode: 'monetsite',
    auctionId: bids[0]?.auctionId,
    bids,
    timeout: 1000,
    refererInfo: { page: 'https://publisher.example/article', domain: 'publisher.example' },
    ortb2: {
      site: { page: 'https://publisher.example/article', domain: 'publisher.example' },
      device: { ua: 'test-ua' },
    },
    ...overrides,
  };
}

function build(bids = [makeBid()], bidderRequestOverrides) {
  return spec.buildRequests(bids, makeBidderRequest(bids, bidderRequestOverrides));
}

function makeServerResponse(bid = {}, body = {}) {
  return {
    body: {
      id: 'resp-1',
      cur: 'USD',
      seatbid: [{
        seat: 'ms',
        bid: [{
          id: 'b-1',
          impid: BID_ID,
          price: 1.25,
          w: 300,
          h: 250,
          crid: 'cr-1',
          adm: '<div>ad</div>',
          mtype: 1,
          adomain: ['advertiser.example'],
          ...bid,
        }],
      }],
      ...body,
    },
  };
}

describe('monetsiteBidAdapter', () => {
  afterEach(() => {
    config.resetConfig();
  });

  it('registers bidder code and media types', () => {
    expect(spec.code).to.equal('monetsite');
    expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', 'native']);
  });

  describe('isBidRequestValid', () => {
    [
      { zoneID: '123456' },
      { zoneID: ' 123456 ' },
      { zoneID: 'zone-a' },
      { zoneID: 123456 },
      { zoneID: '123456', bidfloor: 0 },
      { zoneID: '123456', bidfloor: 0.5, cur: 'EUR' },
      { zoneID: '123456', bidfloor: '1.25', cur: 'usd' },
      { zoneID: '123456', cur: 'GBP' },
      { zoneID: '123456', mirror: 'z.cdn.adsbetnet.com' },
      { zoneID: '123456', mirror: ' RTB.Example.COM ' },
    ].forEach((params) => {
      it(`accepts ${JSON.stringify(params)}`, () => {
        expect(spec.isBidRequestValid({ params })).to.equal(true);
      });
    });

    [
      undefined,
      {},
      { zoneID: '' },
      { zoneID: '   ' },
      { zoneID: 0 },
      { zoneID: -1 },
      { zoneID: null },
      { zoneID: {} },
      { zid: '123456' },
      { sid: '123456' },
      { zoneID: '123456', bidfloor: -1 },
      { zoneID: '123456', bidfloor: 'abc' },
      { zoneID: '123456', bidfloor: '' },
      { zoneID: '123456', bidfloor: Infinity },
      { zoneID: '123456', bidfloor: {} },
      { zoneID: '123456', bidfloor: 1, cur: 'EURO' },
      { zoneID: '123456', bidfloor: 1, cur: 840 },
      { zoneID: '123456', cur: '' },
      { zoneID: '123456', mirror: '' },
      { zoneID: '123456', mirror: 'https://rtb.example.com' },
      { zoneID: '123456', mirror: 'rtb.example.com/ssp' },
      { zoneID: '123456', mirror: 'rtb.example.com:8080' },
      { zoneID: '123456', mirror: 'localhost' },
      { zoneID: '123456', mirror: '-bad.example.com' },
      { zoneID: '123456', mirror: 'evil.com?x=' },
      { zoneID: '123456', mirror: 123 },
    ].forEach((params) => {
      it(`rejects ${JSON.stringify(params)}`, () => {
        expect(spec.isBidRequestValid({ params })).to.equal(false);
      });
    });

    it('rejects a bid without params', () => {
      expect(spec.isBidRequestValid({})).to.equal(false);
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('sends one POST per bid with the zone id in the URL', () => {
      const requests = build([
        makeBid({ bidId: 'bid-1', params: { zoneID: '111' } }),
        makeBid({ bidId: 'bid-2', params: { zoneID: 222 } }),
      ]);
      expect(requests).to.have.length(2);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://rtb.monetize.site/ssp?z=111');
      expect(requests[1].url).to.equal('https://rtb.monetize.site/ssp?z=222');
      expect(requests[0].data.imp).to.have.length(1);
      expect(requests[0].data.imp[0].id).to.equal('bid-1');
      expect(requests[1].data.imp[0].id).to.equal('bid-2');
    });

    it('url-encodes and trims the zone id', () => {
      const [request] = build([makeBid({ params: { zoneID: ' a b&c ' } })]);
      expect(request.url).to.equal('https://rtb.monetize.site/ssp?z=a%20b%26c');
      expect(request.data.imp[0].tagid).to.equal('a b&c');
    });

    it('sends the payload as application/json', () => {
      const [request] = build();
      expect(request.options.contentType).to.equal('application/json');
    });

    it('sends cookies only with purpose 1 consent', () => {
      expect(build()[0].options.withCredentials).to.equal(true);
      const noConsent = build([makeBid()], {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'CO',
          vendorData: { purpose: { consents: { 1: false } } },
        },
      });
      expect(noConsent[0].options.withCredentials).to.equal(false);
    });

    it('allows overriding the endpoint via setConfig', () => {
      config.setConfig({ monetsite: { endpoint: 'https://test.monetize.site/ssp?z=' } });
      expect(build()[0].url).to.equal('https://test.monetize.site/ssp?z=123456');
    });

    it('sends the request to params.mirror over https', () => {
      const [request] = build([makeBid({ params: { zoneID: '111', mirror: ' Z.CDN.adsbetnet.com ' } })]);
      expect(request.url).to.equal('https://z.cdn.adsbetnet.com/ssp?z=111');
    });

    it('lets params.mirror override the endpoint config, per bid', () => {
      config.setConfig({ monetsite: { endpoint: 'https://test.monetize.site/ssp?z=' } });
      const requests = build([
        makeBid({ bidId: 'a', params: { zoneID: '1', mirror: 'rtb.example.com' } }),
        makeBid({ bidId: 'b', params: { zoneID: '2' } }),
      ]);
      expect(requests[0].url).to.equal('https://rtb.example.com/ssp?z=1');
      expect(requests[1].url).to.equal('https://test.monetize.site/ssp?z=2');
    });

    it('builds an ORTB imp with tagid, ad unit code and banner formats', () => {
      const imp = build()[0].data.imp[0];
      expect(imp.tagid).to.equal(ZONE_ID);
      expect(imp.ext.adUnitCode).to.equal('div-gpt-ad-1');
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 300, h: 600 }]);
    });

    it('passes first party data, source ext and default currency', () => {
      const data = build()[0].data;
      expect(data.site.page).to.equal('https://publisher.example/article');
      expect(data.site.domain).to.equal('publisher.example');
      expect(data.device.ua).to.equal('test-ua');
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.source.ext).to.include({ hb: 1, adapterver: '1.0.0' });
      expect(data.source.ext.prebidjsver).to.be.a('string');
    });

    it('forwards consent and schain from ortb2', () => {
      const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'monetize.site', sid: '1', hp: 1 }] };
      const data = build([makeBid()], {
        ortb2: {
          regs: { ext: { gdpr: 1, us_privacy: '1YNN' } },
          user: { ext: { consent: 'consent-string' } },
          source: { ext: { schain } },
        },
      })[0].data;
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('consent-string');
      expect(data.source.ext.schain).to.deep.equal(schain);
      expect(data.source.ext.hb).to.equal(1);
    });

    it('builds video and native imps', () => {
      const [videoReq, nativeReq] = build([
        makeBid({
          bidId: 'v',
          mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } },
        }),
        makeBid({
          bidId: 'n',
          mediaTypes: { native: { ortb: { assets: [{ id: 1, required: 1, title: { len: 80 } }] } } },
          nativeOrtbRequest: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] },
        }),
      ]);
      if (FEATURES.VIDEO) {
        expect(videoReq.data.imp[0].video).to.include({ w: 640, h: 480 });
      }
      if (FEATURES.NATIVE) {
        expect(JSON.parse(nativeReq.data.imp[0].native.request).assets[0].title.len).to.equal(80);
      }
    });

    it('uses the price floors module for bidfloor and request currency', () => {
      const bid = makeBid();
      bid.getFloor = ({ mediaType }) => (mediaType === 'banner' ? { floor: 0.75, currency: 'EUR' } : {});
      const data = build([bid])[0].data;
      expect(data.imp[0].bidfloor).to.equal(0.75);
      expect(data.imp[0].bidfloorcur).to.equal('EUR');
      expect(data.cur).to.deep.equal(['EUR']);
    });

    it('sends bidfloor 0 in USD when there is no floor', () => {
      const data = build()[0].data;
      expect(data.imp[0].bidfloor).to.equal(0);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
      expect(data.cur).to.deep.equal(['USD']);
    });

    it('uses bidfloor and cur from the ad unit params', () => {
      const data = build([makeBid({ params: { zoneID: ZONE_ID, bidfloor: '0.35', cur: 'eur' } })])[0].data;
      expect(data.imp[0].bidfloor).to.equal(0.35);
      expect(data.imp[0].bidfloorcur).to.equal('EUR');
      expect(data.cur).to.deep.equal(['EUR']);
    });

    it('defaults the params floor currency to USD', () => {
      const imp = build([makeBid({ params: { zoneID: ZONE_ID, bidfloor: 2 } })])[0].data.imp[0];
      expect(imp.bidfloor).to.equal(2);
      expect(imp.bidfloorcur).to.equal('USD');
    });

    it('prefers the price floors module over the ad unit params', () => {
      const bid = makeBid({ params: { zoneID: ZONE_ID, bidfloor: 0.1, cur: 'GBP' } });
      bid.getFloor = () => ({ floor: 0.9, currency: 'EUR' });
      const imp = build([bid])[0].data.imp[0];
      expect(imp.bidfloor).to.equal(0.9);
      expect(imp.bidfloorcur).to.equal('EUR');
    });

    it('falls back to the ad unit params when the floors module has no rule', () => {
      const bid = makeBid({ params: { zoneID: ZONE_ID, bidfloor: 0.4 } });
      bid.getFloor = () => ({});
      const imp = build([bid])[0].data.imp[0];
      expect(imp.bidfloor).to.equal(0.4);
      expect(imp.bidfloorcur).to.equal('USD');
    });

    it('asks for a wildcard floor on multi-format ad units', () => {
      const bid = makeBid({
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          native: { ortb: { assets: [{ id: 1, required: 1, title: { len: 80 } }] } },
        },
        nativeOrtbRequest: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] },
      });
      const requested = [];
      bid.getFloor = ({ mediaType }) => {
        requested.push(mediaType);
        return { floor: 0.5, currency: 'USD' };
      };
      const imp = build([bid])[0].data.imp[0];
      expect(requested).to.include('*');
      expect(imp.banner).to.exist;
      if (FEATURES.NATIVE) {
        expect(imp.native).to.exist;
      }
      expect(imp.bidfloor).to.equal(0.5);
    });
  });

  describe('interpretResponse', () => {
    function interpret(serverResponse, bids = [makeBid()]) {
      const [request] = build(bids);
      return spec.interpretResponse(serverResponse, request);
    }

    it('returns no bids for empty or malformed responses', () => {
      expect(interpret(undefined)).to.deep.equal([]);
      expect(interpret({})).to.deep.equal([]);
      expect(interpret({ body: '' })).to.deep.equal([]);
      expect(interpret({ body: { seatbid: {} } })).to.deep.equal([]);
    });

    it('converts an ORTB banner bid', () => {
      const [bid] = interpret(makeServerResponse());
      expect(bid).to.include({
        requestId: BID_ID,
        cpm: 1.25,
        width: 300,
        height: 250,
        creativeId: 'cr-1',
        ad: '<div>ad</div>',
        mediaType: 'banner',
        currency: 'USD',
        netRevenue: true,
        ttl: 500,
      });
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    it('applies the configured ttl and ignores out of range values', () => {
      config.setConfig({ monetsite: { ttl: 600 } });
      expect(interpret(makeServerResponse())[0].ttl).to.equal(600);
      config.setConfig({ monetsite: { ttl: 5000 } });
      expect(interpret(makeServerResponse())[0].ttl).to.equal(5000);
      config.setConfig({ monetsite: { ttl: 5001 } });
      expect(interpret(makeServerResponse())[0].ttl).to.equal(500);
      config.setConfig({ monetsite: { ttl: 0 } });
      expect(interpret(makeServerResponse())[0].ttl).to.equal(500);
    });

    it('infers the media type when mtype is missing', () => {
      const [bid] = interpret(makeServerResponse({ mtype: undefined }));
      expect(bid.mediaType).to.equal('banner');
    });

    if (FEATURES.VIDEO) {
      it('converts a video bid', () => {
        const videoBid = makeBid({
          mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } },
        });
        const [bid] = interpret(makeServerResponse({ mtype: 2, adm: '<VAST version="4.0"></VAST>' }), [videoBid]);
        expect(bid.mediaType).to.equal('video');
        expect(bid.vastXml).to.equal('<VAST version="4.0"></VAST>');
      });
    }
  });

  describe('getUserSyncs', () => {
    const responses = [{
      body: {
        ext: {
          pixels: [
            ['image', 'https://sync.monetize.site/img?x=1'],
            ['IFRAME', 'https://sync.monetize.site/frame'],
            ['img', 'https://sync.monetize.site/img2'],
            ['image', 'http://insecure.example/px'],
            ['script', 'https://sync.monetize.site/js'],
            ['image', 42],
          ],
        },
      },
    }];

    it('returns nothing when syncs are disabled or there are no pixels', () => {
      expect(spec.getUserSyncs({}, responses)).to.deep.equal([]);
      expect(spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [{ body: {} }])).to.deep.equal([]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, undefined)).to.deep.equal([]);
    });

    it('returns only enabled, https sync types', () => {
      expect(spec.getUserSyncs({ pixelEnabled: true }, responses)).to.deep.equal([
        { type: 'image', url: 'https://sync.monetize.site/img?x=1' },
        { type: 'image', url: 'https://sync.monetize.site/img2' },
      ]);
      expect(spec.getUserSyncs({ iframeEnabled: true }, responses)).to.deep.equal([
        { type: 'iframe', url: 'https://sync.monetize.site/frame' },
      ]);
    });

    it('appends consent parameters', () => {
      const [first, second] = spec.getUserSyncs(
        { pixelEnabled: true, iframeEnabled: true },
        responses,
        { gdprApplies: true, consentString: 'abc=' },
        '1YNN',
        { gppString: 'DBA', applicableSections: [7, 8] }
      );
      expect(first.url).to.equal(
        'https://sync.monetize.site/img?x=1&gdpr=1&gdpr_consent=abc%3D&us_privacy=1YNN&gpp=DBA&gpp_sid=7%2C8'
      );
      expect(second.url).to.equal(
        'https://sync.monetize.site/frame?gdpr=1&gdpr_consent=abc%3D&us_privacy=1YNN&gpp=DBA&gpp_sid=7%2C8'
      );
    });

    it('registers each sync once across per-bid responses', () => {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [...responses, ...responses]);
      expect(syncs.map(({ type, url }) => `${type} ${url}`)).to.deep.equal([
        'image https://sync.monetize.site/img?x=1',
        'iframe https://sync.monetize.site/frame',
        'image https://sync.monetize.site/img2',
      ]);
    });

    it('returns no syncs when COPPA applies', () => {
      const options = { pixelEnabled: true, iframeEnabled: true };
      expect(spec.getUserSyncs(options, responses, undefined, undefined, undefined, true)).to.deep.equal([]);
      expect(spec.getUserSyncs(options, responses, undefined, undefined, undefined, false)).to.have.length(3);
    });

    it('sends gdpr=0 and an empty consent string when gdpr does not apply', () => {
      const [sync] = spec.getUserSyncs({ iframeEnabled: true }, responses, { gdprApplies: false });
      expect(sync.url).to.equal('https://sync.monetize.site/frame?gdpr=0&gdpr_consent=');
    });
  });
});
