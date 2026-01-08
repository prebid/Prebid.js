import { expect } from 'chai';
import { config } from 'src/config.js';
import { spec } from 'modules/adtrgtmeBidAdapter.js';

const DEFAULT_SID = '1220291391';
const DEFAULT_ZID = '1836455615';
const DEFAULT_PIXEL_URL = 'https://cdn.adtarget.me/libs/1x1.gif';
const DEFAULT_BANNER_URL = 'https://cdn.adtarget.me/libs/banner/300x250.jpg';
const BIDDER_VERSION = '1.0.7';
const PREBIDJS_VERSION = '$prebid.version$';

const createBidRequest = ({bidId, adUnitCode, bidOverride, zid, ortb2}) => {
  const bR = {
    auctionId: 'f3c594t-3o0ch1b0rm-ayn93c3o0ch1b0rm',
    adUnitCode,
    bidId,
    bidder: 'adtrgtme',
    mediaTypes: {},
    params: {
      sid: DEFAULT_SID,
      bidOverride
    },
    transactionId: '5b17b67d-7704-4732-8cc9-5b1723e9bcf9',
    ortb2
  };

  bR.mediaTypes.banner = {
    sizes: [[300, 250]]
  };
  bR.sizes = [[300, 250]];

  if (typeof zid === 'string') {
    bR.params.zid = zid;
  }
  return bR;
}

const createBidderRequest = (arr, code = 'default-code', ortb2 = {}) => {
  return {
    adUnitCode: code,
    auctionId: 'd4c83a3b-18e4-4208-b98b-63848449c7aa',
    bidderCode: 'adtrgtme',
    bids: arr,
    refererInfo: {
      page: 'https://partner-site.com',
      stack: ['https://partner-site.com'],
    },
    gdprConsent: {
      consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
      vendorData: {},
      gdprApplies: true
    },
    timeout: 1000,
    ortb2
  };
};

const createRequestMock = ({bidId, adUnitCode, type, zid, bidOverride, pubIdMode, ortb2}) => {
  const bR = createBidRequest({
    bidId: bidId || '84ab500420319d',
    adUnitCode: adUnitCode || '/1220291391/banner',
    type: type || 'banner',
    zid: zid || DEFAULT_ZID,
    bidOverride: bidOverride || {},
    pubIdMode: pubIdMode || false,
    ortb2: ortb2 || {}
  });
  return { bidRequest: bR, validBR: [bR], bidderRequest: createBidderRequest([bR], adUnitCode, ortb2) }
};

const createAdm = (type) => {
  let ADM;
  switch (type) {
    case 'banner':
      ADM = `<script>(new Image()).src="${DEFAULT_PIXEL_URL}"</script>
      <img src="${DEFAULT_BANNER_URL}" />`;
      break;
    default:
      ADM = '<span>Ad is here</span>';
      break;
  };
  return ADM;
};

const createResponseMock = (type) => {
  const sR = {
    body: {
      id: '5qtvluj7bk6jhzmqwu4zzulv',
      seatbid: [{
        bid: [{
          id: '5qtvluj7bk6jhzmqwu4zzulv',
          impid: 'y7v7iu0uljj94rbjcw9',
          adm: createAdm(type),
          price: 1,
          w: 300,
          h: 250,
          crid: 'creativeid',
          adomain: ['some-advertiser-domain.com']
        }],
        seat: 12345
      }]
    }
  };
  const { validBR, bidderRequest } = createRequestMock({type});
  const data = spec.buildRequests(validBR, bidderRequest)[0].data;

  return {sR, data, bidderRequest};
}

