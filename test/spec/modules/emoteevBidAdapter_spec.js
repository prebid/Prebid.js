import {
  assert, expect
} from 'chai';
import {
  ADAPTER_VERSION,
  DOMAIN,
  DOMAIN_DEVELOPMENT,
  DOMAIN_STAGING,
  domain,
  BIDDER_PATH,
  bidderUrl,
  buildRequests,
  conformBidRequest,
  DEFAULT_ENV,
  DEVELOPMENT,
  EVENTS_PATH,
  eventsUrl,
  FOOTER,
  gdprConsent,
  getDeviceDimensions,
  getDeviceInfo,
  getDocumentDimensions,
  getUserSyncs,
  getViewDimensions,
  IN_CONTENT,
  interpretResponse,
  isBidRequestValid,
  ON_ADAPTER_CALLED,
  ON_BID_WON,
  ON_BIDDER_TIMEOUT,
  onBidWon,
  onAdapterCalled,
  onTimeout,
  OVERLAY,
  PRODUCTION,
  requestsPayload,
  resolveDebug,
  resolveEnv,
  spec,
  STAGING,
  USER_SYNC_IFRAME_PATH,
  USER_SYNC_IMAGE_PATH,
  userSyncIframeUrl,
  userSyncImageUrl,
  validateSizes,
  validateContext,
  validateExternalId,
  VENDOR_ID,
  WALLPAPER,
} from 'modules/emoteevBidAdapter';
import * as url from '../../../src/url';
import * as utils from '../../../src/utils';
import {config} from '../../../src/config';

const cannedValidBidRequests = [{
  adUnitCode: '/19968336/header-bid-tag-1',
  auctionId: 'fcbf2b27-a951-496f-b5bb-1324ce7c0558',
  bidId: '2b8de6572e8193',
  bidRequestsCount: 1,
  bidder: 'emoteev',
  bidderRequestId: '1203b39fecc6a5',
  crumbs: {pubcid: 'f3371d16-4e8b-42b5-a770-7e5be1fdf03d'},
  params: {
    adSpaceId: 5084,
    context: IN_CONTENT,
    externalId: 42
  },
  sizes: [[300, 250], [250, 300], [300, 600]],
  transactionId: '58dbd732-7a39-45f1-b23e-1c24051a941c',
}];
const cannedBidderRequest = {
  auctionId: 'fcbf2b27-a951-496f-b5bb-1324ce7c0558',
  auctionStart: 1544200122837,
  bidderCode: 'emoteev',
  bidderRequestId: '1203b39fecc6a5',
  doneCbCallCount: 0,
  refererInfo: {
    canonicalUrl: undefined,
    numIframes: 0,
    reachedTop: true,
    referer: 'http://localhost:9999/integrationExamples/gpt/hello_world_emoteev.html',
    stack: ['http://localhost:9999/integrationExamples/gpt/hello_world_emoteev.html']
  },
  start: 1544200012839,
  timeout: 3000,
  gdprConsent: {
    gdprApplies: true,
    vendorData: {vendorConsents: {[VENDOR_ID]: true}},
  }
};
const serverResponse =
  {
    body: [
      {
        requestId: cannedValidBidRequests[0].bidId,
        cpm: 1,
        width: cannedValidBidRequests[0].sizes[0][0],
        height: cannedValidBidRequests[0].sizes[0][1],
        ad: '<div><script src="https://some.sources"></script></div>',
        ttl: 360,
        creativeId: 123,
        netRevenue: false,
        currency: 'EUR',
      }
    ]
  };

