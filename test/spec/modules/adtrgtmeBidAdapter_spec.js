import { expect } from 'chai';
import { config } from 'src/config.js';
import { BANNER } from 'src/mediaTypes.js';
import { spec } from 'modules/adtrgtmeBidAdapter.js';

const DEFAULT_SID = '1220291391';
const DEFAULT_ZID = '1836455615';
const DEFAULT_BID_ID = '84ab500420319d';
const DEFAULT_PIXEL_URL = 'https://cdn.adtarget.me/libs/1x1.gif';
const DEFAULT_BANNER_URL = 'https://cdn.adtarget.me/libs/banner/300x250.jpg';
const DEFAULT_AD_UNIT_CODE = '/1220291391/header-banner';
const DEFAULT_AD_UNIT_TYPE = BANNER;
const DEFAULT_PARAMS_BID_OVERRIDE = {};

const ADAPTER_VERSION = '1.0.2';
const PREBID_VERSION = '$prebid.version$';

// Utility functions
const createBidRequest = ({bidId, adUnitCode, bidOverrideObject, zid, ortb2}) => {
  const bidRequest = {
    auctionId: 'f3c594t-3o0ch1b0rm-ayn93c3o0ch1b0rm',
    adUnitCode,
    bidId,
    bidderRequestsCount: 1,
    bidder: 'adtrgtme',
    bidderRequestId: 'dn8sskid7t546q',
    bidderWinsCount: 0,
    mediaTypes: {},
    params: {
      bidOverride: bidOverrideObject
    },
    src: 'client',
    transactionId: '5b17b67d-7704-4732-8cc9-5b1723e9bcf9',
    ortb2
  };

  const bannerObj = {
    sizes: [[300, 250]]
  };

  bidRequest.mediaTypes.banner = bannerObj;
  bidRequest.sizes = [[300, 250]];

  bidRequest.params.sid = DEFAULT_SID;
  if (typeof zid == 'string') {
    bidRequest.params.zid = zid;
  }

  return bidRequest;
}

let createBidderRequest = (bidRequestArray, adUnitCode, ortb2 = {}) => {
  const bidderRequest = {
    adUnitCode: adUnitCode || 'default-adUnitCode',
    auctionId: 'd4c83a3b-18e4-4208-b98b-63848449c7aa',
    auctionStart: new Date().getTime(),
    bidderCode: 'adtrgtme',
    bidderRequestId: '112f1c7c5d399a',
    bids: bidRequestArray,
    refererInfo: {
      page: 'https://site.com',
      reachedTop: true,
      isAmp: false,
      numIframes: 0,
      stack: ['https://site.com'],
    },
    gdprConsent: {
      consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
      vendorData: {},
      gdprApplies: true
    },
    start: new Date().getTime(),
    timeout: 1000,
    ortb2
  };

  return bidderRequest;
};

const createBuildRequestMock = ({bidId, adUnitCode, adUnitType, zid, bidOverrideObject, pubIdMode, ortb2}) => {
  const bidRequestConfig = {
    bidId: bidId || DEFAULT_BID_ID,
    adUnitCode: adUnitCode || DEFAULT_AD_UNIT_CODE,
    adUnitType: adUnitType || DEFAULT_AD_UNIT_TYPE,
    zid: zid || DEFAULT_ZID,
    bidOverrideObject: bidOverrideObject || DEFAULT_PARAMS_BID_OVERRIDE,

    pubIdMode: pubIdMode || false,
    ortb2: ortb2 || {}
  };
  const bidRequest = createBidRequest(bidRequestConfig);
  const validBidRequests = [bidRequest];
  const bidderRequest = createBidderRequest(validBidRequests, adUnitCode, ortb2);

  return { bidRequest, validBidRequests, bidderRequest }
};

