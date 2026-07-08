import { expect } from 'chai';
import { CONVERTER, spec } from 'modules/improvedigitalBidAdapter.js';
import { config } from 'src/config.js';
import { deepClone, deepSetValue } from 'src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';
// load modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import { decorateAdUnitsWithNativeParams } from '../../../src/native.js';
import { hook } from '../../../src/hook.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';
import * as prebidGlobal from 'src/prebidGlobal.js';

describe('Improve Digital Adapter Tests', function () {
  const METHOD = 'POST';
  const AD_SERVER_BASE_URL = 'https://ad.360yield.com';
  const BASIC_ADS_BASE_URL = 'https://ad.360yield-basic.com';
  const PB_ENDPOINT = 'pb';

  const EXTEND_URL = 'https://pbs.360yield.com/openrtb2/auction';
  const IFRAME_SYNC_URL = 'https://hb.360yield.com/prebid-universal-creative/load-cookie.html';

  const simpleBidRequest = {
    bidder: 'improvedigital',
    params: {
      publisherId: 1234,
      placementId: 1053688
    },
    adUnitCode: 'div-gpt-ad-1499748733608-0',
    transactionId: 'f183e871-fbed-45f0-a427-c8a63c4c01eb',
    bidId: '33e9500b21129f',
    bidderRequestId: '2772c1e566670b',
    auctionId: '192721e36a0239',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [160, 600]]
      }
    },
    sizes: [[300, 250], [160, 600]]
  };

  const extendBidRequest = deepClone(simpleBidRequest);
  extendBidRequest.params.extend = true;

  const videoParams = {
    skip: 1,
    skipmin: 5,
    skipafter: 30
  };

  const instreamBidRequest = {
    bidder: 'improvedigital',
    params: {
      publisherId: 1234,
      placementId: 123456
    },
    adUnitCode: 'video1',
    transactionId: 'vf183e871-fbed-45f0-a427-c8a63c4c01eb',
    bidId: '33e9500b21129f',
    bidderRequestId: 'v2772c1e566670b',
    auctionId: 'v192721e36a0239',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480]
      }
    }
  };

  const outstreamBidRequest = deepClone(instreamBidRequest);
  outstreamBidRequest.mediaTypes = {
    video: {
      context: 'outstream',
      playerSize: [640, 480]
    }
  };

  const nativeBidRequest = deepClone(simpleBidRequest);
  nativeBidRequest.mediaTypes = { native: {} };
  nativeBidRequest.nativeParams = {
    title: { required: true },
    body: { required: true }
  };

  const multiFormatBidRequest = deepClone(simpleBidRequest);
  multiFormatBidRequest.mediaTypes = {
    banner: {
      sizes: [[300, 250], [160, 600]]
    },
    native: {},
    video: {
      context: 'outstream',
      playerSize: [640, 480]
    }
  };

  multiFormatBidRequest.nativeParams = {
    body: {
      required: true
    }
  };

  const bidderRequest = {
    ortb2: {
      source: {
        tid: 'mock-tid'
      }
    },
    bids: [simpleBidRequest],
  };

  const instreamBidderRequest = {
    bids: [instreamBidRequest],
  };

  const outstreamBidderRequest = {
    bids: [outstreamBidRequest],
  };

  const multiFormatBidderRequest = {
    bids: [multiFormatBidRequest],
  };

  const nativeBidderRequest = {
    bids: [nativeBidRequest],
  };

  const gdprConsent = {
    apiVersion: 2,
    consentString: 'CONSENT',
    vendorData: { purpose: { consents: { 1: true } } },
    gdprApplies: true,
    addtlConsent: '1~1.35.41.101',
  };

  const bidderRequestGdpr = {
    bids: [simpleBidRequest],
    gdprConsent
  };

  const bidderRequestReferrer = {
    bids: [simpleBidRequest],
    refererInfo: {
      page: 'https://blah.com/test.html',
      domain: 'blah.com'
    },
  };

  function updateNativeParams(bidRequests) {
    bidRequests = deepClone(bidRequests);
    decorateAdUnitsWithNativeParams(bidRequests);
    return bidRequests;
  }

  function formatPublisherUrl(baseUrl, publisherId) {
    return `${baseUrl}/${publisherId}/${PB_ENDPOINT}`;
  }

  before(() => {
    hook.ready();
  });

  describe('isBidRequestValid', function () {
    it('should return false when no bid', function () {
      expect(spec.isBidRequestValid()).to.equal(false);
    });

    it('should return false when no bid.params', function () {
      const bid = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when only one of placementId or publisherId is present', function () {
      let bid = {
        params: {
          publisherId: 1234
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid = {
        params: {
          placementId: 1234
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when both placementId and publisherId are passed', function () {
      expect(spec.isBidRequestValid(simpleBidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let getConfigStub = null;
    let getGlobalStub = null;

    afterEach(function () {
      if (getConfigStub) {
        getConfigStub.restore();
        getConfigStub = null;
      }

      if (getGlobalStub) {
        getGlobalStub.restore();
        getGlobalStub = null;
      }
    });

    it('should make a well-formed request objects', async function () {
      const request = spec.buildRequests([simpleBidRequest], await addFPDToBidderRequest(bidderRequest))[0];
      expect(request).to.be.an('object');
      expect(request.method).to.equal(METHOD);
      expect(request.options).to.be.an('object');
      expect(request.options.endpointCompression).to.equal(true);
      expect(request.url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1234));

      const payload = JSON.parse(request.data);
      expect(payload).to.be.an('object');
      expect(payload.id).to.be.a('string');
      expect(payload.tmax).not.to.exist;
      expect(payload.regs).to.not.exist;
      expect(payload.schain).to.not.exist;
      sinon.assert.match(payload.source, { tid: 'mock-tid' });
      expect(payload.device).to.be.an('object');
      expect(payload.user).to.not.exist;
      sinon.assert.match(payload.imp, [
        sinon.match({
          id: '33e9500b21129f',
          secure: 1,
          ext: {
            bidder: {
              placementId: 1053688,
            }
          },
          banner: {
            format: [
              { w: 300, h: 250 },
              { w: 160, h: 600 },
            ]
          }
        })
      ]);
    });

    it('should make a well-formed request object for multi-format ad unit', function () {
      const request = spec.buildRequests(updateNativeParams([multiFormatBidRequest]), multiFormatBidderRequest)[0];
      expect(request).to.be.an('object');
      expect(request.method).to.equal(METHOD);
      expect(request.options).to.be.an('object');
      expect(request.options.endpointCompression).to.equal(true);
      expect(request.url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1234));

      const payload = JSON.parse(request.data);
      expect(payload).to.be.an('object');
      sinon.assert.match(payload.imp, [
        sinon.match({
          id: '33e9500b21129f',
          secure: 1,
          ext: {
            bidder: {
              placementId: 1053688,
            }
          },
          ...(FEATURES.VIDEO && {
            video: {
              w: 640,
              h: 480,
              mimes: ['video/mp4'],
            }
          }),
          banner: {
            format: [
              { w: 300, h: 250 },
              { w: 160, h: 600 },
            ]
          }
        })
      ]);
      if (FEATURES.NATIVE) {
        sinon.assert.match(payload.imp[0], {
          native: {
            ver: '1.2'
          },
        });
        const nativeReq = JSON.parse(payload.imp[0].native.request);
        sinon.assert.match(nativeReq, {
          eventtrackers: [
            { event: 1, methods: [1, 2] },
          ],
          'assets': [
            sinon.match({ 'required': 1, 'data': { 'type': 2 } })
          ]
        });
      }
    });

    if (FEATURES.NATIVE) {
      it('should make a well-formed native request', function () {
        const payload = JSON.parse(spec.buildRequests(updateNativeParams([nativeBidRequest]), {})[0].data);
        const nativeReq = JSON.parse(payload.imp[0].native.request);
        sinon.assert.match(nativeReq, {
          eventtrackers: [
            { event: 1, methods: [1, 2] },
          ],
          assets: [
            sinon.match({ required: 1, title: { len: 140 } }),
            sinon.match({ required: 1, data: { type: 2 } })
          ]
        });
      });

      it('should not make native request when nativeOrtbRequest is undefined', function () {
        const requests = updateNativeParams([nativeBidRequest]);
        delete requests[0].nativeOrtbRequest;
        const payload = JSON.parse(spec.buildRequests(requests, {})[0].data);
        expect(payload.imp[0].native).to.not.exist;
      });

      it('should not make native request when no assets', function () {
        const requests = updateNativeParams([{ ...nativeBidRequest, nativeParams: {} }]);
        const payload = JSON.parse(spec.buildRequests(requests, {})[0].data);
        expect(payload.imp[0].native).to.not.exist;
      });
    }

    it('should add keyValues', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const keyValues = {
        testKey: [
          'testValue'
        ]
      };
      bidRequest.params.keyValues = keyValues;
      const payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].ext.bidder.keyValues).to.deep.equal(keyValues);
    });

    it('should add currency', function () {
      config.setConfig({ currency: { adServerCurrency: 'JPY' } });
      try {
        const bidRequest = Object.assign({}, simpleBidRequest);
        const payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
        expect(payload.cur).to.deep.equal(['JPY']);
      } finally {
        config.resetConfig();
      }
    });

    it('should add bid floor correctly', function () {
      getGlobalStub = sinon.stub(prebidGlobal, 'getGlobal').returns({
        convertCurrency: (cpm, from, to) => {
          const conversionKeys = { 'EUR-USD': 1.75 };
          const conversionRate = conversionKeys[`${from}-${to}`];
          if (!conversionRate) {
            throw new Error(`No conversion rate found for ${from}-${to}`);
          }
          return cpm * conversionRate;
        }
      });
      const bidRequest = deepClone(simpleBidRequest);

      // Floor price currency shouldn't be populated without a floor price
      let payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloorcur).to.not.exist;

      // Default floor price currency
      bidRequest.params.bidFloor = 0.05;
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloor).to.equal(0.05);
      expect(payload.imp[0].bidfloorcur).to.equal('USD');

      // Floor price sent as is when currency cannot be converted to default bid adapter currency
      bidRequest.params.bidFloorCur = 'UAH';
      bidRequest.params.bidFloor = 0.05;
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloor).to.equal(0.05);
      expect(payload.imp[0].bidfloorcur).to.equal('UAH');

      // Floor price currency converted to default bid adapter currency
      bidRequest.params.bidFloorCur = 'eUR';
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloor).to.equal(0.08750000000000001);
      expect(payload.imp[0].bidfloorcur).to.equal('USD');

      // getFloor defined -> use it over bidFloor
      const getFloorResponse = { currency: 'USD', floor: 3 };
      bidRequest.getFloor = () => getFloorResponse;
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloor).to.equal(3);
      expect(payload.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should add GDPR consent string', async function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const payload = JSON.parse(spec.buildRequests([bidRequest], await addFPDToBidderRequest(bidderRequestGdpr))[0].data);
      expect(payload.regs.ext.gdpr).to.exist.and.to.equal(1);
      expect(payload.user.ext.consent).to.equal('CONSENT');
      expect(payload.user.ext.ConsentedProvidersSettings.consented_providers).to.exist.and.to.deep.equal('1~1.35.41.101');
    });

    it('should not add consented providers when empty', async function () {
      const bidderRequestGdprEmptyAddtl = deepClone(bidderRequestGdpr);
      bidderRequestGdprEmptyAddtl.gdprConsent.addtlConsent = '1~';
      const bidRequest = Object.assign({}, simpleBidRequest);
      const payload = JSON.parse(spec.buildRequests([bidRequest], await addFPDToBidderRequest(bidderRequestGdprEmptyAddtl))[0].data);
      expect(payload.user.ext.consented_providers_settings).to.not.exist;
    });

    it('should add ConsentedProvidersSettings when extend mode enabled', async function () {
      const bidRequest = deepClone(extendBidRequest);
      const payload = JSON.parse(spec.buildRequests([bidRequest], await addFPDToBidderRequest(bidderRequestGdpr))[0].data);
      expect(payload.regs.ext.gdpr).to.exist.and.to.equal(1);
      expect(payload.user.ext.consent).to.equal('CONSENT');
      expect(payload.user.ext.ConsentedProvidersSettings.consented_providers).to.exist.and.to.equal('1~1.35.41.101');
      expect(payload.user.ext.consented_providers_settings).to.not.exist;
    });

    it('should add CCPA consent string', async function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const request = spec.buildRequests([bidRequest], await addFPDToBidderRequest({ ...bidderRequest, ...{ uspConsent: '1YYY' } }));
      const payload = JSON.parse(request[0].data);
      expect(payload.regs.ext.us_privacy).to.equal('1YYY');
    });

    it('should add COPPA flag', async function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('coppa').returns(true);
      let bidRequest = Object.assign({}, simpleBidRequest);
      let payload = JSON.parse(spec.buildRequests([bidRequest], await addFPDToBidderRequest(bidderRequestGdpr))[0].data);
      expect(payload.regs.coppa).to.equal(1);
      getConfigStub.withArgs('coppa').returns(false);
      bidRequest = Object.assign({}, simpleBidRequest);
      payload = JSON.parse(spec.buildRequests([bidRequest], await addFPDToBidderRequest(bidderRequestGdpr))[0].data);
      expect(payload.regs.coppa).to.equal(0);
    });

    it('should add referrer', async function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const request = spec.buildRequests([bidRequest], await addFPDToBidderRequest(bidderRequestReferrer))[0];
      const payload = JSON.parse(request.data);
      expect(payload.site.page).to.equal('https://blah.com/test.html');
    });

    it('should add timeout', function () {
      const bidderRequestTimeout = deepClone(bidderRequest);
      // Int
      bidderRequestTimeout.timeout = 300;
      const bidRequest = Object.assign({}, simpleBidRequest);
      let request = spec.buildRequests([bidRequest], bidderRequestTimeout)[0];
      expect(JSON.parse(request.data).tmax).to.equal(300);

      // String
      bidderRequestTimeout.timeout = '500';
      request = spec.buildRequests([bidRequest], bidderRequestTimeout)[0];
      expect(JSON.parse(request.data).tmax).to.equal(500);
    });

    it('should not add video params for banner', function () {
      const bidRequest = deepClone(simpleBidRequest);
      bidRequest.params.video = videoParams;
      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video).to.not.exist;
    });

    if (FEATURES.VIDEO) {
      it('should set video params for instream', function() {
        const bidRequest = deepClone(instreamBidRequest);
        delete bidRequest.mediaTypes.video.playerSize;
        const videoParams = {
          mimes: ['video/mp4'],
          skip: 1,
          skipmin: 5,
          skipafter: 30,
          minduration: 15,
          maxduration: 60,
          startdelay: 5,
          minbitrate: 500,
          maxbitrate: 2000,
          w: 1024,
          h: 640
        };
        bidRequest.params.video = videoParams;
        const request = spec.buildRequests([bidRequest], bidderRequest)[0];
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].video).to.deep.include(videoParams);
      });

      it('should set video playerSize over video params', () => {
        const bidRequest = deepClone(instreamBidRequest);
        bidRequest.params.video = {
          w: 1024, h: 640
        };
        const request = spec.buildRequests([bidRequest], bidderRequest)[0];
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].video.h).equal(480);
        expect(payload.imp[0].video.w).equal(640);
      });

      it('should ignore invalid/unexpected video params', function() {
        const bidRequest = deepClone(instreamBidRequest);
        // 1
        const videoTest = {
          skip: 1,
          skipmin: 5,
          skipafter: 30
        };
        const videoTestInvParam = Object.assign({}, videoTest);
        videoTestInvParam.blah = 1;
        bidRequest.params.video = videoTestInvParam;
        const request = spec.buildRequests([bidRequest], {})[0];
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].video.blah).not.to.exist;
      });

      it('should set video params for outstream', function() {
        const bidRequest = deepClone(outstreamBidRequest);
        bidRequest.params.video = videoParams;
        const request = spec.buildRequests([bidRequest], {})[0];
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].video).to.deep.equal({
          ...{
            mimes: ['video/mp4'],
            w: bidRequest.mediaTypes.video.playerSize[0],
            h: bidRequest.mediaTypes.video.playerSize[1],
          },
          ...videoParams
        });
      });
      //
      it('should set video params for multi-format', function() {
        const bidRequest = deepClone(multiFormatBidRequest);
        bidRequest.params.video = videoParams;
        const request = spec.buildRequests([bidRequest], {})[0];
        const payload = JSON.parse(request.data);
        const testVideoParams = Object.assign({
          w: 640,
          h: 480,
          mimes: ['video/mp4'],
        }, videoParams);
        expect(payload.imp[0].video).to.deep.equal(testVideoParams);
      });
    }

    it('should add schain', function () {
      const schain = '{"ver":"1.0","complete":1,"nodes":[{"asi":"headerlift.com","sid":"xyz","hp":1}]}';
      const bidRequest = Object.assign({}, simpleBidRequest);

      // Add schain to both locations in the bid
      bidRequest.ortb2 = {
        source: {
          ext: { schain: schain }
        }
      };

      // Add schain to bidderRequest as well
      const modifiedBidderRequest = {
        ...bidderRequestReferrer,
        ortb2: {
          source: {
            ext: { schain: schain }
          }
        }
      };

      const request = spec.buildRequests([bidRequest], modifiedBidderRequest)[0];
      const payload = JSON.parse(request.data);
      expect(payload.source.ext.schain).to.equal(schain);
    });

    it('should add eids', function () {
      const eids = [
        {
          source: 'id5-sync.com',
          uids: [{
            atype: 1,
            id: '1111'
          }]
        }
      ];
      const expectedUserObject = {
        ext: {
          eids: [{
            source: 'id5-sync.com',
            uids: [{
              atype: 1,
              id: '1111'
            }]
          }]
        }
      };
      const request = spec.buildRequests([simpleBidRequest], {
        ...bidderRequestReferrer,
        ortb2: { user: { ext: { eids: eids } } }
      })[0];
      const payload = JSON.parse(request.data);
      expect(payload.user).to.deep.equal(expectedUserObject);
    });

    it('should return 2 requests', function () {
      const requests = spec.buildRequests([
        simpleBidRequest,
        instreamBidRequest
      ], bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(2);
    });

    it('should return one request in a single request mode', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.singleRequest').returns(true);
      const requests = spec.buildRequests([simpleBidRequest, instreamBidRequest], bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1234));
      const request = JSON.parse(requests[0].data);
      expect(request.imp.length).to.equal(2);
      expect(request.imp[0].banner).to.exist;
      if (FEATURES.VIDEO) { expect(request.imp[1].video).to.exist; }
    });

    it('should create one request per endpoint in a single request mode', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.singleRequest').returns(true);
      const requests = spec.buildRequests([extendBidRequest, simpleBidRequest, instreamBidRequest], bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(2);
      expect(requests[0].url).to.equal(EXTEND_URL);
      expect(requests[1].url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1234));
      const adServerRequest = JSON.parse(requests[1].data);
      expect(adServerRequest.imp.length).to.equal(2);
      expect(adServerRequest.imp[0].banner).to.exist;
      if (FEATURES.VIDEO) { expect(adServerRequest.imp[1].video).to.exist; }
    });

    it('should set Prebid sizes in bid request', function () {
      const request = spec.buildRequests([simpleBidRequest], bidderRequest)[0];
      const payload = JSON.parse(request.data);
      sinon.assert.match(payload.imp[0].banner, {
        format: [
          { w: 300, h: 250 },
          { w: 160, h: 600 }
        ]
      });
    });

    it('should not add single size filter when using Prebid sizes', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const size = {
        w: 800,
        h: 600
      };
      bidRequest.params.size = size;
      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      const payload = JSON.parse(request.data);
      sinon.assert.match(payload.imp[0].banner, {
        format: [
          { w: 300, h: 250 },
          { w: 160, h: 600 }
        ]
      });
    });

    it('should not set site when app is defined in FPD', function () {
      const ortb2 = { app: { content: 'XYZ' } };
      const request = spec.buildRequests([simpleBidRequest], { ...bidderRequest, ortb2 })[0];
      const payload = JSON.parse(request.data);
      expect(payload.site).does.not.exist;
      expect(payload.app).does.exist;
      expect(payload.app.content).does.exist.and.equal('XYZ');
    });

    it('should set correct site params', async function () {
      let request = spec.buildRequests([simpleBidRequest], await addFPDToBidderRequest(bidderRequestReferrer))[0];
      let payload = JSON.parse(request.data);
      expect(payload.site.content).does.not.exist;
      expect(payload.site.page).does.exist.and.equal('https://blah.com/test.html');
      expect(payload.site.domain).does.exist.and.equal('blah.com');

      const ortb2 = { site: { content: 'ZZZ' } };
      request = spec.buildRequests([simpleBidRequest], await addFPDToBidderRequest({ ...bidderRequestReferrer, ortb2 }))[0];
      payload = JSON.parse(request.data);
      expect(payload.site.content).does.exist.and.equal('ZZZ');
      expect(payload.site.page).does.exist.and.equal('https://blah.com/test.html');
      expect(payload.site.domain).does.exist.and.equal('blah.com');
    });

    it('should call basic ads endpoint when no consent for purpose 1', function () {
      const consent = deepClone(gdprConsent);
      deepSetValue(consent, 'vendorData.purpose.consents.1', false);
      const bidderRequestWithConsent = deepClone(bidderRequest);
      bidderRequestWithConsent.gdprConsent = consent;
      const request = spec.buildRequests([simpleBidRequest], bidderRequestWithConsent)[0];
      expect(request.url).to.equal(formatPublisherUrl(BASIC_ADS_BASE_URL, 1234));
    });

    it('should set extend params when extend mode enabled from global configuration', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      const bannerRequest = deepClone(simpleBidRequest);
      const keyValues = { testKey: ['testValue'] };
      bannerRequest.params.keyValues = keyValues;

      getConfigStub.withArgs('improvedigital.extend').returns(true);
      const requests = spec.buildRequests([bannerRequest, instreamBidRequest], bidderRequest);
      expect(requests[0].method).to.equal(METHOD);
      expect(requests[0].url).to.equal(EXTEND_URL);
      expect(requests[1].url).to.equal(EXTEND_URL);
      // banner
      let payload = JSON.parse(requests[0].data);
      expect(payload.imp[0].ext.bidder).to.not.exist;
      expect(payload.imp[0].ext.prebid.bidder.improvedigital).to.deep.equal({
        placementId: 1053688,
        publisherId: 1234,
        keyValues
      });
      expect(payload.imp[0].ext.prebid.storedrequest.id).to.equal('1053688');
      // video
      payload = JSON.parse(requests[1].data);
      expect(payload.imp[0].ext.bidder).to.not.exist;
      expect(payload.imp[0].ext.prebid.bidder.improvedigital.placementId).to.equal(123456);
      expect(payload.imp[0].ext.prebid.storedrequest.id).to.equal('123456');
    });

    it('should add max_bids param in imp.ext objects when bidLimit is specified in the bidderRequest', function () {
      const bidderRequestDeepClone = deepClone(bidderRequest);
      bidderRequestDeepClone.bidLimit = 3;
      const requests = spec.buildRequests([simpleBidRequest, instreamBidRequest], bidderRequestDeepClone);
      // banner
      let payload = JSON.parse(requests[0].data);
      expect(payload.imp[0].ext.max_bids).to.equal(3);
      // video
      payload = JSON.parse(requests[1].data);
      expect(payload.imp[0].ext.max_bids).to.equal(3);
    });

    it('should not add max_bids param in imp.ext objects when bidLimit is not specified in the bidderRequest', function () {
      const requests = spec.buildRequests([simpleBidRequest, instreamBidRequest], bidderRequest);
      // banner
      let payload = JSON.parse(requests[0].data);
      expect(payload.imp[0].ext.max_bids).to.not.exist;
      // video
      payload = JSON.parse(requests[1].data);
      expect(payload.imp[0].ext.max_bids).to.not.exist;
    });

    it('should set extend url when extend mode enabled in adunit params', function () {
      const bidRequest = deepClone(extendBidRequest);
      let request = spec.buildRequests([bidRequest], { bids: [bidRequest] })[0];
      expect(request.url).to.equal(EXTEND_URL);

      getConfigStub = sinon.stub(config, 'getConfig');

      // adunit param takes precedence over the global config
      getConfigStub.withArgs('improvedigital.extend').returns(false);
      request = spec.buildRequests([bidRequest], { bids: [bidRequest] })[0];
      expect(request.url).to.equal(EXTEND_URL);

      bidRequest.params.extend = false;
      getConfigStub.withArgs('improvedigital.extend').returns(true);
      request = spec.buildRequests([bidRequest], { bids: [bidRequest] })[0];
      expect(request.url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1234));

      const requests = spec.buildRequests([bidRequest, instreamBidRequest], { bids: [bidRequest, instreamBidRequest] });
      expect(requests.length).to.equal(2);
      expect(requests[0].url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1234));
      expect(requests[1].url).to.equal(EXTEND_URL);
    });

    it('should add publisherId to request URL when available in request params', function() {
      const bidRequest = deepClone(simpleBidRequest);
      bidRequest.params.publisherId = 1000;
      let request = spec.buildRequests([bidRequest], bidderRequest)[0];
      expect(request).to.be.an('object');
      sinon.assert.match(request, {
        method: METHOD,
        url: formatPublisherUrl(AD_SERVER_BASE_URL, 1000),
        bidderRequest
      });

      const bidRequest2 = deepClone(simpleBidRequest);
      bidRequest2.params.publisherId = 1002;

      const bidRequest3 = deepClone(extendBidRequest);
      bidRequest3.params.publisherId = 1002;

      const request1 = spec.buildRequests([bidRequest, bidRequest2], bidderRequest)[0];
      expect(request1.url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1000));
      const request2 = spec.buildRequests([bidRequest, bidRequest2], bidderRequest)[1];
      expect(request2.url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1002));
      const request3 = spec.buildRequests([bidRequest, bidRequest3], bidderRequest)[1];
      expect(request3.url).to.equal(EXTEND_URL);

      // Enable single request mode
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.singleRequest').returns(true);
      try {
        spec.buildRequests([bidRequest, bidRequest2], bidderRequest);
      } catch (e) {
        expect(e.name).to.exist.equal('Error');
        expect(e.message).to.exist.equal(`All Improve Digital placements in a single call must have the same publisherId. Please check your 'params.publisherId' or turn off the single request mode.`);
      }

      bidRequest2.params.publisherId = null;
      request = spec.buildRequests([bidRequest, bidRequest2], bidderRequest)[0];
      expect(request.url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1000));

      const consent = deepClone(gdprConsent);
      deepSetValue(consent, 'vendorData.purpose.consents.1', false);
      const bidderRequestWithConsent = deepClone(bidderRequest);
      bidderRequestWithConsent.gdprConsent = consent;
      request = spec.buildRequests([bidRequest], bidderRequestWithConsent)[0];
      expect(request.url).to.equal(formatPublisherUrl(BASIC_ADS_BASE_URL, 1000));

      deepSetValue(consent, 'vendorData.purpose.consents.1', true);
      bidderRequestWithConsent.gdprConsent = consent;
      request = spec.buildRequests([bidRequest], bidderRequestWithConsent)[0];
      expect(request.url).to.equal(formatPublisherUrl(AD_SERVER_BASE_URL, 1000));
    });
  });

  const serverResponse = {
    'body': {
      'id': '99f9a9e6-5126-425b-822c-8b4edad2a719',
      'cur': 'EUR',
      'seatbid': [
        {
          'bid': [
            {
              'ext': {
                'improvedigital': {
                  'line_item_id': 320896,
                  'bidder_id': 0,
                  'brand_name': '',
                  'buying_type': 'classic',
                  'agency_id': '0'
                }
              },
              'crid': '510265',
              'price': 1.9200543539802946,
              'id': '35adfe19-d6e9-46b9-9f7d-20da7026b965',
              'w': 728,
              'impid': '33e9500b21129f',
              'h': 90,
              'adm': '<html><body style="margin:0%"><a href="https://na-ice.360yield.com/click/wIUgWAXQ-Teg9bFreqmjvvwpXD86tInZbesBQgOtGBHqZatmIY9C1mo-1kWRx32zN2mfOxtmyaaHpr.Qh5pspzJarrsm08TtkRSeTc2mnsRuQ2MKzCTvbospesMJR28YLZ.3g06DwS6c5XOJuesd0eODk7GCqtmJ18c6CTmdWDUdDxiknLAPHVXAfvlDH5AA9utF7TNNGjaxvyMpQD51.Dt5GFjcJLnwWnGSajoSr9JfomoGenbLkabLmzylSXd1p9xyrzTmWU39FvagEOZnMb2ixlc.JDxXA1ZnaR.e7ywkwiJnDtg1Om0EJAYOmUh0oTozbXeo26iwLLZxVxV0owOHY61zhHYyHcpBakqtelYPWZcmBJEXfl5KIekB2CiLQqxCi3TKdg5FztAQY0Tf3mTmiGZev0RkeiX5fnxS8jbWSD-cCgB51PNLn0X5EEkUPkOJh9JV713OOcyDhsgaFPezUcvuD7nNrxB71aWcH6MMfk1BFQ7kSVi9WHQvauaTxrWm//https%3A%2F%2Fazerion.com" target="_blank"><img style="border: 0;" border="0" width=728 height=90 src="https://creative.360yield.com/file/241121/728x90.jpg" alt=" "/></a><img src="https://na-ice.360yield.com/imp_pixel?ic=wIUgWDjQ.pQrjtYOEKs44M3pIqNnfojBPkSd3WRdHnRawHiRiER7A-0RowzsOtOLq7MWtEFnWsRXYZZmJcZPGft0cNSs8lNOVZnXWHLDv3Dyqo8VGI4737RieGIK0DrIjlVXzFmuYeXufriRfPHVGiV-hz6VIateQ6I7.xR5O.48..ZoEGfRpIJGzqeqz12cWnFUPhBScQ6sPLlb6B1RiTpNh170OhIVfX80N2g4jn-U.xJ262ND29bBvImQsJjz29o8mmGL3TfbzUHzr.ob-ozfP9.ZHh.B5tD-M5qG9rAlIU6Q7I-zchnhv1W5OzU5mfMYy9yMLKqBemQGJA1KaiZJV79lwnDki-6PIg1v09h86eJqXYHHsUobx4Np5lMT6-5UdHXZPpR8T08b4keLREQw-lpqKum92pwUCVAYPeFdmTeKk1gUKPcaWxN8QfaQeoLJfb.88n3-vp.-aBCkxlZwXjXSd55QV.uwi-bTtFwaZjGHpNkIBG3D19kNl.Yb55Rk" alt=" " style="display:none"/><improvedigital_ad_output_information tp_id="" buyer_id="0" rtb_advertiser="" campaign_id="123159" line_item_id="320896" creative_id="510265" crid="0" placement_id="22135702"></improvedigital_ad_output_information></body></html>',
              'cid': '123159'
            }
          ],
          'seat': 'improvedigital'
        }
      ],
      ext: {
        improvedigital: {
          sync: [
            'https://link1',
            'https://link2',
            'https://link3',
          ]
        }
      }
    }
  };

  const serverResponseTwoBids = {
    'body': {
      'id': '99f9a9e6-5126-425b-822c-8b4edad2a719',
      'cur': 'EUR',
      'seatbid': [
        {
          'bid': [
            {
              'ext': {
                'improvedigital': {
                  'line_item_id': 320896,
                  'bidder_id': 0,
                  'brand_name': '',
                  'buying_type': 'classic',
                  'agency_id': '0'
                }
              },
              'crid': '510265',
              'price': 1.9200543539802946,
              'id': '35adfe19-d6e9-46b9-9f7d-20da7026b965',
              'w': 728,
              'impid': '33e9500b21129f',
              'h': 90,
              'adm': '<html><body style="margin:0%"><a href="https://na-ice.360yield.com/click/wIUgWAXQ-Teg9bFreqmjvvwpXD86tInZbesBQgOtGBHqZatmIY9C1mo-1kWRx32zN2mfOxtmyaaHpr.Qh5pspzJarrsm08TtkRSeTc2mnsRuQ2MKzCTvbospesMJR28YLZ.3g06DwS6c5XOJuesd0eODk7GCqtmJ18c6CTmdWDUdDxiknLAPHVXAfvlDH5AA9utF7TNNGjaxvyMpQD51.Dt5GFjcJLnwWnGSajoSr9JfomoGenbLkabLmzylSXd1p9xyrzTmWU39FvagEOZnMb2ixlc.JDxXA1ZnaR.e7ywkwiJnDtg1Om0EJAYOmUh0oTozbXeo26iwLLZxVxV0owOHY61zhHYyHcpBakqtelYPWZcmBJEXfl5KIekB2CiLQqxCi3TKdg5FztAQY0Tf3mTmiGZev0RkeiX5fnxS8jbWSD-cCgB51PNLn0X5EEkUPkOJh9JV713OOcyDhsgaFPezUcvuD7nNrxB71aWcH6MMfk1BFQ7kSVi9WHQvauaTxrWm//https%3A%2F%2Fazerion.com" target="_blank"><img style="border: 0;" border="0" width=728 height=90 src="https://creative.360yield.com/file/241121/728x90.jpg" alt=" "/></a><img src="https://na-ice.360yield.com/imp_pixel?ic=wIUgWDjQ.pQrjtYOEKs44M3pIqNnfojBPkSd3WRdHnRawHiRiER7A-0RowzsOtOLq7MWtEFnWsRXYZZmJcZPGft0cNSs8lNOVZnXWHLDv3Dyqo8VGI4737RieGIK0DrIjlVXzFmuYeXufriRfPHVGiV-hz6VIateQ6I7.xR5O.48..ZoEGfRpIJGzqeqz12cWnFUPhBScQ6sPLlb6B1RiTpNh170OhIVfX80N2g4jn-U.xJ262ND29bBvImQsJjz29o8mmGL3TfbzUHzr.ob-ozfP9.ZHh.B5tD-M5qG9rAlIU6Q7I-zchnhv1W5OzU5mfMYy9yMLKqBemQGJA1KaiZJV79lwnDki-6PIg1v09h86eJqXYHHsUobx4Np5lMT6-5UdHXZPpR8T08b4keLREQw-lpqKum92pwUCVAYPeFdmTeKk1gUKPcaWxN8QfaQeoLJfb.88n3-vp.-aBCkxlZwXjXSd55QV.uwi-bTtFwaZjGHpNkIBG3D19kNl.Yb55Rk" alt=" " style="display:none"/><improvedigital_ad_output_information tp_id="" buyer_id="0" rtb_advertiser="" campaign_id="123159" line_item_id="320896" creative_id="510265" crid="0" placement_id="22135702"></improvedigital_ad_output_information></body></html>',
              'cid': '123159'
            },
            {
              'ext': {
                'improvedigital': {
                  'line_item_id': 320896,
                  'bidder_id': 0,
                  'brand_name': '',
                  'buying_type': 'classic',
                  'agency_id': '0'
                }
              },
              'crid': '479163',
              'price': 1.9200543539802946,
              'id': '83c8d524-0955-4d0c-b558-4c9f3600e09b',
              'w': 300,
              'impid': '33e9500b21129f',
              'h': 250,
              'adm': '<html><body style="margin:0%"><a href="https://na-ice.360yield.com/click/.2RC3VhfEsdhtcsRiT8bWksMTmBbkfnj1AaD3C6Bht.Bp85KK5vjzZvJMpigI4ECdhllWuzbk2UhQt8VEGq1tg8m1OEot7Gs94PplWYs2ESdXpGAPFHiqdbZstOOhfiWL4D.k6lXfgNmbRhpL.SktYeEAiRaOZHQAX.22IEQ0swRnEdNyjHXYEkNIgpvMLqkZTv.JYM.iW9NwyJLIqk4Djh8X301iRLxexGBTl7-.n93WbkSCVY6uwdXSzoQrtK1r3fTrS34rdgpqFt6ZIBLKWI2ByLM2.aQqfvev5BCMOeyEKY8CcSg9SoDiPyQsvcz9bTckLtqs3AD3Qu8I.2rGn1NID7ljgg6-dERrorPK9A5XK67Pv34UqUe2xILQ6wvi52dX4p5d3yxsI9BMfnxzkn7MullVJdn-NiSB2rTe2MFozJc5G1nEwtpsMwZpBxl00PCcMsyETtaKbhqa3Gq5nCuce4AEhL6109IrZscUUzBMSKLSX16HlFfmPZ.gDnWCI3lO35UbGdL7lKjbT9mHYQ-//http%3A%2F%2Fblah.com" target="_blank"><img style="border: 0;" border="0" width=300 height=250 src="https://creative.360yield.com/file/238052/test_ads-300x250.jpg" alt=" "/></a><img src="https://na-ice.360yield.com/imp_pixel?ic=.2RC3VqxeCtOU3G5i6Wejh69dm5JnKlRXeieMtJA63nfGMyuFoWTTjSU5PfHLg2PtnmDRFgHJgGE19QyjAGj6ZQVy0iUk-HF-.zsAlx.7Fx3m5fPE7RIYw.kjy-BvuprFqfU-qlm03KTks6zVLDSIspuxemNQ1HBhq6QZSm9qqAVY-1XS-KbImfb.fll3VvhJXy7Ru.KstgDfAJwt5vYxVab6efvjAIhOrrv6uXaywFVTtu9-gK5pKgIkdixxuYE2jLUyEh9GiRyRCH0jhhUVUmSfrjE4OuTq-7TmCYXQQ5Vk9AqOV.JybF8d35IeyAbF2aywwdZA2SGGEGeYIoOy.7D8TpuVqXxvnUyeKXlCfmzXcJs27W2sKGUTfpWc-TyhAOHKzwqrxP-QN5D1QRCXFWgAm.rwUBguE-oL1Q7NOaCsaRwINRwvQrastWNFUDEYzrB32NL-wIkILdh9e96JwhKiwGwJ1VqH.6RDDutUi9CLreYQl348exTfqL44Ia5VTLn7e0rA6s9V1tg55V7TX36" alt=" " style="display:none"/><improvedigital_ad_output_information tp_id="" buyer_id="0" rtb_advertiser="" campaign_id="123159" line_item_id="320896" creative_id="479163" crid="0" placement_id="22135702"></improvedigital_ad_output_information></body></html>',
              'cid': '123159'
            }
          ],
          'seat': 'improvedigital_improvedigital'
        }
      ],
      ext: {
        improvedigital: {
          sync: [
            'https://link1',
            'https://link2',
            'https://link4',
          ]
        }
      }
    }
  };

  const serverResponseNative = {
    body: {
      'id': '8201e669-bbbf-4f61-b9a2-4cb854033c82',
      'cur': 'EUR',
      'seatbid': [
        {
          'bid': [
            {
              'ext': {
                'improvedigital': {
                  'line_item_id': 411331,
                  'bidder_id': 0,
                  'brand_name': '',
                  'buying_type': 'classic',
                  'agency_id': '0',
                  'is_net': true
                }
              },
              'crid': '544456',
              'id': '52098fad-20c1-476b-a4fa-41e275e5a4a5',
              'price': 1.8600000000000003,
              'adm': "{\"ver\":\"1.1\",\"imptrackers\":[\"https://secure.adnxs.com/imptr?id=52311&t=2\",\"https://euw-ice.360yield.com/imp_pixel?ic=hcUBlCANx1FabHBf6FR2gC7UO4xEyXahdZAn0-B5qL-bb3A74BJ1smyWIyW7IWcC0SOjSXzVpevTHXxTqJ.sf.Qhahyy6tSo.0j1QWfXlH8sM4-8vKWjMjw-x.IrJJNlwkQ0s1CdwcwTefcLXm5l2E-W19VhACuV7f3mgrZMNjiSw.SjJAfyPC3SIyAMRjYfj53UmjriQ46T7lhmkqxK8wHmksYCdbZc3PZESk8NWl28sxdjNvnYYCFMcJbeav.LOLabyTXfwy-1cEPbQs.IKMRZIKaqccTDPV3wOtzbNv0jQzatd3Nnv-PGFQcjQ-GW3i27W04Fws4kodpFSn-B6VwZAjzLzoyd5gBncyRnAyCplEbgHU5sZ1IyKHWjgCl3ZtRIK5vqrRD5D-xqgSnOi7-phG.CqZWDZ4bMDSfQg2ZnbvUTyGKcEl0WR59dW5izTMV4Fjizcrvr5T-t.zMbGwz.hGnmLIyhTqh.IcwW.GiDLVExlDlix5S1LXIWVsSyrQ==\"],\"assets\":[{\"id\":1,\"data\":{\"value\":\"ImproveDigital\",\"type\":1}},{\"id\":3,\"data\":{\"value\":\"Test content.\",\"type\":2}},{\"id\":0,\"title\":{\"text\":\"Sample Prebid Test Title\"}}],\"link\":{\"url\":\"https://euw-ice.360yield.com/click/hcUBlHOV7YhVse8RyBa0ajjyPa9Vt17e4g-1m3cRj3E67vq-RYux.SiUeAmBfNBcoOqkUc6A15AWmi4yFu5K-BdkaYjildyyk7fNLyR6hWr411kv4vrFwm5jrIBceuHS6K8oN69f.uCo8zGTdR2TbSlldwcpahQPlufZU.6VaMsu4IC53uEiUT5vb7kAw6TTlxuGBNq6zaGryiWEV2.N3YYJDTyYPh8tv-ZFyeFZFm0Gnjv.xWbC.70JcRUVU9UelQaPsTpTWYTXBhJt84YJUw1-GNtaLNVLSjjZbVoA2fsMti5p6OBmF.7u39on2OPgvseIkSmge7Pqg63pRqdP75hp.DAEk6OkcN1jGnwP2DSbvpaSbin5lVqjfO0B-wnQgfQTCUtM5v4JmkNweLhUf9Q-x.nPKLW5SccEk9ZFXzY2-1wpT3PWm8Tix3NRscLPZub9wHzL..pl6ip8cQ9hp16UjwT4H6RMAxL0R7bl-h2pAicGAzYmuO7ntRESKUoIWA==//http%3A%2F%2Fquantum-advertising.com%2Ffr%2F\"},\"jstracker\":\"<script type=\\\"application/javascript\\\">var js_tracker = ['https://secure.adnxs.com/imptr?id=52312&t=1', 'https://pixel.adsafeprotected.com/rjss/st/291611/36974035/skeleton.js?ias_adpath=[class~=ea_improve_pid_${TAG_ID}]']</script>\"}",
              'impid': '33e9500b21129f',
              'cid': '196108'
            }
          ],
          'seat': 'improvedigital'
        }
      ]
    }
  };

  const serverResponseVideo = {
    'body': {
      'id': '8ed20675-8934-430c-b645-1ccd17b35839',
      'cur': 'EUR',
      'seatbid': [
        {
          'bid': [
            {
              'ext': {
                'improvedigital': {
                  'line_item_id': 321329,
                  'bidder_id': 0,
                  'brand_name': '',
                  'buying_type': 'classic',
                  'agency_id': '0'
                }
              },
              'crid': '484367',
              'price': 9.600271769901472,
              'id': 'b131fd7b-5759-4b72-800e-60e69291e7d9',
              'adomain': [
                'improvedigital.com'
              ],
              'impid': '33e9500b21129f',
              'adm': '<VAST></VAST>',
              'w': 640,
              'h': 480,
              'cid': '123159'
            }
          ],
          'seat': 'improvedigital'
        }
      ],
    }
  };

  describe('interpretResponse', function () {
    const expectedBid = [
      {
        requestId: '33e9500b21129f',
        cpm: 1.9200543539802946,
        currency: 'EUR',
        width: 728,
        height: 90,
        ttl: 300,
        ad: '<html><body style="margin:0%"><a href="https://na-ice.360yield.com/click/wIUgWAXQ-Teg9bFreqmjvvwpXD86tInZbesBQgOtGBHqZatmIY9C1mo-1kWRx32zN2mfOxtmyaaHpr.Qh5pspzJarrsm08TtkRSeTc2mnsRuQ2MKzCTvbospesMJR28YLZ.3g06DwS6c5XOJuesd0eODk7GCqtmJ18c6CTmdWDUdDxiknLAPHVXAfvlDH5AA9utF7TNNGjaxvyMpQD51.Dt5GFjcJLnwWnGSajoSr9JfomoGenbLkabLmzylSXd1p9xyrzTmWU39FvagEOZnMb2ixlc.JDxXA1ZnaR.e7ywkwiJnDtg1Om0EJAYOmUh0oTozbXeo26iwLLZxVxV0owOHY61zhHYyHcpBakqtelYPWZcmBJEXfl5KIekB2CiLQqxCi3TKdg5FztAQY0Tf3mTmiGZev0RkeiX5fnxS8jbWSD-cCgB51PNLn0X5EEkUPkOJh9JV713OOcyDhsgaFPezUcvuD7nNrxB71aWcH6MMfk1BFQ7kSVi9WHQvauaTxrWm//https%3A%2F%2Fazerion.com" target="_blank"><img style="border: 0;" border="0" width=728 height=90 src="https://creative.360yield.com/file/241121/728x90.jpg" alt=" "/></a><img src="https://na-ice.360yield.com/imp_pixel?ic=wIUgWDjQ.pQrjtYOEKs44M3pIqNnfojBPkSd3WRdHnRawHiRiER7A-0RowzsOtOLq7MWtEFnWsRXYZZmJcZPGft0cNSs8lNOVZnXWHLDv3Dyqo8VGI4737RieGIK0DrIjlVXzFmuYeXufriRfPHVGiV-hz6VIateQ6I7.xR5O.48..ZoEGfRpIJGzqeqz12cWnFUPhBScQ6sPLlb6B1RiTpNh170OhIVfX80N2g4jn-U.xJ262ND29bBvImQsJjz29o8mmGL3TfbzUHzr.ob-ozfP9.ZHh.B5tD-M5qG9rAlIU6Q7I-zchnhv1W5OzU5mfMYy9yMLKqBemQGJA1KaiZJV79lwnDki-6PIg1v09h86eJqXYHHsUobx4Np5lMT6-5UdHXZPpR8T08b4keLREQw-lpqKum92pwUCVAYPeFdmTeKk1gUKPcaWxN8QfaQeoLJfb.88n3-vp.-aBCkxlZwXjXSd55QV.uwi-bTtFwaZjGHpNkIBG3D19kNl.Yb55Rk" alt=" " style="display:none"/><improvedigital_ad_output_information tp_id="" buyer_id="0" rtb_advertiser="" campaign_id="123159" line_item_id="320896" creative_id="510265" crid="0" placement_id="22135702"></improvedigital_ad_output_information></body></html>',
        creativeId: '510265',
        dealId: 320896,
        netRevenue: false,
        mediaType: BANNER,
      }
    ];

    const multiFormatExpectedBid = [
      Object.assign({}, expectedBid[0], {
        ad: '<html><body style="margin:0%"><a href="https://na-ice.360yield.com/click/wIUgWAXQ-Teg9bFreqmjvvwpXD86tInZbesBQgOtGBHqZatmIY9C1mo-1kWRx32zN2mfOxtmyaaHpr.Qh5pspzJarrsm08TtkRSeTc2mnsRuQ2MKzCTvbospesMJR28YLZ.3g06DwS6c5XOJuesd0eODk7GCqtmJ18c6CTmdWDUdDxiknLAPHVXAfvlDH5AA9utF7TNNGjaxvyMpQD51.Dt5GFjcJLnwWnGSajoSr9JfomoGenbLkabLmzylSXd1p9xyrzTmWU39FvagEOZnMb2ixlc.JDxXA1ZnaR.e7ywkwiJnDtg1Om0EJAYOmUh0oTozbXeo26iwLLZxVxV0owOHY61zhHYyHcpBakqtelYPWZcmBJEXfl5KIekB2CiLQqxCi3TKdg5FztAQY0Tf3mTmiGZev0RkeiX5fnxS8jbWSD-cCgB51PNLn0X5EEkUPkOJh9JV713OOcyDhsgaFPezUcvuD7nNrxB71aWcH6MMfk1BFQ7kSVi9WHQvauaTxrWm//https%3A%2F%2Fazerion.com" target="_blank"><img style="border: 0;" border="0" width=728 height=90 src="https://creative.360yield.com/file/241121/728x90.jpg" alt=" "/></a><img src="https://na-ice.360yield.com/imp_pixel?ic=wIUgWDjQ.pQrjtYOEKs44M3pIqNnfojBPkSd3WRdHnRawHiRiER7A-0RowzsOtOLq7MWtEFnWsRXYZZmJcZPGft0cNSs8lNOVZnXWHLDv3Dyqo8VGI4737RieGIK0DrIjlVXzFmuYeXufriRfPHVGiV-hz6VIateQ6I7.xR5O.48..ZoEGfRpIJGzqeqz12cWnFUPhBScQ6sPLlb6B1RiTpNh170OhIVfX80N2g4jn-U.xJ262ND29bBvImQsJjz29o8mmGL3TfbzUHzr.ob-ozfP9.ZHh.B5tD-M5qG9rAlIU6Q7I-zchnhv1W5OzU5mfMYy9yMLKqBemQGJA1KaiZJV79lwnDki-6PIg1v09h86eJqXYHHsUobx4Np5lMT6-5UdHXZPpR8T08b4keLREQw-lpqKum92pwUCVAYPeFdmTeKk1gUKPcaWxN8QfaQeoLJfb.88n3-vp.-aBCkxlZwXjXSd55QV.uwi-bTtFwaZjGHpNkIBG3D19kNl.Yb55Rk" alt=" " style="display:none"/><improvedigital_ad_output_information tp_id="" buyer_id="0" rtb_advertiser="" campaign_id="123159" line_item_id="320896" creative_id="510265" crid="0" placement_id="22135702"></improvedigital_ad_output_information></body></html>',
      })
    ];

    const expectedTwoBids = [
      expectedBid[0],
      {
        requestId: '33e9500b21129f',
        cpm: 1.9200543539802946,
        currency: 'EUR',
        width: 300,
        height: 250,
        ttl: 300,
        ad: '<html><body style="margin:0%"><a href="https://na-ice.360yield.com/click/.2RC3VhfEsdhtcsRiT8bWksMTmBbkfnj1AaD3C6Bht.Bp85KK5vjzZvJMpigI4ECdhllWuzbk2UhQt8VEGq1tg8m1OEot7Gs94PplWYs2ESdXpGAPFHiqdbZstOOhfiWL4D.k6lXfgNmbRhpL.SktYeEAiRaOZHQAX.22IEQ0swRnEdNyjHXYEkNIgpvMLqkZTv.JYM.iW9NwyJLIqk4Djh8X301iRLxexGBTl7-.n93WbkSCVY6uwdXSzoQrtK1r3fTrS34rdgpqFt6ZIBLKWI2ByLM2.aQqfvev5BCMOeyEKY8CcSg9SoDiPyQsvcz9bTckLtqs3AD3Qu8I.2rGn1NID7ljgg6-dERrorPK9A5XK67Pv34UqUe2xILQ6wvi52dX4p5d3yxsI9BMfnxzkn7MullVJdn-NiSB2rTe2MFozJc5G1nEwtpsMwZpBxl00PCcMsyETtaKbhqa3Gq5nCuce4AEhL6109IrZscUUzBMSKLSX16HlFfmPZ.gDnWCI3lO35UbGdL7lKjbT9mHYQ-//http%3A%2F%2Fblah.com" target="_blank"><img style="border: 0;" border="0" width=300 height=250 src="https://creative.360yield.com/file/238052/test_ads-300x250.jpg" alt=" "/></a><img src="https://na-ice.360yield.com/imp_pixel?ic=.2RC3VqxeCtOU3G5i6Wejh69dm5JnKlRXeieMtJA63nfGMyuFoWTTjSU5PfHLg2PtnmDRFgHJgGE19QyjAGj6ZQVy0iUk-HF-.zsAlx.7Fx3m5fPE7RIYw.kjy-BvuprFqfU-qlm03KTks6zVLDSIspuxemNQ1HBhq6QZSm9qqAVY-1XS-KbImfb.fll3VvhJXy7Ru.KstgDfAJwt5vYxVab6efvjAIhOrrv6uXaywFVTtu9-gK5pKgIkdixxuYE2jLUyEh9GiRyRCH0jhhUVUmSfrjE4OuTq-7TmCYXQQ5Vk9AqOV.JybF8d35IeyAbF2aywwdZA2SGGEGeYIoOy.7D8TpuVqXxvnUyeKXlCfmzXcJs27W2sKGUTfpWc-TyhAOHKzwqrxP-QN5D1QRCXFWgAm.rwUBguE-oL1Q7NOaCsaRwINRwvQrastWNFUDEYzrB32NL-wIkILdh9e96JwhKiwGwJ1VqH.6RDDutUi9CLreYQl348exTfqL44Ia5VTLn7e0rA6s9V1tg55V7TX36" alt=" " style="display:none"/><improvedigital_ad_output_information tp_id="" buyer_id="0" rtb_advertiser="" campaign_id="123159" line_item_id="320896" creative_id="479163" crid="0" placement_id="22135702"></improvedigital_ad_output_information></body></html>',
        creativeId: '479163',
        dealId: 320896,
        netRevenue: false,
        mediaType: BANNER,
      }
    ];

    const expectedBidInstreamVideo = [
      {
        requestId: '33e9500b21129f',
        cpm: 9.600271769901472,
        currency: 'EUR',
        ttl: 300,
        vastXml: '<VAST></VAST>',
        creativeId: '484367',
        dealId: 321329,
        netRevenue: false,
        mediaType: VIDEO,
        meta: {
          advertiserDomains: ['improvedigital.com'],
        }
      }
    ];

    const expectedBidOutstreamVideo = deepClone(expectedBidInstreamVideo);
    expectedBidOutstreamVideo[0].adResponse = {
      content: expectedBidOutstreamVideo[0].vastXml
    };

    function makeRequest(bidderRequest) {
      return {
        ortbRequest: CONVERTER.toORTB({ bidderRequest })
      };
    }

    function expectMatch(actual, expected) {
      sinon.assert.match(actual, expected.map(i => sinon.match(i)));
    }

    it('should return a well-formed display bid', function () {
      const bids = spec.interpretResponse(serverResponse, makeRequest(bidderRequest));
      expectMatch(bids, expectedBid);
    });

    it('should return a well-formed display bid for multi-format ad unit', function () {
      const bids = spec.interpretResponse(serverResponse, makeRequest(multiFormatBidderRequest));

      expectMatch(bids, multiFormatExpectedBid);
    });

    it('should return two bids', function () {
      const bids = spec.interpretResponse(serverResponseTwoBids, makeRequest(bidderRequest));
      expectMatch(bids, expectedTwoBids);
    });

    it('should set dealId correctly', function () {
      const request = makeRequest(bidderRequest);
      const response = deepClone(serverResponse);
      let bids;

      delete response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'deal_id';
      bids = spec.interpretResponse(response, request);
      expect(bids[0].dealId).to.not.exist;

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      delete response.body.seatbid[0].bid[0].ext.improvedigital.buying_type;
      bids = spec.interpretResponse(response, request);
      expect(bids[0].dealId).to.not.exist;

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'rtb';
      bids = spec.interpretResponse(response, request);
      expect(bids[0].dealId).to.not.exist;

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'classic';
      bids = spec.interpretResponse(response, request);
      expect(bids[0].dealId).to.equal(268515);

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'deal_id';
      bids = spec.interpretResponse(response, request);
      expect(bids[0].dealId).to.equal(268515);
    });

    it('should set deal type targeting KV for PG', function () {
      const request = makeRequest(bidderRequest);
      const response = deepClone(serverResponse);
      let bids;

      response.body.seatbid[0].bid[0].ext.improvedigital.pg = 1;
      bids = spec.interpretResponse(response, request);
      expect(bids[0].adserverTargeting.hb_deal_type_improve).to.equal('pg');
    });

    it('should set currency', function () {
      const response = deepClone(serverResponse);
      response.body.cur = 'EUR';
      const bids = spec.interpretResponse(response, makeRequest(bidderRequest));
      expect(bids[0].currency).to.equal('EUR');
    });

    it('should return empty array for bad response or no price', function () {
      const request = makeRequest(bidderRequest);
      let response = deepClone(serverResponse);
      let bids;

      // Price missing or 0
      response.body.seatbid[0].bid[0].price = 0;
      bids = spec.interpretResponse(response, request);
      expect(bids).to.deep.equal([]);
      delete response.body.seatbid[0].bid[0];
      bids = spec.interpretResponse(response, request);
      expect(bids).to.deep.equal([]);
      response.body.seatbid[0].bid[0] = [];
      bids = spec.interpretResponse(response, request);
      expect(bids).to.deep.equal([]);

      // errorCode present
      response = deepClone(serverResponse);
      response.body.seatbid[0].bid[0].errorCode = undefined;
      bids = spec.interpretResponse(response, request);
      expect(bids).to.deep.equal([]);

      // adm and native missing
      response = deepClone(serverResponse);
      delete response.body.seatbid[0].bid[0].adm;
      bids = spec.interpretResponse(response, request);
      expect(bids).to.deep.equal([]);
      response.body.seatbid[0].bid[0].adm = null;
      bids = spec.interpretResponse(response, request);
      expect(bids).to.deep.equal([]);
    });

    it('should set netRevenue', function () {
      const response = deepClone(serverResponse);
      response.body.seatbid[0].bid[0].ext.improvedigital.is_net = true;
      const bids = spec.interpretResponse(response, makeRequest(bidderRequest));
      expect(bids[0].netRevenue).to.equal(true);
    });

    it('should set advertiserDomains', function () {
      const adomain = ['domain.com'];
      const response = deepClone(serverResponse);
      response.body.seatbid[0].bid[0].adomain = adomain;
      const bids = spec.interpretResponse(response, makeRequest(bidderRequest));
      expect(bids[0].meta.advertiserDomains).to.equal(adomain);
    });
    //
    // Native ads
    if (FEATURES.NATIVE) {
      it('should return a well-formed native ad bid', function () {
        const reqBids = updateNativeParams(nativeBidderRequest.bids);
        const request = makeRequest({
          ...nativeBidderRequest,
          reqBids
        });
        const bids = spec.interpretResponse(serverResponseNative, request);
        expect(bids[0].native.ortb).to.eql(JSON.parse(serverResponseNative.body.seatbid[0].bid[0].adm));
      });

      it('should return a well-formed native bid for multi-format ad unit', function () {
        const bids = spec.interpretResponse(serverResponseNative, makeRequest(multiFormatBidderRequest));
        expect(bids[0].mediaType).to.equal(NATIVE);
      });
    }

    // Video
    if (FEATURES.VIDEO) {
      it('should return a well-formed instream video bid', function () {
        const bids = spec.interpretResponse(serverResponseVideo, makeRequest(instreamBidderRequest));
        expectMatch(bids, expectedBidInstreamVideo);
      });

      it('should return a well-formed outstream video bid', function () {
        const bids = spec.interpretResponse(serverResponseVideo, makeRequest(outstreamBidderRequest));
        expect(bids[0].renderer).to.exist;
        expectMatch(bids, expectedBidOutstreamVideo);
      });

      it('should return a well-formed outstream video bid for multi-format ad unit', function () {
        const request = makeRequest(multiFormatBidderRequest);
        const videoResponse = deepClone(serverResponseVideo);
        let bids = spec.interpretResponse(videoResponse, request);
        expect(bids[0].renderer).to.exist;
        expectMatch(bids, expectedBidOutstreamVideo);

        videoResponse.body.seatbid[0].bid[0].adm = '<vAst';
        bids = spec.interpretResponse(videoResponse, request);
        expect(bids[0].mediaType).to.equal(VIDEO);

        videoResponse.body.seatbid[0].bid[0].adm = '<?xml';
        bids = spec.interpretResponse(videoResponse, request);
        expect(bids[0].mediaType).to.equal(VIDEO);
      });
    }
  });

  describe('getUserSyncs', function () {
    const serverResponses = [serverResponse, serverResponseTwoBids];
    const pixelSyncs = [
      { type: 'image', url: 'https://link1' },
      { type: 'image', url: 'https://link2' },
      { type: 'image', url: 'https://link3' },
      { type: 'image', url: 'https://link4' }
    ];

    const basicIframeSyncUrl = `${IFRAME_SYNC_URL}?placement_id=1053688`;

    const uspConsent = '1YYY';

    let getConfigStub = null;

    beforeEach(function () {
      spec.syncStore = { extendMode: false, placementId: null };
    });

    afterEach(function () {
      if (getConfigStub) {
        getConfigStub.restore();
        getConfigStub = null;
      }
    });

    it('should return no syncs when neither iframe nor pixel syncing is enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, serverResponses);
      expect(syncs).to.deep.equal([]);
    });

    it('should return no syncs for COPPA users', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('coppa').returns(true);
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([]);
    });

    it('should return no syncs for when GDPR consent for purpose 1 not given', function () {
      const consent = deepClone(gdprConsent);
      deepSetValue(consent, 'vendorData.purpose.consents.1', false);
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses, consent);
      expect(syncs).to.deep.equal([]);
    });

    it('should return pixel user syncs for the ad server mode', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal(pixelSyncs);
    });

    it('should return pixel user syncs for extend mode when iframe mode disabled', function () {
      // Set spec.syncStore vars
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.extend').returns(true);
      spec.buildRequests([simpleBidRequest], bidderRequest);

      const syncs = spec.getUserSyncs({ pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal(pixelSyncs);
    });

    it('should return iframe user sync for the ad server mode when pixel mode disabled', function () {
      spec.buildRequests([simpleBidRequest], bidderRequest);
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: basicIframeSyncUrl }]);
    });

    it('should attach gdpr consent to iframe sync url', function () {
      spec.buildRequests([simpleBidRequest], bidderRequest);
      let syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses, gdprConsent);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: `${basicIframeSyncUrl}&gdpr=1&gdpr_consent=CONSENT` }]);

      syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses, { gdprApplies: false });
      expect(syncs).to.deep.equal([{ type: 'iframe', url: `${basicIframeSyncUrl}&gdpr=0` }]);
    });

    it('should attach usp consent to iframe sync url', function () {
      spec.buildRequests([simpleBidRequest], bidderRequest);
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses, null, uspConsent);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: `${basicIframeSyncUrl}&us_privacy=${uspConsent}` }]);
    });

    it('should return iframe user sync for the adunit extend mode if iframe mode enabled', function () {
      // buildRequests() sets spec.syncStore vars
      spec.buildRequests([simpleBidRequest, extendBidRequest], {});
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: basicIframeSyncUrl + '&pbs=1' }]);
    });

    it('should return iframe user sync for the global extend mode if iframe mode enabled', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.extend').returns(true);
      // buildRequests() sets spec.syncStore vars
      spec.buildRequests([simpleBidRequest], {});
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: basicIframeSyncUrl + '&pbs=1' }]);
    });

    it('should add bidders to iframe user sync url', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.extend').returns(true);
      spec.buildRequests([simpleBidRequest], {});
      const rawResponse = deepClone(serverResponse);
      deepSetValue(rawResponse, 'body.ext.responsetimemillis', { a: 1, b: 1, c: 1, d: 1, e: 1 });
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [rawResponse]);
      const url = basicIframeSyncUrl + '&pbs=1' + '&bidders=a,b,c,d,e';
      expect(syncs).to.deep.equal([{ type: 'iframe', url }]);
    });
  });
});