describe('emoteevBidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('should return true when valid', function () {
      const validBid = {
        bidder: 'emoteev',
        bidId: '23a45b4e3',
        params: {
          adSpaceId: 12345,
          context: IN_CONTENT,
          externalId: 42
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      };
      expect(isBidRequestValid(validBid)).to.equal(true);

      expect(spec.isBidRequestValid(validBid)).to.exist.and.to.be.a('boolean');
      expect(spec.isBidRequestValid({})).to.exist.and.to.be.a('boolean');
    });

    it('should return false when required params are invalid', function () {
      expect(isBidRequestValid({
        bidder: '', // invalid bidder
        params: {
          adSpaceId: 12345,
          context: IN_CONTENT,
          externalId: 42
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      })).to.equal(false);
      expect(isBidRequestValid({
        bidder: 'emoteev',
        params: {
          adSpaceId: '', // invalid adSpaceId
          context: IN_CONTENT,
          externalId: 42
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      })).to.equal(false);
      expect(isBidRequestValid({
        bidder: 'emoteev',
        params: {
          adSpaceId: 12345,
          context: 'something', // invalid context
          externalId: 42
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      })).to.equal(false);
      expect(isBidRequestValid({
        bidder: 'emoteev',
        params: {
          adSpaceId: 12345,
          context: IN_CONTENT,
          externalId: 'lol' // invalid externalId
        },
        mediaTypes: {
          banner: {
            sizes: [[750, 200]]
          }
        },
      })).to.equal(false);
      expect(isBidRequestValid({
        bidder: 'emoteev',
        params: {
          adSpaceId: 12345,
          context: IN_CONTENT,
          externalId: 42
        },
        mediaTypes: {
          banner: {
            sizes: [[750]] // invalid size
          }
        },
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const
      env = DEFAULT_ENV,
      debug = true,
      currency = 'EUR',
      request = buildRequests(env, debug, currency, cannedValidBidRequests, cannedBidderRequest);

    expect(request).to.exist.and.have.all.keys(
      'method',
      'url',
      'data',
    );

    expect(request.method).to.equal('POST');
    expect(request.url).to.equal(bidderUrl(env));

    expect(spec.buildRequests(cannedValidBidRequests, cannedBidderRequest)).to.exist.and.to.be.an('object');
  });

  describe('interpretResponse', function () {
    it('bid objects from response', function () {
      const bidResponses = interpretResponse(serverResponse);
      expect(bidResponses).to.be.an('array').that.is.not.empty;
      expect(bidResponses[0]).to.have.property('requestId', cannedValidBidRequests[0].bidId);
      expect(bidResponses[0]).to.have.property('cpm', serverResponse.body[0].cpm);
      expect(bidResponses[0]).to.have.property('width', serverResponse.body[0].width);
      expect(bidResponses[0]).to.have.property('height', serverResponse.body[0].height);
      expect(bidResponses[0]).to.have.property('ad', serverResponse.body[0].ad);
      expect(bidResponses[0]).to.have.property('ttl', serverResponse.body[0].ttl);
      expect(bidResponses[0]).to.have.property('creativeId', serverResponse.body[0].creativeId);
      expect(bidResponses[0]).to.have.property('netRevenue', serverResponse.body[0].netRevenue);
      expect(bidResponses[0]).to.have.property('currency', serverResponse.body[0].currency);
    });
  });

  describe('onAdapterCalled', function () {
    const
      bidRequest = cannedValidBidRequests[0],
      url = onAdapterCalled(DEFAULT_ENV, bidRequest);

    expect(url).to.have.property('protocol');
    expect(url).to.have.property('hostname');
    expect(url).to.have.property('pathname', EVENTS_PATH);
    expect(url).to.have.nested.property('search.eventName', ON_ADAPTER_CALLED);
    expect(url).to.have.nested.property('search.pubcId', bidRequest.crumbs.pubcid);
    expect(url).to.have.nested.property('search.bidId', bidRequest.bidId);
    expect(url).to.have.nested.property('search.adSpaceId', bidRequest.params.adSpaceId);
    expect(url).to.have.nested.property('search.cache_buster');
  });

  describe('onBidWon', function () {
    const
      pubcId = cannedValidBidRequests[0].crumbs.pubcid,
      bidObject = serverResponse.body[0],
      url = onBidWon(DEFAULT_ENV, pubcId, bidObject);

    expect(url).to.have.property('protocol');
    expect(url).to.have.property('hostname');
    expect(url).to.have.property('pathname', EVENTS_PATH);
    expect(url).to.have.nested.property('search.eventName', ON_BID_WON);
    expect(url).to.have.nested.property('search.pubcId', pubcId);
    expect(url).to.have.nested.property('search.bidId', bidObject.requestId);
    expect(url).to.have.nested.property('search.cache_buster');
  });

  describe('onTimeout', function () {
    const
      data = {
        ...cannedValidBidRequests[0],
        timeout: 123,
      },
      url = onTimeout(DEFAULT_ENV, data);

    expect(url).to.have.property('protocol');
    expect(url).to.have.property('hostname');
    expect(url).to.have.property('pathname', EVENTS_PATH);
    expect(url).to.have.nested.property('search.eventName', ON_BIDDER_TIMEOUT);
    expect(url).to.have.nested.property('search.bidId', data.bidId);
    expect(url).to.have.nested.property('search.pubcId', data.crumbs.pubcid);
    expect(url).to.have.nested.property('search.adSpaceId', data.params.adSpaceId);
    expect(url).to.have.nested.property('search.timeout', data.timeout);
    expect(url).to.have.nested.property('search.cache_buster');
  });

  describe('getUserSyncs', function () {
    expect(getUserSyncs(
      DEFAULT_ENV,
      {
        iframeEnabled: false,
        pixelEnabled: false
      })).to.deep.equal([]);
    expect(getUserSyncs(
      PRODUCTION,
      {
        iframeEnabled: false,
        pixelEnabled: true
      })).to.deep.equal([{
      type: 'image',
      url: userSyncImageUrl(PRODUCTION)
    }]);
    expect(getUserSyncs(
      STAGING,
      {
        iframeEnabled: true,
        pixelEnabled: false
      })).to.deep.equal([{
      type: 'iframe',
      url: userSyncIframeUrl(STAGING)
    }]);
    expect(getUserSyncs(
      DEVELOPMENT,
      {
        iframeEnabled: true,
        pixelEnabled: true
      })).to.deep.equal([{
      type: 'image',
      url: userSyncImageUrl(DEVELOPMENT)
    }, {
      type: 'iframe',
      url: userSyncIframeUrl(DEVELOPMENT)
    }]);
  });

  describe('domain', function () {
    expect(domain(null)).to.deep.equal(DOMAIN);
    expect(domain('anything')).to.deep.equal(DOMAIN);
    expect(domain(PRODUCTION)).to.deep.equal(DOMAIN);
    expect(domain(STAGING)).to.deep.equal(DOMAIN_STAGING);
    expect(domain(DEVELOPMENT)).to.deep.equal(DOMAIN_DEVELOPMENT);
  });

  describe('eventsUrl', function () {
    expect(eventsUrl(null)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: EVENTS_PATH
    }));
    expect(eventsUrl('anything')).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: EVENTS_PATH
    }));
    expect(eventsUrl(PRODUCTION)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(PRODUCTION),
      pathname: EVENTS_PATH
    }));
    expect(eventsUrl(STAGING)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(STAGING),
      pathname: EVENTS_PATH
    }));
    expect(eventsUrl(DEVELOPMENT)).to.deep.equal(url.format({
      hostname: domain(DEVELOPMENT),
      pathname: EVENTS_PATH
    }));
  });

  describe('bidderUrl', function () {
    expect(bidderUrl(null)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: BIDDER_PATH
    }));
    expect(bidderUrl('anything')).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: BIDDER_PATH
    }));
    expect(bidderUrl(PRODUCTION)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(PRODUCTION),
      pathname: BIDDER_PATH
    }));
    expect(bidderUrl(STAGING)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(STAGING),
      pathname: BIDDER_PATH
    }));
    expect(bidderUrl(DEVELOPMENT)).to.deep.equal(url.format({
      hostname: domain(DEVELOPMENT),
      pathname: BIDDER_PATH
    }));
  });

  describe('userSyncIframeUrl', function () {
    expect(userSyncIframeUrl(null)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: USER_SYNC_IFRAME_PATH
    }));
    expect(userSyncIframeUrl('anything')).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: USER_SYNC_IFRAME_PATH
    }));
    expect(userSyncIframeUrl(PRODUCTION)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(PRODUCTION),
      pathname: USER_SYNC_IFRAME_PATH
    }));
    expect(userSyncIframeUrl(STAGING)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(STAGING),
      pathname: USER_SYNC_IFRAME_PATH
    }));
    expect(userSyncIframeUrl(DEVELOPMENT)).to.deep.equal(url.format({
      hostname: domain(DEVELOPMENT),
      pathname: USER_SYNC_IFRAME_PATH
    }));
  });

  describe('userSyncImageUrl', function () {
    expect(userSyncImageUrl(null)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: USER_SYNC_IMAGE_PATH
    }));
    expect(userSyncImageUrl('anything')).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(DEFAULT_ENV),
      pathname: USER_SYNC_IMAGE_PATH
    }));
    expect(userSyncImageUrl(PRODUCTION)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(PRODUCTION),
      pathname: USER_SYNC_IMAGE_PATH
    }));
    expect(userSyncImageUrl(STAGING)).to.deep.equal(url.format({
      protocol: 'https',
      hostname: domain(STAGING),
      pathname: USER_SYNC_IMAGE_PATH
    }));
    expect(userSyncImageUrl(DEVELOPMENT)).to.deep.equal(url.format({
      hostname: domain(DEVELOPMENT),
      pathname: USER_SYNC_IMAGE_PATH
    }));
  });

  describe('conformBidRequest', function () {
    expect(conformBidRequest(cannedValidBidRequests[0])).to.deep.equal({
      params: cannedValidBidRequests[0].params,
      crumbs: cannedValidBidRequests[0].crumbs,
      sizes: cannedValidBidRequests[0].sizes,
      bidId: cannedValidBidRequests[0].bidId,
      bidderRequestId: cannedValidBidRequests[0].bidderRequestId,
    });
  });

  describe('gdprConsent', function () {
    describe('gdpr applies, consent given', function () {
      const bidderRequest = {
        ...cannedBidderRequest,
        gdprConsent: {
          gdprApplies: true,
          vendorData: {vendorConsents: {[VENDOR_ID]: true}},
        }
      };
      expect(gdprConsent(bidderRequest)).to.deep.equal(true);
    });
    describe('gdpr applies, consent withdrawn', function () {
      const bidderRequest = {
        ...cannedBidderRequest,
        gdprConsent: {
          gdprApplies: true,
          vendorData: {vendorConsents: {[VENDOR_ID]: false}},
        }
      };
      expect(gdprConsent(bidderRequest)).to.deep.equal(false);
    });
    describe('gdpr applies, consent unknown', function () {
      const bidderRequest = {
        ...cannedBidderRequest,
        gdprConsent: {
          gdprApplies: true,
          vendorData: {},
        }
      };
      expect(gdprConsent(bidderRequest)).to.deep.equal(undefined);
    });
  });

  describe('requestsPayload', function () {
    const
      currency = 'EUR',
      debug = true;

    const payload = requestsPayload(debug, currency, cannedValidBidRequests, cannedBidderRequest);

    expect(payload).to.exist.and.have.all.keys(
      'akPbjsVersion',
      'bidRequests',
      'currency',
      'debug',
      'language',
      'refererInfo',
      'deviceInfo',
      'userAgent',
      'gdprApplies',
      'gdprConsent',
    );

    expect(payload.bidRequests[0]).to.exist.and.have.all.keys(
      'params',
      'crumbs',
      'sizes',
      'bidId',
      'bidderRequestId',
    );

    expect(payload.akPbjsVersion).to.deep.equal(ADAPTER_VERSION);
    expect(payload.bidRequests[0].params).to.deep.equal(cannedValidBidRequests[0].params);
    expect(payload.bidRequests[0].crumbs).to.deep.equal(cannedValidBidRequests[0].crumbs);
    expect(payload.bidRequests[0].mediaTypes).to.deep.equal(cannedValidBidRequests[0].mediaTypes);
    expect(payload.bidRequests[0].bidId).to.deep.equal(cannedValidBidRequests[0].bidId);
    expect(payload.bidRequests[0].bidderRequestId).to.deep.equal(cannedValidBidRequests[0].bidderRequestId);
    expect(payload.currency).to.deep.equal(currency);
    expect(payload.debug).to.deep.equal(debug);
    expect(payload.language).to.deep.equal(navigator.language);
    expect(payload.deviceInfo).to.exist.and.have.all.keys(
      'browserWidth',
      'browserHeight',
      'deviceWidth',
      'deviceHeight',
      'documentWidth',
      'documentHeight',
      'webGL',
    );
    expect(payload.userAgent).to.deep.equal(navigator.userAgent);
    expect(payload.gdprApplies).to.deep.equal(cannedBidderRequest.gdprConsent.gdprApplies);
  });

  describe('getViewDimensions', function () {
    const window = {
      innerWidth: 1024,
      innerHeight: 768
    };
    const documentWithElement = {
      documentElement:
        {
          clientWidth: 512,
          clientHeight: 384
        }
    };
    const documentWithBody = {
      body:
        {
          clientWidth: 512,
          clientHeight: 384
        }
    };
    expect(getViewDimensions(window, documentWithElement)).to.deep.equal({
      width: 1024,
      height: 768
    });
    expect(getViewDimensions(window, documentWithBody)).to.deep.equal({width: 1024, height: 768});
    expect(getViewDimensions(window, documentWithElement)).to.deep.equal({
      width: 1024,
      height: 768
    });
    expect(getViewDimensions(window, documentWithBody)).to.deep.equal({width: 1024, height: 768});
    expect(getViewDimensions({}, documentWithElement)).to.deep.equal({width: 512, height: 384});
    expect(getViewDimensions({}, documentWithBody)).to.deep.equal({width: 512, height: 384});
  });

  describe('getDeviceDimensions', function () {
    const window = {screen: {width: 1024, height: 768}};
    expect(getDeviceDimensions(window)).to.deep.equal({width: 1024, height: 768});
    expect(getDeviceDimensions({})).to.deep.equal({width: '', height: ''});
  });

  describe('getDocumentDimensions', function () {
    expect(getDocumentDimensions({
      documentElement: {
        clientWidth: 1,
        clientHeight: 1,
        offsetWidth: 0,
        offsetHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      },
    })).to.deep.equal({width: 1, height: 1});

    expect(getDocumentDimensions({
      documentElement: {
        clientWidth: 1,
        clientHeight: 1,
        offsetWidth: 0,
        offsetHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      },
      body: {
        scrollHeight: 0,
        offsetHeight: 0,
      }
    })).to.deep.equal({width: 1, height: 1});

    expect(getDocumentDimensions({
      documentElement: {
        clientWidth: 0,
        clientHeight: 0,
        offsetWidth: 1,
        offsetHeight: 1,
        scrollWidth: 0,
        scrollHeight: 0,
      },
      body: {
        scrollHeight: 0,
        offsetHeight: 0,
      }
    })).to.deep.equal({width: 1, height: 1});

    expect(getDocumentDimensions({
      documentElement: {
        clientWidth: 0,
        clientHeight: 0,
        offsetWidth: 0,
        offsetHeight: 0,
        scrollWidth: 1,
        scrollHeight: 1,
      },
      body: {
        scrollHeight: 0,
        offsetHeight: 0,
      }
    })).to.deep.equal({width: 1, height: 1});

    expect(getDocumentDimensions({
      documentElement: {
        clientWidth: undefined,
        clientHeight: undefined,
        offsetWidth: undefined,
        offsetHeight: undefined,
        scrollWidth: undefined,
        scrollHeight: undefined,
      },
      body: {
        scrollHeight: undefined,
        offsetHeight: undefined,
      }
    })).to.deep.equal({width: '', height: ''});
  });

  // describe('isWebGLEnabled', function () {
  //   it('handles no webgl', function () {
  //     const
  //       document = new Document(),
  //       canvas = sinon.createStubInstance(HTMLCanvasElement);
  //     sinon.stub(document, 'createElement').withArgs('canvas').returns(canvas);
  //     canvas.getContext.withArgs('webgl').returns(undefined);
  //     canvas.getContext.withArgs('experimental-webgl').returns(undefined);
  //     expect(isWebGLEnabled(document)).to.equal(false);
  //   });
  //
  //   it('handles webgl exception', function () {
  //     const
  //       document = new Document(),
  //       canvas = sinon.createStubInstance(HTMLCanvasElement);
  //     sinon.stub(document, 'createElement').withArgs('canvas').returns(canvas);
  //     canvas.getContext.withArgs('webgl').throws(DOMException);
  //     expect(isWebGLEnabled(document)).to.equal(false);
  //   });
  //
  //   it('handles experimental webgl', function () {
  //     const
  //       document = new Document(),
  //       canvas = sinon.createStubInstance(HTMLCanvasElement);
  //     sinon.stub(document, 'createElement').withArgs('canvas').returns(canvas);
  //     canvas.getContext.withArgs('webgl').returns(undefined);
  //     canvas.getContext.withArgs('experimental-webgl').returns(true);
  //     expect(isWebGLEnabled(document)).to.equal(true);
  //   });
  //
  //   it('handles experimental webgl exception', function () {
  //     const
  //       document = new Document(),
  //       canvas = sinon.createStubInstance(HTMLCanvasElement);
  //     sinon.stub(document, 'createElement').withArgs('canvas').returns(canvas);
  //     canvas.getContext.withArgs('webgl').returns(undefined);
  //     canvas.getContext.withArgs('experimental-webgl').throws(DOMException);
  //     expect(isWebGLEnabled(document)).to.equal(false);
  //   });
  //
  //   it('handles webgl', function () {
  //     const
  //       document = new Document(),
  //       canvas = sinon.createStubInstance(HTMLCanvasElement);
  //     sinon.stub(document, 'createElement').withArgs('canvas').returns(canvas);
  //     canvas.getContext.withArgs('webgl').returns(true);
  //     expect(isWebGLEnabled(document)).to.equal(true);
  //   });
  // });

  describe('getDeviceInfo', function () {
    expect(getDeviceInfo(
      {width: 1, height: 2},
      {width: 3, height: 4},
      {width: 5, height: 6},
      true
    )).to.deep.equal({
      deviceWidth: 1,
      deviceHeight: 2,
      browserWidth: 3,
      browserHeight: 4,
      documentWidth: 5,
      documentHeight: 6,
      webGL: true
    });
  });

  describe('resolveEnv', function () {
    it('defaults to production', function () {
      expect(resolveEnv({}, null)).to.deep.equal(DEFAULT_ENV);
    });
    expect(resolveEnv({}, PRODUCTION)).to.deep.equal(PRODUCTION);
    expect(resolveEnv({}, STAGING)).to.deep.equal(STAGING);
    expect(resolveEnv({}, DEVELOPMENT)).to.deep.equal(DEVELOPMENT);
    expect(resolveEnv({emoteev: {env: PRODUCTION}}, null)).to.deep.equal(PRODUCTION);
    expect(resolveEnv({emoteev: {env: STAGING}}, null)).to.deep.equal(STAGING);
    expect(resolveEnv({emoteev: {env: DEVELOPMENT}}, null)).to.deep.equal(DEVELOPMENT);
    it('prioritizes parameter over configuration', function () {
      expect(resolveEnv({emoteev: {env: STAGING}}, DEVELOPMENT)).to.deep.equal(DEVELOPMENT);
    });
  });

  describe('resolveDebug', function () {
    it('defaults to production', function () {
      expect(resolveDebug({}, null)).to.deep.equal(false);
    });
    expect(resolveDebug({}, 'false')).to.deep.equal(false);
    expect(resolveDebug({}, 'true')).to.deep.equal(true);
    expect(resolveDebug({debug: true}, null)).to.deep.equal(true);
    it('prioritizes parameter over configuration', function () {
      expect(resolveDebug({debug: true}, 'false')).to.deep.equal(false);
    });
  });

  describe('side effects', function () {
    let triggerPixelSpy;
    let getCookieSpy;
    let getConfigSpy;
    let getParameterByNameSpy;
    beforeEach(function () {
      triggerPixelSpy = sinon.spy(utils, 'triggerPixel');
      getCookieSpy = sinon.spy(utils, 'getCookie');
      getConfigSpy = sinon.spy(config, 'getConfig');
      getParameterByNameSpy = sinon.spy(utils, 'getParameterByName');
    });
    afterEach(function () {
      triggerPixelSpy.restore();
      getCookieSpy.restore();
      getConfigSpy.restore();
      getParameterByNameSpy.restore();
    });

    describe('isBidRequestValid', function () {
      it('has intended side-effects', function () {
        const validBidRequest = {
          bidder: 'emoteev',
          bidId: '23a45b4e3',
          params: {
            adSpaceId: 12345,
          },
          mediaTypes: {
            banner: {
              sizes: [[750, 200]]
            }
          },
        };
        spec.isBidRequestValid(validBidRequest);
        sinon.assert.notCalled(utils.triggerPixel);
        sinon.assert.notCalled(utils.getCookie);
        sinon.assert.notCalled(config.getConfig);
        sinon.assert.notCalled(utils.getParameterByName);
      });
    });
    describe('isBidRequestValid empty request', function() {
      it('has intended side-effects empty request', function () {
        const invalidBidRequest = {};
        spec.isBidRequestValid(invalidBidRequest);
        sinon.assert.notCalled(utils.triggerPixel);
        sinon.assert.notCalled(utils.getCookie);
        sinon.assert.notCalled(config.getConfig);
        sinon.assert.notCalled(utils.getParameterByName);
      });
    });
    describe('buildRequests', function () {
      it('has intended side-effects', function () {
        spec.buildRequests(cannedValidBidRequests, cannedBidderRequest);
        sinon.assert.notCalled(utils.triggerPixel);
        sinon.assert.notCalled(utils.getCookie);
        sinon.assert.callCount(config.getConfig, 3);
        sinon.assert.callCount(utils.getParameterByName, 2);
      });
    });
    describe('interpretResponse', function () {
      it('has intended side-effects', function () {
        spec.interpretResponse(serverResponse);
        sinon.assert.notCalled(utils.triggerPixel);
        sinon.assert.notCalled(utils.getCookie);
        sinon.assert.notCalled(config.getConfig);
        sinon.assert.notCalled(utils.getParameterByName);
      });
    });
    describe('onBidWon', function () {
      it('has intended side-effects', function () {
        const bidObject = serverResponse.body[0];
        spec.onBidWon(bidObject);
        sinon.assert.calledOnce(utils.triggerPixel);
        sinon.assert.calledOnce(utils.getCookie);
        sinon.assert.calledOnce(config.getConfig);
        sinon.assert.calledOnce(utils.getParameterByName);
      });
    });
    describe('onTimeout', function () {
      it('has intended side-effects', function () {
        spec.onTimeout(cannedValidBidRequests[0]);
        sinon.assert.calledOnce(utils.triggerPixel);
        sinon.assert.notCalled(utils.getCookie);
        sinon.assert.calledOnce(config.getConfig);
        sinon.assert.calledOnce(utils.getParameterByName);
      });
    });
    describe('getUserSyncs', function () {
      it('has intended side-effects', function () {
        spec.getUserSyncs({});
        sinon.assert.notCalled(utils.triggerPixel);
        sinon.assert.notCalled(utils.getCookie);
        sinon.assert.calledOnce(config.getConfig);
        sinon.assert.calledOnce(utils.getParameterByName);
      });
    });
  });

  describe('validateSizes', function () {
    it('only accepts valid array of sizes', function () {
      expect(validateSizes([])).to.deep.equal(false);
      expect(validateSizes([[]])).to.deep.equal(false);
      expect(validateSizes([[450, 450], undefined])).to.deep.equal(false);
      expect(validateSizes([[450, 450], 'size'])).to.deep.equal(false);
      expect(validateSizes([[1, 1]])).to.deep.equal(true);
      expect(validateSizes([[1, 1], [450, 450]])).to.deep.equal(true);
    });
  });

  describe('validateContext', function () {
    it('only accepts valid context', function () {
      expect(validateContext(IN_CONTENT)).to.deep.equal(true);
      expect(validateContext(FOOTER)).to.deep.equal(true);
      expect(validateContext(OVERLAY)).to.deep.equal(true);
      expect(validateContext(WALLPAPER)).to.deep.equal(true);
      expect(validateContext(null)).to.deep.equal(false);
      expect(validateContext('anything else')).to.deep.equal(false);
    });
  });

  describe('validateExternalId', function () {
    it('only accepts a positive integer or null', function () {
      expect(validateExternalId(0)).to.deep.equal(false);
      expect(validateExternalId(42)).to.deep.equal(true);
      expect(validateExternalId(42.0)).to.deep.equal(true); // edge case: valid externalId
      expect(validateExternalId(3.14159)).to.deep.equal(false);
      expect(validateExternalId('externalId')).to.deep.equal(false);
      expect(validateExternalId(undefined)).to.deep.equal(true);
      expect(validateExternalId(null)).to.deep.equal(true);
    });
  });
});
