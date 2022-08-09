import { expect } from 'chai';
import { config } from 'src/config.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { spec } from 'modules/yahoosspBidAdapter.js';

const DEFAULT_BID_ID = '84ab500420319d';
const DEFAULT_BID_DCN = '2093845709823475';
const DEFAULT_BID_POS = 'header';
const DEFAULT_PUBID = 'PubId';
const DEFAULT_AD_UNIT_CODE = '/19968336/header-bid-tag-1';
const DEFAULT_AD_UNIT_TYPE = 'banner';
const DEFAULT_PARAMS_BID_OVERRIDE = {};
const DEFAULT_VIDEO_CONTEXT = 'instream';
const ADAPTER_VERSION = '1.0.2';
const PREBID_VERSION = '$prebid.version$';
const INTEGRATION_METHOD = 'prebid.js';

// Utility functions
const generateBidRequest = ({bidId, pos, adUnitCode, adUnitType, bidOverrideObject, videoContext, pubIdMode, ortb2}) => {
  const bidRequest = {
    adUnitCode,
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    bidId,
    bidderRequestsCount: 1,
    bidder: 'yahoossp',
    bidderRequestId: '7101db09af0db2',
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
    sizes: [[300, 250], [300, 600]]
  };

  const videoObject = {
    context: videoContext,
    playerSize: [[300, 250]],
    mimes: ['video/mp4', 'application/javascript'],
    api: [2]
  };

  if (videoContext === 'outstream') {
    bidRequest.renderer = undefined
  };

  if (adUnitType === 'banner' || adUnitType === 'dap-o2' || adUnitType === 'dap-up') {
    bidRequest.mediaTypes.banner = bannerObj;
    bidRequest.sizes = [[300, 250], [300, 600]];
  } else if (adUnitType === 'video') {
    bidRequest.mediaTypes.video = videoObject;
  } else if (adUnitType === 'multi-format') {
    bidRequest.mediaTypes.banner = bannerObj;
    bidRequest.sizes = [[300, 250], [300, 600]];
    bidRequest.mediaTypes.video = videoObject;
  } else if (adUnitType === 'native') {
    bidRequest.mediaTypes.native = {a: 123, b: 456};
  }

  if (pubIdMode === true) {
    bidRequest.params.pubId = DEFAULT_PUBID;
  } else {
    bidRequest.params.dcn = DEFAULT_BID_DCN;
    bidRequest.params.pos = pos || DEFAULT_BID_POS;
  };

  return bidRequest;
}