const createAdm = (type) => {
  let ADM;
  switch (type) {
    case 'banner':
      ADM = `<script>(new Image()).src="${DEFAULT_PIXEL_URL}"</script>
      <img src="${DEFAULT_BANNER_URL}" />`; // banner
      break;
    default: '<span>Ad is here</span>'; break;
  };
  return ADM;
};

const createResponseMock = (type) => {
  const bidResponse = {
    id: '5qtvluj7bk6jhzmqwu4zzulv',
    impid: 'y7v7iu0uljj94rbjcw9',
    adm: createAdm(type),
    price: 1,
    w: 300,
    h: 250,
    crid: 'creativeid',
    adomain: ['some-advertiser-domain.com']
  };

  const serverResponse = {
    body: {
      id: '5qtvluj7bk6jhzmqwu4zzulv',
      seatbid: [{ bid: [ bidResponse ], seat: 12345 }]
    }
  };
  const { validBidRequests, bidderRequest } = createBuildRequestMock({adUnitType: type});
  const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;

  return {serverResponse, data, bidderRequest};
}

// Unit tests
describe('adtrgtme Bid Adapter:', () => {
  it('PLACEHOLDER TO PASS GULP', () => {
    const obj = {};
    expect(obj).to.be.an('object');
  });

  describe('Validate basic properties', () => {
    it('should define the correct bidder code', () => {
      expect(spec.code).to.equal('adtrgtme')
    });
  });

  describe('getUserSyncs()', () => {
    const INVALID_SYNC_URL = 'cdn.adtarget.me/libs/1x1.gif?image&rnd=5fr55r';
    const IMAGE_SYNC_URL = `${DEFAULT_PIXEL_URL}?image&rnd=5fr55r`;
    const IFRAME_SYNC_ONE_URL = `${DEFAULT_PIXEL_URL}?iframe1&rnd=5fr55r`;
    const IFRAME_SYNC_TWO_URL = `${DEFAULT_PIXEL_URL}?iframe2&rnd=5fr55r`;

    let serverResponses = [];
    beforeEach(() => {
      serverResponses[0] = {
        body: {
          ext: {
            pixels: [
              ['image', INVALID_SYNC_URL],
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
      serverResponses = undefined;
    });

    it('sync check invalid url and type in pixels', () => {
      let syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      let pixels = spec.getUserSyncs(syncOptions, serverResponses);
      expect(pixels.length).to.equal(3);
    });

    it('sync check for iframe only', () => {
      let syncOptions = {
        iframeEnabled: true,
        pixelEnabled: false
      };
      let pixels = spec.getUserSyncs(syncOptions, serverResponses);
      expect(pixels.length).to.equal(2);
      expect(pixels).to.deep.equal(
        [
          {type: 'iframe', 'url': IFRAME_SYNC_ONE_URL},
          {type: 'iframe', 'url': IFRAME_SYNC_TWO_URL}
        ]
      )
    });

    it('sync check for image only', () => {
      let syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true
      };
      let pixels = spec.getUserSyncs(syncOptions, serverResponses);
      expect(pixels.length).to.equal(1);
      expect(pixels).to.deep.equal(
        [
          {type: 'image', 'url': IMAGE_SYNC_URL}
        ]
      )
    });

    it('Sync for iframe and image', () => {
      let syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      let pixels = spec.getUserSyncs(syncOptions, serverResponses);
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

  describe('Validate bid request. isBidRequestValid()', () => {
    const INVALID_INPUT = [
      {},
      {params: {}},
      {params: {sid: 1220291391, zid: '1836455615'}},
      {params: {sid: '1220291391', zid: 'A'}},
      {params: {sid: '', zid: '1836455615'}},
      {params: {sid: '', zid: 'A'}},
      {params: {zid: ''}},
    ];

    INVALID_INPUT.forEach(input => {
      it(`should determine INVALID bid for ${JSON.stringify(input)}`, () => {
        expect(spec.isBidRequestValid(input)).to.be.false;
      });
    });

    const VALID_INPUT = [
      {params: {sid: '1220291391'}},
      {params: {sid: '1220291391', zid: 1836455615}},
      {params: {sid: '1220291391', zid: '1836455615'}},
      {params: {sid: '1220291391', zid: '1836455615A'}},
    ];

    VALID_INPUT.forEach(input => {
      it(`should determine VALID bid for ${JSON.stringify(input)}`, () => {
        expect(spec.isBidRequestValid(input)).to.be.true;
      });
    });
  });

  describe('Bidfloor support:', () => {
    it('should get bidfloor from getFloor method', () => {
      const { bidRequest, validBidRequests, bidderRequest } = createBuildRequestMock({});
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
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.cur).to.deep.equal(['AUD']);
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(1.111);
    });
  });

  describe('Schain module support:', () => {
    it('should send schains', function () {
      const { bidRequest, validBidRequests, bidderRequest } = createBuildRequestMock({});
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
      bidRequest.schain = globalSchain;
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      const schain = data.source.ext.schain;
      expect(schain.nodes.length).to.equal(1);
      expect(schain).to.equal(globalSchain);
    });
  });

  describe('First party data module - "Site" support (ortb2):', () => {
    const INVALID_ORTB2_TYPES = [ null, [], 123, 'invalidID', true, false, undefined ];
    INVALID_ORTB2_TYPES.forEach(param => {
      it(`should remove invalid site: ${JSON.stringify(param)}`, () => {
        const ortb2 = { site: param }
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site[param]).to.be.undefined;
      });
    });

    // Should add valid "site" params
    const VALID_SITE_STRINGS = ['id', 'name', 'domain', 'page', 'ref', 'keywords'];
    const VALID_SITE_ARRAYS = ['cat', 'sectioncat', 'pagecat'];

    VALID_SITE_STRINGS.forEach(param => {
      it(`should allow supported site keys to be added bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            [param]: 'something'
          }
        };
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site[param]).to.exist;
        expect(data.site[param]).to.be.a('string');
        expect(data.site[param]).to.be.equal(ortb2.site[param]);
      });
    });

    VALID_SITE_ARRAYS.forEach(param => {
      it(`should determine that the ortb2.site Array key is valid and append to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            [param]: ['something']
          }
        };
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site[param]).to.exist;
        expect(data.site[param]).to.be.a('array');
        expect(data.site[param]).to.be.equal(ortb2.site[param]);
      });
    });

    // Should not allow invalid "site.content" data types
    INVALID_ORTB2_TYPES.forEach(param => {
      it(`should determine that the ortb2.site.content key is invalid and should not be added to bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            content: param
          }
        };
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site.content).to.be.undefined;
      });
    });

    // Should not allow invalid "site.content" keys
    it(`should not allow invalid ortb2.site.content object keys to be added to bid-request: {custom object}`, () => {
      const ortb2 = {
        site: {
          content: {
            fake: 'news',
            unreal: 'param',
            counterfit: 'data'
          }
        }
      };
      const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.site.content).to.be.a('object');
    });

    // Should append valid "site.content" keys
    const VALID_CONTENT_STRINGS = ['id', 'title', 'language'];
    VALID_CONTENT_STRINGS.forEach(param => {
      it(`should determine that the ortb2.site String key is valid and append to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            content: {
              [param]: 'something'
            }
          }
        };
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site.content[param]).to.exist;
        expect(data.site.content[param]).to.be.a('string');
        expect(data.site.content[param]).to.be.equal(ortb2.site.content[param]);
      });
    });

    const VALID_CONTENT_ARRAYS = ['cat'];
    VALID_CONTENT_ARRAYS.forEach(param => {
      it(`should determine that the ortb2.site Array key is valid and append to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            content: {
              [param]: ['something', 'something-else']
            }
          }
        };
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site.content[param]).to.be.a('array');
        expect(data.site.content[param]).to.be.equal(ortb2.site.content[param]);
      });
    });
  });

  describe('First party data module - "User" support (ortb2):', () => {
    // Global ortb2.user validations
    // Should not allow invalid "user" data types
    const INVALID_ORTB2_TYPES = [ null, [], 'unsupportedKeyName', true, false, undefined ];
    INVALID_ORTB2_TYPES.forEach(param => {
      it(`should not allow invalid site types to be added to bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = { user: param }
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user[param]).to.be.undefined;
      });
    });

    // Should add valid "user" params
    const VALID_USER_STRINGS = ['id', 'buyeruid', 'gender', 'keywords', 'customdata'];
    VALID_USER_STRINGS.forEach(param => {
      it(`should allow supported user string keys to be added bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            [param]: 'something'
          }
        };
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user[param]).to.exist;
        expect(data.user[param]).to.be.a('string');
        expect(data.user[param]).to.be.equal(ortb2.user[param]);
      });
    });

    const VALID_USER_OBJECTS = ['ext'];
    VALID_USER_OBJECTS.forEach(param => {
      it(`should allow supported user extObject keys to be added to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            [param]: {a: '123', b: '456'}
          }
        };
        const { validBidRequests, bidderRequest } = createBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user[param]).to.exist;
        expect(data.user[param]).to.be.a('object');
        expect(data.user[param]).to.be.deep.include({[param]: {a: '123', b: '456'}});
        config.setConfig({ortb2: {}});
      });
    });

    // adUnit.ortb2Imp.ext.data
    it(`should allow adUnit.ortb2Imp.ext.data object to be added to the bid-request`, () => {
      let { validBidRequests, bidderRequest } = createBuildRequestMock({})
      validBidRequests[0].ortb2Imp = {
        ext: {
          data: {
            pbadslot: 'homepage-top-rect',
            adUnitSpecificAttribute: '123'
          }
        }
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].ext.data).to.deep.equal(validBidRequests[0].ortb2Imp.ext.data);
    });
    // adUnit.ortb2Imp.instl
    it(`should allow adUnit.ortb2Imp.instl numeric boolean "1" to be added to the bid-request`, () => {
      let { validBidRequests, bidderRequest } = createBuildRequestMock({})
      validBidRequests[0].ortb2Imp = {
        instl: 1
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.deep.equal(validBidRequests[0].ortb2Imp.instl);
    });

    it(`should prevent adUnit.ortb2Imp.instl boolean "true" to be added to the bid-request`, () => {
      let { validBidRequests, bidderRequest } = createBuildRequestMock({})
      validBidRequests[0].ortb2Imp = {
        instl: true
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.not.exist;
    });

    it(`should prevent adUnit.ortb2Imp.instl boolean "false" to be added to the bid-request`, () => {
      let { validBidRequests, bidderRequest } = createBuildRequestMock({})
      validBidRequests[0].ortb2Imp = {
        instl: false
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.not.exist;
    });
  });

  describe('GDPR & Consent:', () => {
    it('should return request objects that do not send cookies if purpose 1 consent is not provided', () => {
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      bidderRequest.gdprConsent = {
        consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
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
      const options = spec.buildRequests(validBidRequests, bidderRequest)[0].options;
      expect(options.withCredentials).to.be.false;
    });
  });

  describe('Endpoint & Impression Request Mode:', () => {
    it('should route request to config override endpoint', () => {
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      const sid = validBidRequests[0].params.sid;
      const testOverrideEndpoint = 'http://new_bidder_host.com/ssp?s=';
      config.setConfig({
        adtrgtme: {
          endpoint: testOverrideEndpoint
        }
      });
      const response = spec.buildRequests(validBidRequests, bidderRequest)[0];
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
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      const sid = validBidRequests[0].params.sid;
      const response = spec.buildRequests(validBidRequests, bidderRequest);
      expect(response[0]).to.deep.include({
        method: 'POST',
        url: 'https://z.cdn.adtarget.market/ssp?prebid&s=' + sid
      });
    });

    it('should return a single request object for single request mode', () => {
      let { bidRequest, validBidRequests, bidderRequest } = createBuildRequestMock({});
      const BID_ID_2 = '6heos7ks8z0j';
      const BID_ZID_2 = '98876543210';
      const AD_UNIT_CODE_2 = 'ad-unit';
      const { bidRequest: bidRequest2 } = createBuildRequestMock({bidId: BID_ID_2, zid: BID_ZID_2, adUnitCode: AD_UNIT_CODE_2});
      validBidRequests = [bidRequest, bidRequest2];
      bidderRequest.bids = validBidRequests;

      config.setConfig({
        adtrgtme: {
          singleRequestMode: true
        }
      });

      const data = spec.buildRequests(validBidRequests, bidderRequest).data;

      expect(data.imp).to.be.an('array').with.lengthOf(2);

      expect(data.imp[0]).to.deep.include({
        id: DEFAULT_BID_ID,
        ext: {
          dfp_ad_unit_code: DEFAULT_AD_UNIT_CODE
        }
      });

      expect(data.imp[1]).to.deep.include({
        id: BID_ID_2,
        tagid: BID_ZID_2,
        ext: {
          dfp_ad_unit_code: AD_UNIT_CODE_2
        }
      });
    });
  });

  describe('Validate request filtering:', () => {
    it('should not return request when no bids are present', function () {
      let request = spec.buildRequests([]);
      expect(request).to.be.undefined;
    });

    it('buildRequests(): should return an array with the correct amount of request objects', () => {
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      const response = spec.buildRequests(validBidRequests, bidderRequest).bidderRequest;
      expect(response.bids).to.be.an('array').to.have.lengthOf(1);
    });
  });

  describe('Request Headers validation:', () => {
    it('should return request objects with the relevant custom headers and content type declaration', () => {
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      bidderRequest.gdprConsent.gdprApplies = false;
      const options = spec.buildRequests(validBidRequests, bidderRequest).options;
      expect(options).to.deep.equal(
        {
          contentType: 'application/json',
          customHeaders: {
            'x-openrtb-version': '2.5'
          },
          withCredentials: true
        });
    });
  });

  describe('Request data oRTB bid validation:', () => {
    it('should create a valid openRTB bid-request object in the data field', () => {
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
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
        ext: {
          'us_privacy': '',
          gdpr: 1
        }
      });

      expect(data.source).to.deep.equal({
        ext: {
          hb: 1,
          adapterver: ADAPTER_VERSION,
          prebidver: PREBID_VERSION,
        },
        fd: 1
      });

      expect(data.cur).to.deep.equal(['USD']);
    });

    it('should create a valid openRTB imp.ext object in the bid-request', () => {
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      const bid = validBidRequests[0];
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.imp[0].ext).to.deep.equal({
        dfp_ad_unit_code: DEFAULT_AD_UNIT_CODE
      });
    });

    it('should use siteId value as site.id in the outbound bid-request when using "pubId" integration mode', () => {
      let { validBidRequests, bidderRequest } = createBuildRequestMock({pubIdMode: true});
      validBidRequests[0].params.sid = '9876543210';
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.site.id).to.equal('9876543210');
    });

    it('should use placementId value as imp.tagid in the outbound bid-request when using "zid"', () => {
      let { validBidRequests, bidderRequest } = createBuildRequestMock({}),
        TEST_ZID = '54321';
      validBidRequests[0].params.zid = TEST_ZID;
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.imp[0].tagid).to.deep.equal(TEST_ZID);
    });
  });

  describe('Request Payload oRTB bid.imp validation:', () => {
    // Validate Banner imp imp when adtrgtme.mode=undefined
    it('should create a valid "Banner" imp object', () => {
      config.setConfig({
        adtrgtme: {}
      });
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}]
      });
    });

    // Validate Banner imp
    it('should create a valid "Banner" imp object', () => {
      config.setConfig({
        adtrgtme: { mode: 'banner' }
      });
      const { validBidRequests, bidderRequest } = createBuildRequestMock({});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}]
      });
    });
  });

  describe('interpretResponse()', () => {
    describe('for mediaTypes: "banner"', () => {
      it('should insert banner payload into response[0].ad', () => {
        const { serverResponse, bidderRequest } = createResponseMock('banner');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ad).to.equal(`<script>(new Image()).src="${DEFAULT_PIXEL_URL}"</script>
      <img src="${DEFAULT_BANNER_URL}" />`);
        expect(response[0].mediaType).to.equal('banner');
      })
    });

    describe('Support adomains', () => {
      it('should append bid-response adomain to meta.advertiserDomains', () => {
        const { serverResponse, bidderRequest } = createResponseMock('banner');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].meta.advertiserDomains).to.be.a('array');
        expect(response[0].meta.advertiserDomains[0]).to.equal('some-advertiser-domain.com');
      })
    });

    describe('bid response Ad ID / Creative ID', () => {
      it('should use adId if it exists in the bid-response', () => {
        const { serverResponse, bidderRequest } = createResponseMock('banner');
        const adId = 'bid-response-adId';
        serverResponse.body.seatbid[0].bid[0].adId = adId;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].adId).to.equal(adId);
      });

      it('should use impid if adId does not exist in the bid-response', () => {
        const { serverResponse, bidderRequest } = createResponseMock('banner');
        const impid = 'y7v7iu0uljj94rbjcw9';
        serverResponse.body.seatbid[0].bid[0].impid = impid;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].adId).to.equal(impid);
      });

      it('should use crid if adId & impid do not exist in the bid-response', () => {
        const { serverResponse, bidderRequest } = createResponseMock('banner');
        const crid = 'passback-12579';
        serverResponse.body.seatbid[0].bid[0].impid = undefined;
        serverResponse.body.seatbid[0].bid[0].crid = crid;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].adId).to.equal(crid);
      });
    });

    describe('Time To Live (ttl)', () => {
      const INVALID_TTL_FORMATS = ['string', [1, 2, 3], true, false, null, undefined];
      INVALID_TTL_FORMATS.forEach(param => {
        it('should not allow unsupported global adtrgtme.ttl formats and default to 300', () => {
          const { serverResponse, bidderRequest } = createResponseMock('banner');
          config.setConfig({
            adtrgtme: { ttl: param }
          });
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });

        it('should not allow unsupported params.ttl formats and default to 300', () => {
          const { serverResponse, bidderRequest } = createResponseMock('banner');
          bidderRequest.bids[0].params.ttl = param;
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });
      });

      const INVALID_TTL_VALUES = [-1, 12345];
      INVALID_TTL_VALUES.forEach(param => {
        it('should not allow invalid global adtrgtme.ttl values 3600 < ttl < 0 and default to 300', () => {
          const { serverResponse, bidderRequest } = createResponseMock('banner');
          config.setConfig({
            adtrgtme: { ttl: param }
          });
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });

        it('should not allow invalid params.ttl values 3600 < ttl < 0 and default to 300', () => {
          const { serverResponse, bidderRequest } = createResponseMock('banner');
          bidderRequest.bids[0].params.ttl = param;
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });
      });

      it('should give presedence to Gloabl ttl over params.ttl ', () => {
        const { serverResponse, bidderRequest } = createResponseMock('banner');
        config.setConfig({
          adtrgtme: { ttl: 500 }
        });
        bidderRequest.bids[0].params.ttl = 400;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ttl).to.equal(500);
      });
    });

    describe('Aliasing support', () => {
      it('should return undefined as the bidder code value', () => {
        const { serverResponse, bidderRequest } = createResponseMock('banner');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].bidderCode).to.be.undefined;
      });
    });
  });
});