describe('Adtrgtme Bid Adapter:', () => {
  it('PLACEHOLDER TO PASS GULP', () => {
    expect({}).to.be.an('object');
  });

  describe('check basic properties', () => {
    it('should define bidder code', () => {
      expect(spec.code).to.equal('adtrgtme')
    });
  });

  describe('getUserSyncs', () => {
    const BAD_SYNC_URL = 'cdn.adtarget.me/libs/1x1.gif?image&rnd=5fr55r';
    const IMAGE_SYNC_URL = `${DEFAULT_PIXEL_URL}?image&rnd=5fr55r`;
    const IFRAME_SYNC_ONE_URL = `${DEFAULT_PIXEL_URL}?iframe1&rnd=5fr55r`;
    const IFRAME_SYNC_TWO_URL = `${DEFAULT_PIXEL_URL}?iframe2&rnd=5fr55r`;

    let sRs = [];
    beforeEach(() => {
      sRs[0] = {
        body: {
          ext: {
            pixels: [
              ['image', BAD_SYNC_URL],
              ['invalid', IMAGE_SYNC_URL],
              ['image', IMAGE_SYNC_URL],
              ['iframe', IFRAME_SYNC_ONE_URL],
              ['iframe', IFRAME_SYNC_TWO_URL]
            ]
          }
        }
      }
    });

    after(() => {
      sRs = undefined;
    });

    it('sync check bad url and type in pixels', () => {
      const opt = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      const pixels = spec.getUserSyncs(opt, sRs);
      expect(pixels.length).to.equal(3);
    });

    it('sync check for iframe only', () => {
      const opt = {
        iframeEnabled: true,
        pixelEnabled: false
      };
      const pixels = spec.getUserSyncs(opt, sRs);
      expect(pixels.length).to.equal(2);
      expect(pixels).to.deep.equal(
        [
          {type: 'iframe', 'url': IFRAME_SYNC_ONE_URL},
          {type: 'iframe', 'url': IFRAME_SYNC_TWO_URL}
        ]
      )
    });

    it('sync check for image only', () => {
      const opt = {
        iframeEnabled: false,
        pixelEnabled: true
      };
      const pixels = spec.getUserSyncs(opt, sRs);
      expect(pixels.length).to.equal(1);
      expect(pixels).to.deep.equal(
        [
          {type: 'image', 'url': IMAGE_SYNC_URL}
        ]
      )
    });

    it('Sync for iframe and image', () => {
      const opt = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      const pixels = spec.getUserSyncs(opt, sRs);
      expect(pixels.length).to.equal(3);
      expect(pixels).to.deep.equal(
        [
          {type: 'image', 'url': IMAGE_SYNC_URL},
          {type: 'iframe', 'url': IFRAME_SYNC_ONE_URL},
          {type: 'iframe', 'url': IFRAME_SYNC_TWO_URL}
        ]
      )
    });
  });

  describe('Check if bid request is OK', () => {
    const BAD_VALUE = [
      {},
      {params: {}},
      {params: {sid: 1220291391, zid: '1836455615'}},
      {params: {sid: '1220291391', zid: 'A'}},
      {params: {sid: '', zid: '1836455615'}},
      {params: {sid: '', zid: 'A'}},
      {params: {zid: ''}},
    ];

    BAD_VALUE.forEach(value => {
      it(`should determine bad bid for ${JSON.stringify(value)}`, () => {
        expect(spec.isBidRequestValid(value)).to.be.false;
      });
    });

    const OK_VALUE = [
      {params: {sid: '1220291391'}},
      {params: {sid: '1220291391', zid: 1836455615}},
      {params: {sid: '1220291391', zid: '1836455615'}},
      {params: {sid: '1220291391', zid: '1836455615A'}},
    ];

    OK_VALUE.forEach(value => {
      it(`should determine OK bid for ${JSON.stringify(value)}`, () => {
        expect(spec.isBidRequestValid(value)).to.be.true;
      });
    });
  });

  describe('Bidfloor support:', () => {
    it('should get bidfloor from getFloor method', () => {
      const { bidRequest, validBR, bidderRequest } = createRequestMock({});
      bidRequest.params.bidOverride = {cur: 'AUD'};
      bidRequest.getFloor = (floorObj) => {
        return {
          floor: bidRequest.floors.values[floorObj.mediaType + '|300x250'],
          currency: floorObj.currency,
          mediaType: floorObj.mediaType
        }
      };
      bidRequest.floors = {
        currency: 'AUD',
        values: {
          'banner|300x250': 1.111
        }
      };
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      expect(data.cur).to.deep.equal(['AUD']);
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(1.111);
    });
  });

  describe('Schain support:', () => {
    it('should send schains', function () {
      const { bidRequest, validBR, bidderRequest } = createRequestMock({});
      const globalSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'adtarget-partner.com',
          sid: '1234567890',
          rid: bidRequest.bidId,
          hp: 1
        }]
      };
      bidRequest.ortb2 = { source: { ext: { schain: globalSchain } } };
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      const schain = data.source.schain;
      expect(schain.nodes.length).to.equal(1);
      expect(schain).to.equal(globalSchain);
    });
  });

  describe('Check Site obj support (ortb2):', () => {
    const BAD_ORTB2_TYPES = [ null, [], 123, 'invalidID', true, false, undefined ];
    BAD_ORTB2_TYPES.forEach(key => {
      it(`should remove bad site data: ${JSON.stringify(key)}`, () => {
        const ortb2 = { site: key }
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.site[key]).to.be.undefined;
      });
    });

    const OK_SITE_STR = ['id', 'name', 'domain', 'page', 'ref', 'keywords'];
    const OK_SITE_ARR = ['cat', 'sectioncat', 'pagecat'];

    OK_SITE_STR.forEach(key => {
      it(`should allow supported site keys to be added bid request: ${JSON.stringify(key)}`, () => {
        const ortb2 = {
          site: {
            [key]: 'some value here'
          }
        };
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.site[key]).to.exist;
        expect(data.site[key]).to.be.a('string');
        expect(data.site[key]).to.be.equal(ortb2.site[key]);
      });
    });

    OK_SITE_ARR.forEach(key => {
      it(`should determine valid keys of the ortb2 site and append to the bid request: ${JSON.stringify(key)}`, () => {
        const ortb2 = {
          site: {
            [key]: ['some value here']
          }
        };
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.site[key]).to.exist;
        expect(data.site[key]).to.be.a('array');
        expect(data.site[key]).to.be.equal(ortb2.site[key]);
      });
    });

    const OK_CONTENT_STR = ['id', 'title', 'language'];
    OK_CONTENT_STR.forEach(key => {
      it(`should determine that the ortb2.site String key is ok and append to the bid request: ${JSON.stringify(key)}`, () => {
        const ortb2 = {
          site: {
            content: {
              [key]: 'some value here'
            }
          }
        };
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.site.content[key]).to.exist;
        expect(data.site.content[key]).to.be.a('string');
        expect(data.site.content[key]).to.be.equal(ortb2.site.content[key]);
      });
    });

    const OK_CONTENT_ARR = ['cat'];
    OK_CONTENT_ARR.forEach(key => {
      it(`should determine that the ortb2.site key is ok and append to the bid request: ${JSON.stringify(key)}`, () => {
        const ortb2 = {
          site: {
            content: {
              [key]: ['some value here', 'something-else']
            }
          }
        };
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.site.content[key]).to.be.a('array');
        expect(data.site.content[key]).to.be.equal(ortb2.site.content[key]);
      });
    });
  });

  describe('Check ortb2 user support:', () => {
    const BAD_ORTB2_TYPES = [ null, [], 'unsupportedKeyName', true, false, undefined ];
    BAD_ORTB2_TYPES.forEach(key => {
      it(`should not allow bad site types to be added to bid request: ${JSON.stringify(key)}`, () => {
        const ortb2 = { user: key }
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.user[key]).to.be.undefined;
      });
    });

    const OK_USER_STR = ['id', 'buyeruid', 'gender', 'keywords', 'customdata'];
    OK_USER_STR.forEach(key => {
      it(`should allow valid keys of the user to be added to bid request: ${JSON.stringify(key)}`, () => {
        const ortb2 = {
          user: {
            [key]: 'some value here'
          }
        };
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.user[key]).to.exist;
        expect(data.user[key]).to.be.a('string');
        expect(data.user[key]).to.be.equal(ortb2.user[key]);
      });
    });

    const OK_USER_OBJECTS = ['ext'];
    OK_USER_OBJECTS.forEach(key => {
      it(`should allow user ext to be added to the bid request: ${JSON.stringify(key)}`, () => {
        const ortb2 = {
          user: {
            [key]: {a: '123', b: '456'}
          }
        };
        const { validBR, bidderRequest } = createRequestMock({ortb2});
        const data = spec.buildRequests(validBR, bidderRequest)[0].data;
        expect(data.user[key]).to.exist;
        expect(data.user[key]).to.be.a('object');
        expect(data.user[key].a).to.be.equal('123');
        expect(data.user[key].b).to.be.equal('456');
        config.setConfig({ortb2: {}});
      });
    });

    it(`should allow adUnit.ortb2Imp.ext.data object to be added to the bid request`, () => {
      const { validBR, bidderRequest } = createRequestMock({})
      validBR[0].ortb2Imp = {
        ext: {
          data: {
            pbadslot: 'homepage-top-rect',
            adUnitSpecificAttribute: '123'
          }
        }
      };
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      expect(data.imp[0].ext.data).to.deep.equal(validBR[0].ortb2Imp.ext.data);
    });
    it(`should allow adUnit.ortb2Imp.instl numeric boolean "1" to be added to the bid request`, () => {
      const { validBR, bidderRequest } = createRequestMock({})
      validBR[0].ortb2Imp = {
        instl: 1
      };
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.deep.equal(validBR[0].ortb2Imp.instl);
    });

    it(`should prevent adUnit.ortb2Imp.instl boolean "true" to be added to the bid request`, () => {
      const { validBR, bidderRequest } = createRequestMock({})
      validBR[0].ortb2Imp = {
        instl: true
      };
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.not.exist;
    });

    it(`should prevent adUnit.ortb2Imp.instl boolean false to be added to the bid request`, () => {
      const { validBR, bidderRequest } = createRequestMock({})
      validBR[0].ortb2Imp = {
        instl: false
      };
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.not.exist;
    });
  });

  describe('GDPR:', () => {
    it('should return request objects that do not send cookies if purpose 1 consent is not provided', () => {
      const { validBR, bidderRequest } = createRequestMock({});
      bidderRequest.gdprConsent = {
        consentString: 'BOtmiBKO234234tmiBKABABAEN234AFAAAAACeAAA',
        apiVersion: 2,
        vendorData: {
          purpose: {
            consents: {
              '1': false
            }
          }
        },
        gdprApplies: true
      };
      const opt = spec.buildRequests(validBR, bidderRequest)[0].options;
      expect(opt.withCredentials).to.be.false;
    });
  });

  describe('Endpoint & Impression request mode:', () => {
    it('should route request to config override endpoint', () => {
      const { validBR, bidderRequest } = createRequestMock({});
      const sid = validBR[0].params.sid;
      const testOverrideEndpoint = 'http://partner-adserv-domain.com/ssp?s=';
      config.setConfig({
        adtrgtme: {
          endpoint: testOverrideEndpoint
        }
      });
      const response = spec.buildRequests(validBR, bidderRequest)[0];
      expect(response).to.deep.include(
        {
          method: 'POST',
          url: testOverrideEndpoint + sid
        });
    });

    it('should route request to endpoint + sid', () => {
      config.setConfig({
        adtrgtme: {}
      });
      const { validBR, bidderRequest } = createRequestMock({});
      const sid = validBR[0].params.sid;
      const response = spec.buildRequests(validBR, bidderRequest);
      expect(response[0]).to.deep.include({
        method: 'POST',
        url: 'https://z.cdn.adtarget.market/ssp?prebid&s=' + sid
      });
    });

    it('should return a single request object for single request mode', () => {
      let { bidRequest, validBR, bidderRequest } = createRequestMock({});
      const { bidRequest: mock } = createRequestMock({bidId: '6heos7ks8z0j', zid: '98876543210', adUnitCode: 'bidder-code'});
      validBR = [bidRequest, mock];
      bidderRequest.bids = validBR;

      config.setConfig({
        adtrgtme: {
          singleRequestMode: true
        }
      });

      const data = spec.buildRequests(validBR, bidderRequest).data;

      expect(data.imp).to.be.an('array').with.lengthOf(2);

      expect(data.imp[0]).to.deep.include({
        id: '84ab500420319d',
        ext: {
          dfp_ad_unit_code: '/1220291391/banner'
        }
      });

      expect(data.imp[1]).to.deep.include({
        id: '6heos7ks8z0j',
        tagid: '98876543210',
        ext: {
          dfp_ad_unit_code: 'bidder-code'
        }
      });
    });
  });

  describe('validate request filtering:', () => {
    it('should return undefined when no bids', function () {
      const request = spec.buildRequests([]);
      expect(request).to.be.undefined;
    });

    it('buildRequests should return correct amount of objects', () => {
      const { validBR, bidderRequest } = createRequestMock({});
      const response = spec.buildRequests(validBR, bidderRequest).bidderRequest;
      expect(response.bids).to.be.an('array').to.have.lengthOf(1);
    });
  });

  describe('Validate request headers:', () => {
    it('should return request objects with the custom headers and content type', () => {
      const { validBR, bidderRequest } = createRequestMock({});
      bidderRequest.gdprConsent.gdprApplies = false;
      const opt = spec.buildRequests(validBR, bidderRequest).options;
      expect(opt).to.deep.equal(
        {
          contentType: 'application/json',
          withCredentials: true
        });
    });
  });

  describe('Request data oRTB bid validation:', () => {
    it('should create valid oRTB bid request object in the data field', () => {
      const { validBR, bidderRequest } = createRequestMock({});
      const data = spec.buildRequests(validBR, bidderRequest).data;
      expect(data.site).to.deep.include({
        id: bidderRequest.bids[0].params.sid,
        page: bidderRequest.refererInfo.page
      });

      expect(data.device).to.deep.equal({
        dnt: 0,
        ua: navigator.userAgent,
        ip: undefined
      });

      expect(data.regs).to.deep.equal({
        'us_privacy': '',
        gdpr: 1
      });

      expect(data.cur).to.deep.equal(['USD']);
    });

    it('should create valid oRTB imp.ext in the bid request', () => {
      const { validBR, bidderRequest } = createRequestMock({});
      const data = spec.buildRequests(validBR, bidderRequest).data;
      expect(data.imp[0].ext).to.deep.equal({
        dfp_ad_unit_code: '/1220291391/banner'
      });
    });

    it('should use siteId value as site.id', () => {
      const { validBR, bidderRequest } = createRequestMock({pubIdMode: true});
      validBR[0].params.sid = '9876543210';
      const data = spec.buildRequests(validBR, bidderRequest).data;
      expect(data.site.id).to.equal('9876543210');
    });

    it('should use placementId value as imp.tagid when using "zid"', () => {
      const { validBR, bidderRequest } = createRequestMock({});
      const TEST_ZID = '54321';
      validBR[0].params.zid = TEST_ZID;
      const data = spec.buildRequests(validBR, bidderRequest).data;
      expect(data.imp[0].tagid).to.deep.equal(TEST_ZID);
    });
  });

  describe('Request oRTB bid.imp validation:', () => {
    it('should create valid default Banner imp', () => {
      config.setConfig({
        adtrgtme: {}
      });
      const { validBR, bidderRequest } = createRequestMock({});
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      expect(data.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}]
      });
    });

    it('should create valid Banner imp', () => {
      config.setConfig({
        adtrgtme: { mode: 'banner' }
      });
      const { validBR, bidderRequest } = createRequestMock({});
      const data = spec.buildRequests(validBR, bidderRequest)[0].data;
      expect(data.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}]
      });
    });
  });

  describe('interpretResponse()', () => {
    describe('for mediaTypes: "banner"', () => {
      it('should insert banner object into response[0].ad', () => {
        const { sR, bidderRequest } = createResponseMock('banner');
        const response = spec.interpretResponse(sR, {bidderRequest});
        expect(response[0].ad).to.equal(`<script>(new Image()).src="${DEFAULT_PIXEL_URL}"</script>
      <img src="${DEFAULT_BANNER_URL}" />`);
        expect(response[0].mediaType).to.equal('banner');
      })
    });

    describe('Support adomains', () => {
      it('should append bid-response adomain to meta.advertiserDomains', () => {
        const { sR, bidderRequest } = createResponseMock('banner');
        const response = spec.interpretResponse(sR, {bidderRequest});
        expect(response[0].meta.advertiserDomains).to.be.a('array');
        expect(response[0].meta.advertiserDomains[0]).to.equal('some-advertiser-domain.com');
      })
    });

    describe('Check response Ad ID / Creative ID', () => {
      it('should use adId if it exists in the bid-response', () => {
        const { sR, bidderRequest } = createResponseMock('banner');
        const adId = 'bid-response-adId';
        sR.body.seatbid[0].bid[0].adId = adId;
        const response = spec.interpretResponse(sR, {bidderRequest});
        expect(response[0].adId).to.equal(adId);
      });

      it('should use impid if adId does not exist in the bid-response', () => {
        const { sR, bidderRequest } = createResponseMock('banner');
        const impid = 'y7v7iu0uljj94rbjcw9';
        sR.body.seatbid[0].bid[0].impid = impid;
        const response = spec.interpretResponse(sR, {bidderRequest});
        expect(response[0].adId).to.equal(impid);
      });

      it('should use crid if adId & impid do not exist in the bid-response', () => {
        const { sR, bidderRequest } = createResponseMock('banner');
        const crid = 'passback-12579';
        sR.body.seatbid[0].bid[0].impid = undefined;
        sR.body.seatbid[0].bid[0].crid = crid;
        const response = spec.interpretResponse(sR, {bidderRequest});
        expect(response[0].adId).to.equal(crid);
      });
    });

    describe('Time To Live (ttl)', () => {
      const BAD_TTL_FORMATS = ['string', [1, 2, 3], true, false, null, undefined];
      BAD_TTL_FORMATS.forEach(key => {
        it('should not allow unsupported global adtrgtme.ttl formats and default to 300', () => {
          const { sR, bidderRequest } = createResponseMock('banner');
          config.setConfig({
            adtrgtme: { ttl: key }
          });
          const response = spec.interpretResponse(sR, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });

        it('should not set unsupported ttl formats and check default to 300', () => {
          const { sR, bidderRequest } = createResponseMock('banner');
          bidderRequest.bids[0].params.ttl = key;
          const response = spec.interpretResponse(sR, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });
      });

      const BAD_TTL_VALUES = [-1, 12345];
      BAD_TTL_VALUES.forEach(key => {
        it('should not set bad global adtrgtme.ttl and check default to 300', () => {
          const { sR, bidderRequest } = createResponseMock('banner');
          config.setConfig({
            adtrgtme: { ttl: key }
          });
          const response = spec.interpretResponse(sR, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });

        it('should not set bad keys.ttl values', () => {
          const { sR, bidderRequest } = createResponseMock('banner');
          bidderRequest.bids[0].params.ttl = key;
          const response = spec.interpretResponse(sR, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });
      });

      it('should set gloabl ttl over params.ttl if it presents', () => {
        const { sR, bidderRequest } = createResponseMock('banner');
        config.setConfig({
          adtrgtme: { ttl: 500 }
        });
        bidderRequest.bids[0].params.ttl = 400;
        const response = spec.interpretResponse(sR, {bidderRequest});
        expect(response[0].ttl).to.equal(500);
      });
    });

    describe('Alias support', () => {
      it('should return undefined as the bidder code value', () => {
        const { sR, bidderRequest } = createResponseMock('banner');
        const response = spec.interpretResponse(sR, {bidderRequest});
        expect(response[0].bidderCode).to.be.undefined;
      });
    });
  });
});