let generateBidderRequest = (bidRequestArray, adUnitCode, ortb2 = {}) => {
  const bidderRequest = {
    adUnitCode: adUnitCode || 'default-adUnitCode',
    auctionId: 'd4c83a3b-18e4-4208-b98b-63848449c7aa',
    auctionStart: new Date().getTime(),
    bidderCode: 'yahoossp',
    bidderRequestId: '112f1c7c5d399a',
    bids: bidRequestArray,
    refererInfo: {
      page: 'https://publisher-test.com',
      reachedTop: true,
      isAmp: false,
      numIframes: 0,
      stack: ['https://publisher-test.com'],
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

const generateBuildRequestMock = ({bidId, pos, adUnitCode, adUnitType, bidOverrideObject, videoContext, pubIdMode, ortb2}) => {
  const bidRequestConfig = {
    bidId: bidId || DEFAULT_BID_ID,
    pos: pos || DEFAULT_BID_POS,
    adUnitCode: adUnitCode || DEFAULT_AD_UNIT_CODE,
    adUnitType: adUnitType || DEFAULT_AD_UNIT_TYPE,
    bidOverrideObject: bidOverrideObject || DEFAULT_PARAMS_BID_OVERRIDE,
    videoContext: videoContext || DEFAULT_VIDEO_CONTEXT,
    pubIdMode: pubIdMode || false,
    ortb2: ortb2 || {}
  };
  const bidRequest = generateBidRequest(bidRequestConfig);
  const validBidRequests = [bidRequest];
  const bidderRequest = generateBidderRequest(validBidRequests, adUnitCode, ortb2);

  return { bidRequest, validBidRequests, bidderRequest }
};

const generateAdmPayload = (admPayloadType) => {
  let ADM_PAYLOAD;
  switch (admPayloadType) {
    case 'banner':
      ADM_PAYLOAD = '<script>logInfo(\'ad\'); AdPlacement </script>'; // banner
      break;
    case 'video':
      ADM_PAYLOAD = '<VAST></VAST>'; // VAST xml
      break;
    case 'multi-format':
      const admPayloads = [
        '<script>logInfo(\'ad\'); AdPlacement </script>', // banner
        '<VAST></VAST>' // VAST xml
      ]
      const random = Math.floor(Math.random() * admPayloads.length);
      ADM_PAYLOAD = admPayloads[random]
      break;
    case 'dap-o2':
      ADM_PAYLOAD = '<script>o2playerSettings</script>'; // O2 player
      break;
    case 'dap-up':
      ADM_PAYLOAD = '<script>YAHOO.VideoPlatform.VideoPlayer</script>'; // Unified Player
      break;
  };
  return ADM_PAYLOAD;
};

const generateResponseMock = (admPayloadType, vastVersion, videoContext) => {
  const bidResponse = {
    id: 'fc0c35df-21fb-4f93-9ebd-88759dbe31f9',
    impid: '274395c06a24e5',
    adm: generateAdmPayload(admPayloadType),
    price: 1,
    w: 300,
    h: 250,
    crid: 'ssp-placement-name',
    adomain: ['advertiser-domain.com']
  };

  if (vastVersion === 'vast') {
    bidResponse.nurl = 'https://yahoo.com?event=adAttempt';
  };

  const serverResponse = {
    body: {
      id: 'fc0c35df-21fb-4f93-9ebd-88759dbe31f9',
      seatbid: [{ bid: [ bidResponse ], seat: 13107 }]
    }
  };
  const { validBidRequests, bidderRequest } = generateBuildRequestMock({adUnitType: admPayloadType, videoContext: videoContext});
  const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;

  return {serverResponse, data, bidderRequest};
}

// Unit tests
describe('YahooSSP Bid Adapter:', () => {
  it('PLACEHOLDER TO PASS GULP', () => {
    const obj = {};
    expect(obj).to.be.an('object');
  });

  describe('Validate basic properties', () => {
    it('should define the correct bidder code', () => {
      expect(spec.code).to.equal('yahoossp')
    });

    it('should define the correct vendor ID', () => {
      expect(spec.gvlid).to.equal(25)
    });
  });

  describe('getUserSyncs()', () => {
    const IMAGE_PIXEL_URL = 'http://image-pixel.com/foo/bar?1234&baz=true';
    const IFRAME_ONE_URL = 'http://image-iframe.com/foo/bar?1234&baz=true';
    const IFRAME_TWO_URL = 'http://image-iframe-two.com/foo/bar?1234&baz=true';

    let serverResponses = [];
    beforeEach(() => {
      serverResponses[0] = {
        body: {
          ext: {
            pixels: `<script>document.write('<iframe src="${IFRAME_ONE_URL}"></iframe>` +
                    `<img src="${IMAGE_PIXEL_URL}"></iframe>` +
                    `<iframe src="${IFRAME_TWO_URL}"></iframe>');</script>`
          }
        }
      }
    });

    after(() => {
      serverResponses = undefined;
    });

    it('for only iframe enabled syncs', () => {
      let syncOptions = {
        iframeEnabled: true,
        pixelEnabled: false
      };
      let pixelsObjects = spec.getUserSyncs(syncOptions, serverResponses);
      expect(pixelsObjects.length).to.equal(2);
      expect(pixelsObjects).to.deep.equal(
        [
          {type: 'iframe', 'url': IFRAME_ONE_URL},
          {type: 'iframe', 'url': IFRAME_TWO_URL}
        ]
      )
    });

    it('for only pixel enabled syncs', () => {
      let syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true
      };
      let pixelsObjects = spec.getUserSyncs(syncOptions, serverResponses);
      expect(pixelsObjects.length).to.equal(1);
      expect(pixelsObjects).to.deep.equal(
        [
          {type: 'image', 'url': IMAGE_PIXEL_URL}
        ]
      )
    });

    it('for both pixel and iframe enabled syncs', () => {
      let syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true
      };
      let pixelsObjects = spec.getUserSyncs(syncOptions, serverResponses);
      expect(pixelsObjects.length).to.equal(3);
      expect(pixelsObjects).to.deep.equal(
        [
          {type: 'iframe', 'url': IFRAME_ONE_URL},
          {type: 'image', 'url': IMAGE_PIXEL_URL},
          {type: 'iframe', 'url': IFRAME_TWO_URL}
        ]
      )
    });
  });

  // Validate Bid Requests
  describe('isBidRequestValid()', () => {
    const INVALID_INPUT = [
      {},
      {params: {}},
      {params: {dcn: '2c9d2b50015a5aa95b70a9b0b5b10012'}},
      {params: {dcn: 1234, pos: 'header'}},
      {params: {dcn: '2c9d2b50015a5aa95b70a9b0b5b10012', pos: 1234}},
      {params: {dcn: '2c9d2b50015a5aa95b70a9b0b5b10012', pos: ''}},
      {params: {dcn: '', pos: 'header'}},
    ];

    INVALID_INPUT.forEach(input => {
      it(`should determine that the bid is INVALID for the input ${JSON.stringify(input)}`, () => {
        expect(spec.isBidRequestValid(input)).to.be.false;
      });
    });

    it('should determine that the bid is VALID if dcn and pos are present on the params object', () => {
      const validBid = {
        params: {
          dcn: '2c9d2b50015a5aa95b70a9b0b5b10012',
          pos: 'header'
        }
      };
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should mark bid as VALID if bid.params.testing.e2etest = "true" (dcn & pos not required)', () => {
      const validBid = {
        params: {
          dcn: 8888,
          pos: 9999,
          testing: {
            e2etest: true
          }
        }
      };
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });

    it('should mark bid ad VALID if pubId exists instead of dcn & pos', () => {
      const validBid = {
        params: {
          pubId: DEFAULT_PUBID
        }
      };
      expect(spec.isBidRequestValid(validBid)).to.be.true;
    });
  });

  describe('Price Floor module support:', () => {
    it('should get bidfloor from getFloor method', () => {
      const { bidRequest, validBidRequests, bidderRequest } = generateBuildRequestMock({});
      bidRequest.params.bidOverride = {cur: 'EUR'};
      bidRequest.getFloor = (floorObj) => {
        return {
          floor: bidRequest.floors.values[floorObj.mediaType + '|640x480'],
          currency: floorObj.currency,
          mediaType: floorObj.mediaType
        }
      };
      bidRequest.floors = {
        currency: 'EUR',
        values: {
          'banner|640x480': 5.55
        }
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.cur).to.deep.equal(['EUR']);
      expect(data.imp[0].bidfloor).is.a('number');
      expect(data.imp[0].bidfloor).to.equal(5.55);
    });
  });

  describe('Schain module support:', () => {
    it('should send Global or Bidder specific schain', function () {
      const { bidRequest, validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const globalSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'some-platform.com',
          sid: '111111',
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
    // Should not allow invalid "site" data types
    const INVALID_ORTB2_TYPES = [ null, [], 123, 'unsupportedKeyName', true, false, undefined ];
    INVALID_ORTB2_TYPES.forEach(param => {
      it(`should not allow invalid site types to be added to bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = { site: param }
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site[param]).to.be.undefined;
      });
    });

    // Should add valid "site" params
    const VALID_SITE_STRINGS = ['name', 'domain', 'page', 'ref', 'keywords', 'search'];
    const VALID_SITE_ARRAYS = ['cat', 'sectioncat', 'pagecat'];

    VALID_SITE_STRINGS.forEach(param => {
      it(`should allow supported site keys to be added bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            [param]: 'something'
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
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
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site[param]).to.exist;
        expect(data.site[param]).to.be.a('array');
        expect(data.site[param]).to.be.equal(ortb2.site[param]);
      });
    });

    // Should not allow invalid "site.content" data types
    INVALID_ORTB2_TYPES.forEach(param => {
      it(`should determine that the ortb2.site.content key is invalid and should not be added to bid-request:  ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            content: param
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
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
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.site.content).to.be.a('object');
    });

    // Should append valid "site.content" keys
    const VALID_CONTENT_STRINGS = ['id', 'title', 'series', 'season', 'genre', 'contentrating', 'language'];
    VALID_CONTENT_STRINGS.forEach(param => {
      it(`should determine that the ortb2.site String key is valid and append to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            content: {
              [param]: 'something'
            }
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site.content[param]).to.exist;
        expect(data.site.content[param]).to.be.a('string');
        expect(data.site.content[param]).to.be.equal(ortb2.site.content[param]);
      });
    });

    const VALID_CONTENT_NUMBERS = ['episode', 'prodq', 'context', 'livestream', 'len'];
    VALID_CONTENT_NUMBERS.forEach(param => {
      it(`should determine that the ortb2.site.content Number key is valid and append to the bid-request:  ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            content: {
              [param]: 1234
            }
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site.content[param]).to.be.a('number');
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
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site.content[param]).to.be.a('array');
        expect(data.site.content[param]).to.be.equal(ortb2.site.content[param]);
      });
    });

    const VALID_CONTENT_OBJECTS = ['ext'];
    VALID_CONTENT_OBJECTS.forEach(param => {
      it(`should determine that the ortb2.site.content Object key is valid and append to the bid-request:  ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          site: {
            content: {
              [param]: {a: '123', b: '456'}
            }
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.site.content[param]).to.be.a('object');
        expect(data.site.content[param]).to.be.equal(ortb2.site.content[param]);
        config.setConfig({ortb2: {}});
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
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
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
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user[param]).to.exist;
        expect(data.user[param]).to.be.a('string');
        expect(data.user[param]).to.be.equal(ortb2.user[param]);
      });
    });

    const VALID_USER_NUMBERS = ['yob'];
    VALID_USER_NUMBERS.forEach(param => {
      it(`should allow supported user number keys to be added bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            [param]: 1982
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user[param]).to.exist;
        expect(data.user[param]).to.be.a('number');
        expect(data.user[param]).to.be.equal(ortb2.user[param]);
      });
    });

    const VALID_USER_ARRAYS = ['data'];
    VALID_USER_ARRAYS.forEach(param => {
      it(`should allow supported user Array keys to be added to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            [param]: ['something']
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user[param]).to.exist;
        expect(data.user[param]).to.be.a('array');
        expect(data.user[param]).to.be.equal(ortb2.user[param]);
      });
    });

    const VALID_USER_OBJECTS = ['ext'];
    VALID_USER_OBJECTS.forEach(param => {
      it(`should allow supported user extObject keys to be added to the bid-request:  ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            [param]: {a: '123', b: '456'}
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user[param]).to.be.a('object');
        expect(data.user[param]).to.be.deep.include({[param]: {a: '123', b: '456'}});
        config.setConfig({ortb2: {}});
      });
    });

    // Should allow valid user.data && site.content.data
    const VALID_USER_DATA_STRINGS = ['id', 'name'];
    VALID_USER_DATA_STRINGS.forEach(param => {
      it(`should allow supported user.data & site.content.data strings to be added to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            data: [{[param]: 'string'}]
          },
          site: {
            content: {
              data: [{[param]: 'string'}]
            }
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user.data[0][param]).to.exist;
        expect(data.user.data[0][param]).to.be.a('string');
        expect(data.user.data[0][param]).to.be.equal(ortb2.user.data[0][param]);
        expect(data.site.content.data[0][param]).to.exist;
        expect(data.site.content.data[0][param]).to.be.a('string');
        expect(data.site.content.data[0][param]).to.be.equal(ortb2.site.content.data[0][param]);
      });
    });

    const VALID_USER_DATA_ARRAYS = ['segment']
    VALID_USER_DATA_ARRAYS.forEach(param => {
      it(`should allow supported user data arrays to be added to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            data: [{[param]: [{id: 1}]}]
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user.data[0][param]).to.exist;
        expect(data.user.data[0][param]).to.be.a('array');
        expect(data.user.data[0][param]).to.be.equal(ortb2.user.data[0][param]);
      });
    });

    const VALID_USER_DATA_OBJECTS = ['ext'];
    VALID_USER_DATA_OBJECTS.forEach(param => {
      it(`should allow supported user data objects to be added to the bid-request: ${JSON.stringify(param)}`, () => {
        const ortb2 = {
          user: {
            data: [{[param]: {id: 'ext'}}]
          }
        };
        const { validBidRequests, bidderRequest } = generateBuildRequestMock({ortb2});
        const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        expect(data.user.data[0][param]).to.exist;
        expect(data.user.data[0][param]).to.be.a('object');
        expect(data.user.data[0][param]).to.be.equal(ortb2.user.data[0][param]);
        config.setConfig({ortb2: {}});
      });
    });

    // adUnit.ortb2Imp.ext.data
    it(`should allow adUnit.ortb2Imp.ext.data object to be added to the bid-request`, () => {
      let { validBidRequests, bidderRequest } = generateBuildRequestMock({})
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
      let { validBidRequests, bidderRequest } = generateBuildRequestMock({})
      validBidRequests[0].ortb2Imp = {
        instl: 1
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.deep.equal(validBidRequests[0].ortb2Imp.instl);
    });

    it(`should prevent adUnit.ortb2Imp.instl boolean "true" to be added to the bid-request`, () => {
      let { validBidRequests, bidderRequest } = generateBuildRequestMock({})
      validBidRequests[0].ortb2Imp = {
        instl: true
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.not.exist;
    });

    it(`should prevent adUnit.ortb2Imp.instl boolean "false" to be added to the bid-request`, () => {
      let { validBidRequests, bidderRequest } = generateBuildRequestMock({})
      validBidRequests[0].ortb2Imp = {
        instl: false
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].instl).to.not.exist;
    });
  });

  describe('e2etest mode support:', () => {
    it(`should override DCN & POS when params.testing.e2etest = "true".`, () => {
      const { bidRequest, validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const params = {
        dcn: '1234',
        pos: '5678',
        testing: {
          e2etest: true
        }
      }
      bidRequest.params = params;
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.site.id).to.be.equal('8a969516017a7a396ec539d97f540011');
      expect(data.imp[0].tagid).to.be.equal('8a969978017a7aaabab4ab0bc01a0009');
      expect(data.imp[0].ext.e2eTestMode).to.be.true;
    });
  });

  describe('GDPR & Consent:', () => {
    it('should return request objects that do not send cookies if purpose 1 consent is not provided', () => {
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
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
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const testOverrideEndpoint = 'http://foo.bar.baz.com/bidderRequest';
      config.setConfig({
        yahoossp: {
          endpoint: testOverrideEndpoint
        }
      });
      const response = spec.buildRequests(validBidRequests, bidderRequest)[0];
      expect(response).to.deep.include(
        {
          method: 'POST',
          url: testOverrideEndpoint
        });
    });

    it('should route request to /bidRequest endpoint when dcn & pos present', () => {
      config.setConfig({
        yahoossp: {}
      });
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const response = spec.buildRequests(validBidRequests, bidderRequest);
      expect(response[0]).to.deep.include({
        method: 'POST',
        url: 'https://c2shb.pubgw.yahoo.com/bidRequest'
      });
    });

    it('should route request to /partners endpoint when pubId is present', () => {
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({pubIdMode: true});
      const response = spec.buildRequests(validBidRequests, bidderRequest);
      expect(response[0]).to.deep.include({
        method: 'POST',
        url: 'https://c2shb.pubgw.yahoo.com/admax/bid/partners/PBJS'
      });
    });

    it('should return a single request object for single request mode', () => {
      let { bidRequest, validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const BID_ID_2 = '84ab50xxxxx';
      const BID_POS_2 = 'footer';
      const AD_UNIT_CODE_2 = 'test-ad-unit-code-123';
      const { bidRequest: bidRequest2 } = generateBuildRequestMock({bidId: BID_ID_2, pos: BID_POS_2, adUnitCode: AD_UNIT_CODE_2});
      validBidRequests = [bidRequest, bidRequest2];
      bidderRequest.bids = validBidRequests;

      config.setConfig({
        yahoossp: {
          singleRequestMode: true
        }
      });

      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.imp).to.be.an('array').with.lengthOf(2);

      expect(data.imp[0]).to.deep.include({
        id: DEFAULT_BID_ID,
        ext: {
          pos: DEFAULT_BID_POS,
          dfp_ad_unit_code: DEFAULT_AD_UNIT_CODE
        }
      });

      expect(data.imp[1]).to.deep.include({
        id: BID_ID_2,
        ext: {
          pos: BID_POS_2,
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
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const response = spec.buildRequests(validBidRequests, bidderRequest).bidderRequest;
      expect(response.bids).to.be.an('array').to.have.lengthOf(1);
    });
  });

  describe('Request Headers validation:', () => {
    it('should return request objects with the relevant custom headers and content type declaration', () => {
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
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

  describe('Request Payload oRTB bid validation:', () => {
    it('should generate a valid openRTB bid-request object in the data field', () => {
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.site).to.deep.equal({
        id: bidderRequest.bids[0].params.dcn,
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
          integration: {
            name: INTEGRATION_METHOD,
            ver: PREBID_VERSION
          }
        },
        fd: 1
      });

      expect(data.user).to.deep.equal({
        ext: {
          consent: bidderRequest.gdprConsent.consentString,
          eids: []
        }
      });

      expect(data.cur).to.deep.equal(['USD']);
    });

    it('should generate a valid openRTB imp.ext object in the bid-request', () => {
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const bid = validBidRequests[0];
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.imp[0].ext).to.deep.equal({
        pos: bid.params.pos,
        dfp_ad_unit_code: DEFAULT_AD_UNIT_CODE
      });
    });

    it('should use siteId value as site.id in the outbound bid-request when using "pubId" integration mode', () => {
      let { validBidRequests, bidderRequest } = generateBuildRequestMock({pubIdMode: true});
      validBidRequests[0].params.siteId = '1234567';
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.site.id).to.equal('1234567');
    });

    it('should use placementId value as imp.tagid in the outbound bid-request when using "pubId" integration mode', () => {
      let { validBidRequests, bidderRequest } = generateBuildRequestMock({pubIdMode: true});
      validBidRequests[0].params.placementId = 'header-300x250';
      const data = spec.buildRequests(validBidRequests, bidderRequest).data;
      expect(data.imp[0].tagid).to.deep.equal('header-300x250');
    });
  });

  describe('Request Payload oRTB bid.imp validation:', () => {
    // Validate Banner imp imp when yahoossp.mode=undefined
    it('should generate a valid "Banner" imp object', () => {
      config.setConfig({
        yahoossp: {}
      });
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].video).to.not.exist;
      expect(data.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}, {w: 300, h: 600}]
      });
    });

    // Validate Banner imp when yahoossp.mode="banner"
    it('should generate a valid "Banner" imp object', () => {
      config.setConfig({
        yahoossp: { mode: 'banner' }
      });
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].video).to.not.exist;
      expect(data.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}, {w: 300, h: 600}]
      });
    });

    // Validate Video imp
    it('should generate a valid "Video" only imp object', () => {
      config.setConfig({
        yahoossp: { mode: 'video' }
      });
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({adUnitType: 'video'});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].banner).to.not.exist;
      expect(data.imp[0].video).to.deep.equal({
        mimes: ['video/mp4', 'application/javascript'],
        w: 300,
        h: 250,
        api: [2],
        protocols: [2, 5],
        startdelay: 0,
        linearity: 1,
        maxbitrate: undefined,
        maxduration: undefined,
        minduration: undefined,
        delivery: undefined,
        pos: undefined,
        playbackmethod: undefined,
        rewarded: undefined,
        placement: undefined
      });
    });

    // Validate multi-format Video+banner imp
    it('should generate a valid multi-format "Video + Banner" imp object', () => {
      config.setConfig({
        yahoossp: { mode: 'all' }
      });
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({adUnitType: 'multi-format'});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}, {w: 300, h: 600}]
      });
      expect(data.imp[0].video).to.deep.equal({
        mimes: ['video/mp4', 'application/javascript'],
        w: 300,
        h: 250,
        api: [2],
        protocols: [2, 5],
        startdelay: 0,
        linearity: 1,
        maxbitrate: undefined,
        maxduration: undefined,
        minduration: undefined,
        delivery: undefined,
        pos: undefined,
        playbackmethod: undefined,
        rewarded: undefined,
        placement: undefined
      });
    });

    // Validate Key-Value Pairs
    it('should generate supported String, Number, Array of Strings, Array of Numbers key-value pairs and append to imp.ext.kvs', () => {
      let { validBidRequests, bidderRequest } = generateBuildRequestMock({})
      validBidRequests[0].params.kvp = {
        key1: 'String',
        key2: 123456,
        key3: ['String', 'String', 'String'],
        key4: [1, 2, 3],
        invalidKey1: true,
        invalidKey2: null,
        invalidKey3: ['string', 1234],
        invalidKey4: {a: 1, b: 2},
        invalidKey5: undefined
      };
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;

      expect(data.imp[0].ext.kvs).to.deep.equal({
        key1: 'String',
        key2: 123456,
        key3: ['String', 'String', 'String'],
        key4: [1, 2, 3]
      });
    });
  });

  describe('Multiple adUnit validations:', () => {
    // Multiple banner adUnits
    it('should generate multiple bid-requests for each adUnit - 2 banner only', () => {
      config.setConfig({
        yahoossp: { mode: 'banner' }
      });

      const BID_ID_2 = '84ab50xxxxx';
      const BID_POS_2 = 'footer';
      const AD_UNIT_CODE_2 = 'test-ad-unit-code-123';
      const BID_ID_3 = '84ab50yyyyy';
      const BID_POS_3 = 'hero';
      const AD_UNIT_CODE_3 = 'video-ad-unit';

      let { bidRequest, validBidRequests, bidderRequest } = generateBuildRequestMock({}); // banner
      const { bidRequest: bidRequest2 } = generateBuildRequestMock({bidId: BID_ID_2, pos: BID_POS_2, adUnitCode: AD_UNIT_CODE_2}); // banner
      const { bidRequest: bidRequest3 } = generateBuildRequestMock({bidId: BID_ID_3, pos: BID_POS_3, adUnitCode: AD_UNIT_CODE_3, adUnitType: 'video'}); // video (should be filtered)
      validBidRequests = [bidRequest, bidRequest2, bidRequest3];
      bidderRequest.bids = validBidRequests;

      const response = spec.buildRequests(validBidRequests, bidderRequest)
      expect(response).to.be.a('array');
      expect(response.length).to.equal(2);
      response.forEach((obj) => {
        expect(obj.data.imp[0].video).to.not.exist
        expect(obj.data.imp[0].banner).to.deep.equal({
          mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
          format: [{w: 300, h: 250}, {w: 300, h: 600}]
        });
      });
    });

    // Multiple video adUnits
    it('should generate multiple bid-requests for each adUnit - 2 video only', () => {
      config.setConfig({
        yahoossp: { mode: 'video' }
      });
      const BID_ID_2 = '84ab50xxxxx';
      const BID_POS_2 = 'footer';
      const AD_UNIT_CODE_2 = 'test-ad-unit-code-123';
      const BID_ID_3 = '84ab50yyyyy';
      const BID_POS_3 = 'hero';
      const AD_UNIT_CODE_3 = 'video-ad-unit';

      let { bidRequest, validBidRequests, bidderRequest } = generateBuildRequestMock({adUnitType: 'video'}); // video
      const { bidRequest: bidRequest2 } = generateBuildRequestMock({bidId: BID_ID_2, pos: BID_POS_2, adUnitCode: AD_UNIT_CODE_2, adUnitType: 'video'}); // video
      const { bidRequest: bidRequest3 } = generateBuildRequestMock({bidId: BID_ID_3, pos: BID_POS_3, adUnitCode: AD_UNIT_CODE_3}); // banner (should be filtered)
      validBidRequests = [bidRequest, bidRequest2, bidRequest3];
      bidderRequest.bids = validBidRequests;

      const response = spec.buildRequests(validBidRequests, bidderRequest)
      expect(response).to.be.a('array');
      expect(response.length).to.equal(2);
      response.forEach((obj) => {
        expect(obj.data.imp[0].banner).to.not.exist
        expect(obj.data.imp[0].video).to.deep.equal({
          mimes: ['video/mp4', 'application/javascript'],
          w: 300,
          h: 250,
          api: [2],
          protocols: [2, 5],
          startdelay: 0,
          linearity: 1,
          maxbitrate: undefined,
          maxduration: undefined,
          minduration: undefined,
          delivery: undefined,
          pos: undefined,
          playbackmethod: undefined,
          rewarded: undefined,
          placement: undefined
        });
      });
    });
    // Mixed adUnits 1-banner, 1-video, 1-native (should filter out native)
    it('should generate multiple bid-requests for both "video & banner" adUnits', () => {
      config.setConfig({
        yahoossp: { mode: 'all' }
      });
      const BID_ID_2 = '84ab50xxxxx';
      const BID_POS_2 = 'footer';
      const AD_UNIT_CODE_2 = 'video-ad-unit';
      const BID_ID_3 = '84ab50yyyyy';
      const BID_POS_3 = 'hero';
      const AD_UNIT_CODE_3 = 'native-ad-unit';

      let { bidRequest, validBidRequests, bidderRequest } = generateBuildRequestMock({adUnitType: 'banner'}); // banner
      const { bidRequest: bidRequest2 } = generateBuildRequestMock({bidId: BID_ID_2, pos: BID_POS_2, adUnitCode: AD_UNIT_CODE_2, adUnitType: 'video'}); // video
      const { bidRequest: bidRequest3 } = generateBuildRequestMock({bidId: BID_ID_3, pos: BID_POS_3, adUnitCode: AD_UNIT_CODE_3, adUnitType: 'native'}); // native (should be filtered)
      validBidRequests = [bidRequest, bidRequest2, bidRequest3];
      bidderRequest.bids = validBidRequests;

      const response = spec.buildRequests(validBidRequests, bidderRequest);
      expect(response).to.be.a('array');
      expect(response.length).to.equal(2);
      response.forEach((obj) => {
        expect(obj.data.imp[0].native).to.not.exist;
      });

      const data1 = response[0].data;
      expect(data1.imp[0].video).to.not.exist;
      expect(data1.imp[0].banner).to.deep.equal({
        mimes: ['text/html', 'text/javascript', 'application/javascript', 'image/jpg'],
        format: [{w: 300, h: 250}, {w: 300, h: 600}]
      });

      const data2 = response[1].data;
      expect(data2.imp[0].banner).to.not.exist;
      expect(data2.imp[0].video).to.deep.equal({
        mimes: ['video/mp4', 'application/javascript'],
        w: 300,
        h: 250,
        api: [2],
        protocols: [2, 5],
        startdelay: 0,
        linearity: 1,
        maxbitrate: undefined,
        maxduration: undefined,
        minduration: undefined,
        delivery: undefined,
        pos: undefined,
        playbackmethod: undefined,
        rewarded: undefined,
        placement: undefined
      });
    });
  });

  describe('Video params firstlook & bidOverride validations:', () => {
    it('should first look at params.bidOverride for video placement data', () => {
      config.setConfig({
        yahoossp: { mode: 'video' }
      });
      const bidOverride = {
        imp: {
          video: {
            mimes: ['video/mp4'],
            w: 400,
            h: 350,
            api: [1],
            protocols: [1, 3],
            startdelay: 0,
            linearity: 1,
            maxbitrate: 400000,
            maxduration: 3600,
            minduration: 1500,
            delivery: 1,
            pos: 123456,
            playbackmethod: 1,
            rewarded: 1,
            placement: 1
          }
        }
      }
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({adUnitType: 'video', bidOverrideObject: bidOverride});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].video).to.deep.equal(bidOverride.imp.video);
    });

    it('should second look at bid.mediaTypes.video for video placement data', () => {
      config.setConfig({
        yahoossp: { mode: 'video' }
      });
      let { bidRequest, bidderRequest } = generateBuildRequestMock({adUnitType: 'video'});
      bidRequest.mediaTypes.video = {
        mimes: ['video/mp4'],
        playerSize: [400, 350],
        api: [1],
        protocols: [1, 3],
        startdelay: 0,
        linearity: 1,
        maxbitrate: 400000,
        maxduration: 3600,
        minduration: 1500,
        delivery: 1,
        pos: 123456,
        playbackmethod: 1,
        placement: 1
      }
      const validBidRequests = [bidRequest];
      bidderRequest.bids = validBidRequests;
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.imp[0].video).to.deep.equal({
        mimes: ['video/mp4'],
        w: 400,
        h: 350,
        api: [1],
        protocols: [1, 3],
        startdelay: 0,
        linearity: 1,
        maxbitrate: 400000,
        maxduration: 3600,
        minduration: 1500,
        delivery: 1,
        pos: 123456,
        playbackmethod: 1,
        placement: 1,
        rewarded: undefined
      });
    });

    it('should use params.bidOverride.device.ip override', () => {
      config.setConfig({
        yahoossp: { mode: 'all' }
      });
      const bidOverride = {
        device: {
          ip: '1.2.3.4'
        }
      }
      const { validBidRequests, bidderRequest } = generateBuildRequestMock({adUnitType: 'video', bidOverrideObject: bidOverride});
      const data = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
      expect(data.device.ip).to.deep.equal(bidOverride.device.ip);
    });
  });
  // #endregion buildRequests():

  describe('interpretResponse()', () => {
    describe('for mediaTypes: "banner"', () => {
      it('should insert banner payload into response[0].ad', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('banner');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ad).to.equal('<script>logInfo(\'ad\'); AdPlacement </script>');
        expect(response[0].mediaType).to.equal('banner');
      })
    });

    describe('for mediaTypes: "video"', () => {
      it('should insert video VPAID payload into vastXml', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('video');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ad).to.be.undefined;
        expect(response[0].vastXml).to.equal('<VAST></VAST>');
        expect(response[0].mediaType).to.equal('video');
      })

      it('should insert video VAST win notification into vastUrl', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('video', 'vast');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ad).to.be.undefined;
        expect(response[0].vastUrl).to.equal('https://yahoo.com?event=adAttempt');
        expect(response[0].vastXml).to.equal('<VAST></VAST>');
        expect(response[0].mediaType).to.equal('video');
      })

      it('should insert video DAP O2 Player into ad', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('dap-o2', 'vpaid');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ad).to.equal('<script>o2playerSettings</script>');
        expect(response[0].vastUrl).to.be.undefined;
        expect(response[0].vastXml).to.be.undefined;
        expect(response[0].mediaType).to.equal('banner');
      });

      it('should insert video DAP Unified Player into ad', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('dap-up', 'vpaid');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ad).to.equal('<script>YAHOO.VideoPlatform.VideoPlayer</script>');
        expect(response[0].vastUrl).to.be.undefined;
        expect(response[0].vastXml).to.be.undefined;
        expect(response[0].mediaType).to.equal('banner');
      })
    });

    describe('Support Advertiser domains', () => {
      it('should append bid-response adomain to meta.advertiserDomains', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('video', 'vpaid');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].meta.advertiserDomains).to.be.a('array');
        expect(response[0].meta.advertiserDomains[0]).to.equal('advertiser-domain.com');
      })
    });

    describe('bid response Ad ID / Creative ID', () => {
      it('should use adId if it exists in the bid-response', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('banner');
        const adId = 'bid-response-adId';
        serverResponse.body.seatbid[0].bid[0].adId = adId;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].adId).to.equal(adId);
      });

      it('should use impid if adId does not exist in the bid-response', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('banner');
        const impid = '25b6c429c1f52f';
        serverResponse.body.seatbid[0].bid[0].impid = impid;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].adId).to.equal(impid);
      });

      it('should use crid if adId & impid do not exist in the bid-response', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('banner');
        const crid = 'passback-12579';
        serverResponse.body.seatbid[0].bid[0].impid = undefined;
        serverResponse.body.seatbid[0].bid[0].crid = crid;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].adId).to.equal(crid);
      });
    });

    describe('Time To Live (ttl)', () => {
      const UNSUPPORTED_TTL_FORMATS = ['string', [1, 2, 3], true, false, null, undefined];
      UNSUPPORTED_TTL_FORMATS.forEach(param => {
        it('should not allow unsupported global yahoossp.ttl formats and default to 300', () => {
          const { serverResponse, bidderRequest } = generateResponseMock('banner');
          config.setConfig({
            yahoossp: { ttl: param }
          });
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });

        it('should not allow unsupported params.ttl formats and default to 300', () => {
          const { serverResponse, bidderRequest } = generateResponseMock('banner');
          bidderRequest.bids[0].params.ttl = param;
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });
      });

      const UNSUPPORTED_TTL_VALUES = [-1, 3601];
      UNSUPPORTED_TTL_VALUES.forEach(param => {
        it('should not allow invalid global yahoossp.ttl values 3600 < ttl < 0 and default to 300', () => {
          const { serverResponse, bidderRequest } = generateResponseMock('banner');
          config.setConfig({
            yahoossp: { ttl: param }
          });
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });

        it('should not allow invalid params.ttl values 3600 < ttl < 0 and default to 300', () => {
          const { serverResponse, bidderRequest } = generateResponseMock('banner');
          bidderRequest.bids[0].params.ttl = param;
          const response = spec.interpretResponse(serverResponse, {bidderRequest});
          expect(response[0].ttl).to.equal(300);
        });
      });

      it('should give presedence to Gloabl ttl over params.ttl ', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('banner');
        config.setConfig({
          yahoossp: { ttl: 500 }
        });
        bidderRequest.bids[0].params.ttl = 400;
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].ttl).to.equal(500);
      });
    });

    describe('Aliasing support', () => {
      it('should return undefined as the bidder code value', () => {
        const { serverResponse, bidderRequest } = generateResponseMock('banner');
        const response = spec.interpretResponse(serverResponse, {bidderRequest});
        expect(response[0].bidderCode).to.be.undefined;
      });
    });
  });
});
