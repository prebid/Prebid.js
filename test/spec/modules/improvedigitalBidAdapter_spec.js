import { expect } from 'chai';
import { spec } from 'modules/improvedigitalBidAdapter.js';
import { config } from 'src/config.js';
import { deepClone } from 'src/utils.js';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes';
import { deepSetValue } from '../../../src/utils';

describe('Improve Digital Adapter Tests', function () {
  const METHOD = 'POST';
  const AD_SERVER_URL = 'https://ad.360yield.com/pb';
  const EXTEND_URL = 'https://pbs.360yield.com/openrtb2/auction';
  const IFRAME_SYNC_URL = 'https://hb.360yield.com/prebid-universal-creative/load-cookie.html';
  const INSTREAM_TYPE = 1;
  const OUTSTREAM_TYPE = 3;

  const simpleBidRequest = {
    bidder: 'improvedigital',
    params: {
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
  }

  const instreamBidRequest = {
    bidder: 'improvedigital',
    params: {
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
    title: {required: true},
    body: {required: true}
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

  const simpleSmartTagBidRequest = {
    bidder: 'improvedigital',
    bidId: '1a2b3c',
    placementCode: 'placement1',
    params: {
      publisherId: 1032,
      placementKey: 'data_team_test_hb_smoke_test'
    }
  };

  const bidderRequest = {
    bids: [simpleBidRequest]
  };

  const extendBidderRequest = {
    bids: [extendBidRequest]
  };

  const instreamBidderRequest = {
    bids: [instreamBidRequest]
  };

  const outstreamBidderRequest = {
    bids: [outstreamBidRequest]
  };

  const multiFormatBidderRequest = {
    bids: [multiFormatBidRequest]
  };

  const nativeBidderRequest = {
    bids: [nativeBidRequest]
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
      referer: 'https://blah.com/test.html',
    },
  };

  describe('isBidRequestValid', function () {
    it('should return false when no bid', function () {
      expect(spec.isBidRequestValid()).to.equal(false);
    });

    it('should return false when no bid.params', function () {
      const bid = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when both placementId and placementKey + publisherId are missing', function () {
      const bid = { 'params': {} };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when only one of placementKey and publisherId is present', function () {
      let bid = {
        params: {
          publisherId: 1234
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid = {
        params: {
          placementKey: 'xyz'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when placementId is passed', function () {
      expect(spec.isBidRequestValid(simpleBidRequest)).to.equal(true);
    });

    it('should return true when both placementKey and publisherId are passed', function () {
      expect(spec.isBidRequestValid(simpleSmartTagBidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let getConfigStub = null;

    afterEach(function () {
      if (getConfigStub) {
        getConfigStub.restore();
        getConfigStub = null;
      }
    });

    it('should make a well-formed request objects', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.usePrebidSizes').returns(true);
      const request = spec.buildRequests([simpleBidRequest], bidderRequest)[0];
      expect(request).to.be.an('object');
      expect(request.method).to.equal(METHOD);
      expect(request.url).to.equal(AD_SERVER_URL);
      expect(request.bidderRequest).to.deep.equal(bidderRequest);

      const payload = JSON.parse(request.data);
      expect(payload).to.be.an('object');
      expect(payload.id).to.be.a('string');
      expect(payload.tmax).not.to.exist;
      expect(payload.cur).to.be.an('array');
      expect(payload.regs).to.not.exist;
      expect(payload.schain).to.not.exist;
      expect(payload.source).to.deep.equal({ ext: {}, tid: 'f183e871-fbed-45f0-a427-c8a63c4c01eb' });
      expect(payload.device).to.be.an('object');
      expect(payload.user).to.not.exist;
      expect(payload.imp).to.deep.equal([
        {
          id: '33e9500b21129f',
          secure: 0,
          ext: {
            bidder: {
              placementId: 1053688,
            }
          },
          banner: {
            format: [
              {w: 300, h: 250},
              {w: 160, h: 600},
            ]
          }
        }
      ]);
    });

    it('should make a well-formed request object for multi-format ad unit', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.usePrebidSizes').returns(true);
      const request = spec.buildRequests([multiFormatBidRequest], multiFormatBidderRequest)[0];
      expect(request).to.be.an('object');
      expect(request.method).to.equal(METHOD);
      expect(request.url).to.equal(AD_SERVER_URL);
      expect(request.bidderRequest).to.deep.equal(multiFormatBidderRequest);

      const payload = JSON.parse(request.data);
      expect(payload).to.be.an('object');
      expect(payload.imp).to.deep.equal([
        {
          id: '33e9500b21129f',
          native: {
            request: '{"assets":[{"id":3,"required":1,"data":{"type":2}}]}',
            ver: '1.2'
          },
          secure: 0,
          ext: {
            bidder: {
              placementId: 1053688,
            }
          },
          video: {
            placement: OUTSTREAM_TYPE,
            w: 640,
            h: 480,
            mimes: ['video/mp4'],
          },
          banner: {
            format: [
              {w: 300, h: 250},
              {w: 160, h: 600},
            ]
          }
        }
      ]);
    });

    it('should make a well-formed native request', function () {
      const payload = JSON.parse(spec.buildRequests([nativeBidRequest])[0].data);
      expect(payload.imp[0].native).to.deep.equal({
        ver: '1.2',
        request: '{\"assets\":[{\"id\":0,\"required\":1,\"title\":{\"len\":140}},{\"id\":3,\"required\":1,\"data\":{\"type\":2}}]}'
      });
    });

    it('should not make native request when nativeParams is undefined', function () {
      const request = deepClone(nativeBidRequest);
      delete request.nativeParams;
      const payload = JSON.parse(spec.buildRequests([request])[0].data);
      expect(payload.imp[0].native).to.not.exist;
    });

    it('should not make native request when no assets', function () {
      const request = deepClone(nativeBidRequest);
      request.nativeParams = {};
      const payload = JSON.parse(spec.buildRequests([request])[0].data);
      expect(payload.imp[0].native).to.not.exist;
    });

    it('should make a well-formed native request', function () {
      const payload = JSON.parse(spec.buildRequests([nativeBidRequest])[0].data);
      expect(payload.imp[0].native).to.deep.equal({
        ver: '1.2',
        request: '{\"assets\":[{\"id\":0,\"required\":1,\"title\":{\"len\":140}},{\"id\":3,\"required\":1,\"data\":{\"type\":2}}]}'
      });
    });

    it('should not make native request when nativeParams is undefined', function () {
      const request = deepClone(nativeBidRequest);
      delete request.nativeParams;
      const payload = JSON.parse(spec.buildRequests([request])[0].data);
      expect(payload.imp[0].native).to.not.exist;
    });

    it('should not make native request when no assets', function () {
      const request = deepClone(nativeBidRequest);
      request.nativeParams = {};
      const payload = JSON.parse(spec.buildRequests([request])[0].data);
      expect(payload.imp[0].native).to.not.exist;
    });

    it('should set placementKey and publisherId for smart tags', function () {
      const payload = JSON.parse(spec.buildRequests([simpleSmartTagBidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].ext.bidder.publisherId).to.equal(1032);
      expect(payload.imp[0].ext.bidder.placementKey).to.equal('data_team_test_hb_smoke_test');
    });

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
      const bidRequest = Object.assign({}, simpleBidRequest);
      getConfigStub = sinon.stub(config, 'getConfig').returns('JPY');
      const payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.cur).to.deep.equal(['JPY']);
    });

    it('should add bid floor', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      let payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      // Floor price currency shouldn't be populated without a floor price
      expect(payload.imp[0].bidfloorcur).to.not.exist;

      // Default floor price currency
      bidRequest.params.bidFloor = 0.05;
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloor).to.equal(0.05);
      expect(payload.imp[0].bidfloorcur).to.equal('USD');

      // Floor price currency
      bidRequest.params.bidFloorCur = 'eUR';
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloor).to.equal(0.05);
      expect(payload.imp[0].bidfloorcur).to.equal('EUR');

      // getFloor defined -> use it over bidFloor
      let getFloorResponse = { currency: 'USD', floor: 3 };
      bidRequest.getFloor = () => getFloorResponse;
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].bidfloor).to.equal(3);
      // expect(payload.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should add GDPR consent string', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequestGdpr)[0].data);
      expect(payload.regs.ext.gdpr).to.exist.and.to.equal(1);
      expect(payload.user.ext.consent).to.equal('CONSENT');
      expect(payload.user.ext.consented_providers_settings.consented_providers).to.exist.and.to.deep.equal([1, 35, 41, 101]);
    });

    it('should not add consented providers when empty', function () {
      const bidderRequestGdprEmptyAddtl = deepClone(bidderRequestGdpr);
      bidderRequestGdprEmptyAddtl.gdprConsent.addtlConsent = '1~';
      const bidRequest = Object.assign({}, simpleBidRequest);
      const payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequestGdprEmptyAddtl)[0].data);
      expect(payload.user.ext.consented_providers_settings).to.not.exist;
    });

    it('should add CCPA consent string', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const request = spec.buildRequests([bidRequest], {...bidderRequest, ...{ uspConsent: '1YYY' }});
      const payload = JSON.parse(request[0].data);
      expect(payload.regs.ext.us_privacy).to.equal('1YYY');
    });

    it('should add COPPA flag', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('coppa').returns(true);
      let bidRequest = Object.assign({}, simpleBidRequest);
      let payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequestGdpr)[0].data);
      expect(payload.regs.coppa).to.equal(1);
      getConfigStub.withArgs('coppa').returns(false);
      bidRequest = Object.assign({}, simpleBidRequest);
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequestGdpr)[0].data);
      expect(payload.regs.coppa).to.equal(0);
    });

    it('should add referrer', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const request = spec.buildRequests([bidRequest], bidderRequestReferrer)[0];
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

    it('should add correct placement value for instream and outstream video', function () {
      let bidRequest = deepClone(simpleBidRequest);
      let payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].video).to.not.exist;

      bidRequest = deepClone(simpleBidRequest);
      bidRequest.mediaTypes = {
        video: {
          context: 'instream',
          playerSize: [640, 480]
        }
      };
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].video.placement).to.exist.and.equal(1);
      bidRequest.mediaTypes.video.context = 'outstream';
      payload = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
      expect(payload.imp[0].video.placement).to.exist.and.equal(3);
    });

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
        h: 640,
        placement: INSTREAM_TYPE,
      };
      bidRequest.params.video = videoParams;
      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video).to.deep.equal(videoParams);
    });

    it('should set video playerSize over video params', () => {
      const bidRequest = deepClone(instreamBidRequest);
      bidRequest.params.video = {
        w: 1024, h: 640
      }
      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video.h).equal(480);
      expect(payload.imp[0].video.w).equal(640);
    });

    it('should set skip params only if skip=1', function() {
      const bidRequest = deepClone(instreamBidRequest);
      // 1
      const videoTest = {
        skip: 1,
        skipmin: 5,
        skipafter: 30
      }
      bidRequest.params.video = videoTest;
      let request = spec.buildRequests([bidRequest])[0];
      let payload = JSON.parse(request.data);
      expect(payload.imp[0].video.skip).to.equal(1);
      expect(payload.imp[0].video.skipmin).to.equal(5);
      expect(payload.imp[0].video.skipafter).to.equal(30);

      // 0 - leave out skipmin and skipafter
      videoTest.skip = 0;
      bidRequest.params.video = videoTest;
      request = spec.buildRequests([bidRequest])[0];
      payload = JSON.parse(request.data);
      expect(payload.imp[0].video.skip).to.equal(0);
      expect(payload.imp[0].video.skipmin).to.not.exist;
      expect(payload.imp[0].video.skipafter).to.not.exist;

      // other
      videoTest.skip = 'blah';
      bidRequest.params.video = videoTest;
      request = spec.buildRequests([bidRequest])[0];
      payload = JSON.parse(request.data);
      expect(payload.imp[0].video.skip).to.not.exist;
      expect(payload.imp[0].video.skipmin).to.not.exist;
      expect(payload.imp[0].video.skipafter).to.not.exist;
    });

    it('should ignore invalid/unexpected video params', function() {
      const bidRequest = deepClone(instreamBidRequest);
      // 1
      const videoTest = {
        skip: 1,
        skipmin: 5,
        skipafter: 30
      }
      const videoTestInvParam = Object.assign({}, videoTest);
      videoTestInvParam.blah = 1;
      bidRequest.params.video = videoTestInvParam;
      let request = spec.buildRequests([bidRequest])[0];
      let payload = JSON.parse(request.data);
      expect(payload.imp[0].video.blah).not.to.exist;
    });

    it('should set video params for outstream', function() {
      const bidRequest = deepClone(outstreamBidRequest);
      bidRequest.params.video = videoParams;
      const request = spec.buildRequests([bidRequest])[0];
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video).to.deep.equal({...{
        mimes: ['video/mp4'],
        placement: OUTSTREAM_TYPE,
        w: bidRequest.mediaTypes.video.playerSize[0],
        h: bidRequest.mediaTypes.video.playerSize[1],
      },
      ...videoParams});
    });
    //
    it('should set video params for multi-format', function() {
      const bidRequest = deepClone(multiFormatBidRequest);
      bidRequest.params.video = videoParams;
      const request = spec.buildRequests([bidRequest])[0];
      const payload = JSON.parse(request.data);
      const testVideoParams = Object.assign({
        placement: OUTSTREAM_TYPE,
        w: 640,
        h: 480,
        mimes: ['video/mp4'],
      }, videoParams);
      expect(payload.imp[0].video).to.deep.equal(testVideoParams);
    });

    it('should add schain', function () {
      const schain = '{"ver":"1.0","complete":1,"nodes":[{"asi":"headerlift.com","sid":"xyz","hp":1}]}';
      const bidRequest = Object.assign({}, simpleBidRequest);
      bidRequest.schain = schain;
      const request = spec.buildRequests([bidRequest], bidderRequestReferrer)[0];
      const payload = JSON.parse(request.data);
      expect(payload.source.ext.schain).to.equal(schain);
    });

    it('should add eids', function () {
      const userId = { id5id:	{ uid: '1111' } };
      const expectedUserObject = { ext: { eids: [{
        source: 'id5-sync.com',
        uids: [{
          atype: 1,
          id: '1111'
        }]
      }]}};
      const bidRequest = Object.assign({}, simpleBidRequest);
      bidRequest.userId = userId;
      const request = spec.buildRequests([bidRequest], bidderRequestReferrer)[0];
      const payload = JSON.parse(request.data);
      expect(payload.user).to.deep.equal(expectedUserObject);
    });

    it('should return 2 requests', function () {
      const requests = spec.buildRequests([
        simpleBidRequest,
        simpleSmartTagBidRequest
      ], bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(2);
      expect(requests[0].bidderRequest).to.deep.equal(bidderRequest);
      expect(requests[1].bidderRequest).to.deep.equal(bidderRequest);
    });

    it('should return one request in a single request mode', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.singleRequest').returns(true);
      const requests = spec.buildRequests([ simpleBidRequest, instreamBidRequest ], bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal(AD_SERVER_URL);
      const request = JSON.parse(requests[0].data);
      expect(request.imp.length).to.equal(2);
      expect(request.imp[0].banner).to.exist;
      expect(request.imp[1].video).to.exist;
    });

    it('should create one request per endpoint in a single request mode', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.singleRequest').returns(true);
      const requests = spec.buildRequests([ extendBidRequest, simpleBidRequest, instreamBidRequest ], bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(2);
      expect(requests[0].url).to.equal(EXTEND_URL);
      expect(requests[1].url).to.equal(AD_SERVER_URL);
      const adServerRequest = JSON.parse(requests[1].data);
      expect(adServerRequest.imp.length).to.equal(2);
      expect(adServerRequest.imp[0].banner).to.exist;
      expect(adServerRequest.imp[1].video).to.exist;
    });

    it('should set Prebid sizes in bid request', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.usePrebidSizes').returns(true);
      const request = spec.buildRequests([simpleBidRequest], bidderRequest)[0];
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].banner).to.deep.equal({
        format: [
          { w: 300, h: 250 },
          { w: 160, h: 600 }
        ]
      });
    });

    it('should not add single size filter when using Prebid sizes', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.usePrebidSizes').returns(true);
      const bidRequest = Object.assign({}, simpleBidRequest);
      const size = {
        w: 800,
        h: 600
      };
      bidRequest.params.size = size;
      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].banner).to.deep.equal({
        format: [
          { w: 300, h: 250 },
          { w: 160, h: 600 }
        ]
      });
    });

    it('should set GPID and Instl Signal', function () {
      const bidRequest = Object.assign({
        ortb2Imp: {
          instl: true,
          ext: {
            gpid: '/123/ID-FORMAT',
            data: {
              pbadslot: '/123/ID-FORMAT-PBADSLOT',
              adserver: {
                adslot: '/123/ID-FORMAT-ADSERVER-PB-ADSLOT',
              }
            }
          },
        }
      }, simpleBidRequest);
      let request = spec.buildRequests([bidRequest], bidderRequest)[0];
      let payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.gpid).to.equal('/123/ID-FORMAT');
      expect(payload.imp[0].instl).to.equal(1);

      delete bidRequest.ortb2Imp.ext.gpid;
      request = spec.buildRequests([bidRequest], bidderRequest)[0];
      payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.gpid).to.equal('/123/ID-FORMAT-PBADSLOT');

      delete bidRequest.ortb2Imp.ext.data.pbadslot;
      request = spec.buildRequests([bidRequest], bidderRequest)[0];
      payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.gpid).to.equal('/123/ID-FORMAT-ADSERVER-PB-ADSLOT');

      delete bidRequest.ortb2Imp.ext.data.adserver;
      delete bidRequest.ortb2Imp.instl;
      request = spec.buildRequests([bidRequest], bidderRequest)[0];
      payload = JSON.parse(request.data);
      expect(payload.imp[0].ext.gpid).to.not.exist;
      expect(payload.imp[0].instl).to.not.exist;
    });

    it('should not set site when app is defined in FPD', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('ortb2.app').returns({ content: 'XYZ' });
      let request = spec.buildRequests([simpleBidRequest], bidderRequest)[0];
      let payload = JSON.parse(request.data);
      expect(payload.site).does.not.exist;
      expect(payload.app).does.exist;
      expect(payload.app.content).does.exist.and.equal('XYZ');
    });

    it('should not set site when app is defined in CONFIG', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('app').returns({ content: 'XYZ' });
      let request = spec.buildRequests([simpleBidRequest], bidderRequest)[0];
      let payload = JSON.parse(request.data);
      expect(payload.site).does.not.exist;
      expect(payload.app).does.exist;
      expect(payload.app.content).does.exist.and.equal('XYZ');
    });

    it('should set correct site params', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('site').returns({
        content: 'XYZ',
        page: 'https://improveditigal.com/',
        domain: 'improveditigal.com'
      });
      let request = spec.buildRequests([simpleBidRequest], bidderRequestReferrer)[0];
      let payload = JSON.parse(request.data);
      expect(payload.site.content).does.exist.and.equal('XYZ');
      expect(payload.site.page).does.exist.and.equal('https://improveditigal.com/');
      expect(payload.site.domain).does.exist.and.equal('improveditigal.com');
      getConfigStub.reset();

      request = spec.buildRequests([simpleBidRequest], bidderRequestReferrer)[0];
      payload = JSON.parse(request.data);
      expect(payload.site.content).does.not.exist;
      expect(payload.site.page).does.exist.and.equal('https://blah.com/test.html');
      expect(payload.site.domain).does.exist.and.equal('blah.com');

      getConfigStub.withArgs('ortb2.site').returns({
        content: 'ZZZ',
      });
      request = spec.buildRequests([simpleBidRequest], bidderRequestReferrer)[0];
      payload = JSON.parse(request.data);
      expect(payload.site.content).does.exist.and.equal('ZZZ');
      expect(payload.site.page).does.exist.and.equal('https://blah.com/test.html');
      expect(payload.site.domain).does.exist.and.equal('blah.com');
    });

    it('should set pageUrl as site param', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('pageUrl').returns('https://improvidigital.com/test-page');
      let request = spec.buildRequests([simpleBidRequest], bidderRequestReferrer)[0];
      let payload = JSON.parse(request.data);
      expect(payload.site.page).does.exist.and.equal('https://improvidigital.com/test-page');
      expect(payload.site.domain).does.exist.and.equal('improvidigital.com');
      getConfigStub.reset();

      getConfigStub.withArgs('pageUrl').returns(undefined);
      request = spec.buildRequests([simpleBidRequest], bidderRequestReferrer)[0];
      payload = JSON.parse(request.data);
      expect(payload.site.page).does.exist.and.equal('https://blah.com/test.html');
      expect(payload.site.domain).does.exist.and.equal('blah.com');
    });

    it('should set site when app not available', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('app').returns(undefined);
      let request = spec.buildRequests([simpleBidRequest], bidderRequest)[0];
      let payload = JSON.parse(request.data);
      expect(payload.site).does.exist;
      expect(payload.app).does.not.exist;
    });

    it('should set extend params when extend mode enabled from global configuration', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      const bannerRequest = deepClone(simpleBidRequest);
      const keyValues = { testKey: [ 'testValue' ] };
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
        keyValues
      });
      expect(payload.imp[0].ext.prebid.storedrequest.id).to.equal('1053688');
      // video
      payload = JSON.parse(requests[1].data);
      expect(payload.imp[0].ext.bidder).to.not.exist;
      expect(payload.imp[0].ext.prebid.bidder.improvedigital.placementId).to.equal(123456);
      expect(payload.imp[0].ext.prebid.storedrequest.id).to.equal('123456');
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
      expect(request.url).to.equal(AD_SERVER_URL);

      const requests = spec.buildRequests([bidRequest, instreamBidRequest], { bids: [bidRequest, instreamBidRequest] });
      expect(requests.length).to.equal(2);
      expect(requests[0].url).to.equal(AD_SERVER_URL);
      expect(requests[1].url).to.equal(EXTEND_URL);
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
              'exp': 120,
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
              'exp': 120,
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
              'exp': 120,
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
              'exp': 120,
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
              'exp': 120,
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

  const serverResponseRazr = {
    body: {
      'id': '2adac6a5fe04df',
      'cur': 'EUR',
      'ext': {
        'improvedigital': {
          'sync': [
            'https://d5p.de17a.com/getuid/improve_digital?publisher_user_id=ce26f11e-567a-4eb7-bf94-51752e293ca5&publisher_dsp_id=61&publisher_call_type=redirect&gdpr=1&gdpr_consent=CPU22FrPU22FrAcABBENCDCsAP_AAH_AAChQIltf_X__b3_j-_5_f_t0eY1P9_7_v-0zjhfdt-8N3f_X_L8X42M7vF36pq4KuR4Eu3LBIQdlHOHcTUmw6okVrzPsbk2cr7NKJ7PEmnMbO2dYGH9_n93TuZKY7______z_v-v_v____f_7-3_3__5_3---_e_V_99zLv9____39nP___9v-_9_____4IhgEmGpeQBdmWODJtGlUKIEYVhIdAKACigGFoisIHVwU7K4CfUELABCagJwIgQYgowYBAAIJAEhEQEgB4IBEARAIAAQAqwEIACNgEFgBYGAQACgGhYgRQBCBIQZHBUcpgQFSLRQT2ViCUHexphCGWeBFAo_oqEBGs0QLAyEhYOY4AkBLxZIHmKF8gAAAAA.f_gAD_gAAAAA&publisher_redirecturl=https://euw-ice.360yield.com/match'
          ]
        }
      },
      'seatbid': [
        {
          'bid': [
            {
              'ext': {
                'improvedigital': {
                  'line_item_id': 410573,
                  'bidder_id': 0,
                  'brand_name': '',
                  'buying_type': 'classic',
                  'agency_id': '0'
                }
              },
              'exp': 120,
              'crid': '544063',
              'price': 1.9199364935359489,
              'id': '1fcf4dd8-a783-48ed-b59c-8fc8eeccb024',
              'adomain': [
                'improvedigital.com'
              ],
              'w': 970,
              'impid': '33e9500b21129f',
              'h': 250,
              'adm': '<html><body style="margin:0%"><!-- Integration Test Camapigns -->\n<!-- Pageskin Plus Desktop -->\n<!-- Desktop -->\n<!-- Size: 970x250 -->\n<!-- DSP: Other -->\n\n<script async src="https://cdn.inskinad.com/isfe/tags/dsp.js"></script>\n<script type="text/javascript">\n      (function() {\n        var ns = window.inskin = window.inskin || {};\n        ns.dsp = ns.dsp || [];\n        ns.dsp.push({\n          uri: "razr://inskin/pageskinplus?eyJwbHJfTWFuaWZlc3RQYXRoIjoicHNfY3JlYXRvcngvZGlzdC82MDQwYjg3NWQ5ZmZkNTAwMWExZjQxNzAvbWFuaWZlc3QuanNvbiIsImkiOiJodHRwczovL2Nkbi5pbnNraW5hZC5jb20vQ3JlYXRpdmVTdG9yZS9wc19jcmVhdG9yeC9maWxlcy82MDQwYWI1NGQ5ZmZkNTAwMWExZjQxNjdfMTYzNjcxNDEzNTU4MS85NzB4MjUwLmpwZyIsImwiOiJodHRwczovL3d3dy5pbnNraW5tZWRpYS5jb20vIiwic2l6ZSI6Ijk3MHgyNTAiLCJkc3AiOiJPdGhlciIsImNyZWF0aXZlX2lkIjoiNTAwMDAwMDA2NSIsIm1hc3MiOnsiZW5kcG9pbnQiOiJodHRwczovL2Nkbi5pbnNraW5hZC5jb20vaXNmZS90YWdzL2lwdC5qcyJ9fQ==&gdpr=1&gdpr_consent=CPU22FrPU22FrAcABBENCDCsAP_AAH_AAChQIltf_X__b3_j-_5_f_t0eY1P9_7_v-0zjhfdt-8N3f_X_L8X42M7vF36pq4KuR4Eu3LBIQdlHOHcTUmw6okVrzPsbk2cr7NKJ7PEmnMbO2dYGH9_n93TuZKY7______z_v-v_v____f_7-3_3__5_3---_e_V_99zLv9____39nP___9v-_9_____4IhgEmGpeQBdmWODJtGlUKIEYVhIdAKACigGFoisIHVwU7K4CfUELABCagJwIgQYgowYBAAIJAEhEQEgB4IBEARAIAAQAqwEIACNgEFgBYGAQACgGhYgRQBCBIQZHBUcpgQFSLRQT2ViCUHexphCGWeBFAo_oqEBGs0QLAyEhYOY4AkBLxZIHmKF8gAAAAA.f_gAD_gAAAAA&c=https%3A%2F%2Feuw-ice.360yield.com%2Fclick%2FicS49rk9QboLEcCd2ow-WFM9F-uuu.xuH-D.JKa4FBO3Vxze.r6Uf644oAHkoUAxfF-CS-TZMM5vuXryUCtFZY.0iu4Uva6MWyjId5sB-BkTdMYZonq6EFX7D--DhmqReLb-AXr9GCFaLePzLe3jG0QYG.-ZsKp9nMiVsUXOoeCZvH.DTvtGo1gvOi3rVoeBw7XaRuwtcfhfr7VPrrWzovbtyMrMZsWzMIbU-WQZ0qYJSXHRn0PECOMxw.kHptceQ8-.TPHiSdW2O-Mk97IgJ5GNdnPwqO3pc8TXzaWvxtuKywsYQ-8Fk5o4FaUSFh1wa2fQEvUnh1A5sOgB.F.D8PaDrLofK3FfWxAa0hLcsi3nO2DYX-oppQZ1r2qYsaUlrSp-yVVSw.PoAQdSFCgrZnY-j7fpezyE.DBSsabWkCdSuMFnmaGUbToYca5PgblpDAxTk.fn13QijCoq3sVMQ.lgbUEdaruATWGbviYrO8tOYThvOTO.U1XqP0lE-kMNQOM6912RGYH9wEavr-xI4QRwG6Qa.ms5EJG-gPq8%2F%2F"\n        });\n      })();\n</script><noscript class="MOAT-improvedigitaldisplay945272226933?moatClientLevel1=5279&amp;moatClientLevel2=187354&amp;moatClientLevel3=410573&amp;moatClientLevel4=544063&amp;moatClientSlicer1=291098&amp;moatClientSlicer2=22655158&amp;zMoatRTBADV=improvedigital.com&amp;zMoatRTBCR=&amp;zMoatReferrer=localhost&amp;zMoatSZ=970x250&amp;zMoatBundle="></noscript>\n<script src="https://z.moatads.com/improvedigitaldisplay945272226933/moatad.js#moatClientLevel1=5279&moatClientLevel2=187354&moatClientLevel3=410573&moatClientLevel4=544063&moatClientSlicer1=291098&moatClientSlicer2=22655158&zMoatRTBADV=improvedigital.com&zMoatRTBCR=&zMoatReferrer=localhost&zMoatSZ=970x250&zMoatBundle=" type="text/javascript"></script><img src="https://euw-ice.360yield.com/imp_pixel?ic=icS49pIfpuQmwz1qwTyow94dtPYFJ1jd5AmVkPxrq5AiMd6kj6SEjlT305kiOHKmTXMmbZXHwoVeXjv3RYo.3Y2aERPh6YXuUAUpd9q4kwk81vxha7.45yIGHQewfVQasIsWALCaw..GbNmjZcezJcWCYCyOVobUgm2IQCRNqm8eTb5YZIPQtYU5SB6P.f3kf7J64jQuqILOmuizstXUQQeJM.S0F12arPFAPswnbIm-mZHGqMEG4ShDG5LqIAwBwWTAp71MHD9ztPR34GkXnVd8Ub-OErWFbH5z6g-150kngZ90er.RUXOiFCQNK-69nU0NrzWNsZYCSg.c5xZ39RsTUOOROb52aTRuHn4nd--2FnI5EMnjBV..-KZVX6b33J0qHaqyO8Xfp7JwtSQ2pmk.yHziRMTAl2K0rm0Afn5O.SXV5GT.b7Aua8soa.YGd.h9R.FC34NwClsGgD9OalhEhyqnWZoHyLFUdeYnw9EljptBDIMkFQ9FXP0mJsqZCMWZXE20zGW24QmsWqNelt0Hqs0r7V-ca.WvrYxJ" alt=" " style="display:none"/><improvedigital_ad_output_information tp_id="" buyer_id="0" rtb_advertiser="" campaign_id="187354" line_item_id="410573" creative_id="544063" crid="0" placement_id="22655158"></improvedigital_ad_output_information></body></html>',
              'cid': '187354'
            }
          ],
          'seat': 'improvedigital'
        }
      ]
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
        meta: {
          advertiserDomains: []
        }
      }
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
        meta: {
          advertiserDomains: []
        }
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

    it('should return a well-formed display bid', function () {
      const bids = spec.interpretResponse(serverResponse, {bidderRequest});
      expect(bids).to.deep.equal(expectedBid);
    });

    it('should return a well-formed display bid for multi-format ad unit', function () {
      const bids = spec.interpretResponse(serverResponse, {bidderRequest: multiFormatBidderRequest});
      expect(bids).to.deep.equal(expectedBid);
    });

    it('should return two bids', function () {
      const bids = spec.interpretResponse(serverResponseTwoBids, {bidderRequest});
      expect(bids).to.deep.equal(expectedTwoBids);
    });

    it('should set dealId correctly', function () {
      const response = deepClone(serverResponse);
      let bids;

      delete response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'deal_id';
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].dealId).to.not.exist;

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      delete response.body.seatbid[0].bid[0].ext.improvedigital.buying_type;
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].dealId).to.not.exist;

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'rtb';
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].dealId).to.not.exist;

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'classic';
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].dealId).to.equal(268515);

      response.body.seatbid[0].bid[0].ext.improvedigital.line_item_id = 268515;
      response.body.seatbid[0].bid[0].ext.improvedigital.buying_type = 'deal_id';
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].dealId).to.equal(268515);
    });

    it('should set currency', function () {
      const response = deepClone(serverResponse);
      response.body.cur = 'eur';
      const bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].currency).to.equal('EUR');
    });

    it('should return empty array for bad response or no price', function () {
      let response = deepClone(serverResponse);
      let bids;

      // Price missing or 0
      response.body.seatbid[0].bid[0].price = 0;
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids).to.deep.equal([]);
      delete response.body.seatbid[0].bid[0];
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids).to.deep.equal([]);
      response.body.seatbid[0].bid[0] = [];
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids).to.deep.equal([]);

      // errorCode present
      response = deepClone(serverResponse);
      response.body.seatbid[0].bid[0].errorCode = undefined;
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids).to.deep.equal([]);

      // adm and native missing
      response = deepClone(serverResponse);
      delete response.body.seatbid[0].bid[0].adm;
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids).to.deep.equal([]);
      response.body.seatbid[0].bid[0].adm = null;
      bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids).to.deep.equal([]);
    });

    it('should set netRevenue', function () {
      const response = deepClone(serverResponse);
      response.body.seatbid[0].bid[0].ext.improvedigital.is_net = true;
      const bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].netRevenue).to.equal(true);
    });

    it('should set advertiserDomains', function () {
      const adomain = ['domain.com'];
      const response = deepClone(serverResponse);
      response.body.seatbid[0].bid[0].adomain = adomain;
      const bids = spec.interpretResponse(response, {bidderRequest});
      expect(bids[0].meta.advertiserDomains).to.equal(adomain);
    });
    //
    // Native ads
    it('should return a well-formed native ad bid', function () {
      const bids = spec.interpretResponse(serverResponseNative, {bidderRequest: nativeBidderRequest});
      // Verify Native Response
      expect(bids[0].native).to.exist;
      const nativeBid = bids[0].native;
      const nativeResp = JSON.parse(serverResponseNative.body.seatbid[0].bid[0].adm);
      // Verify Native Response
      expect(nativeBid.clickUrl).to.exist.and.equal(nativeResp.link.url);
      expect(nativeBid.impressionTrackers).to.exist.and.deep.equal(nativeResp.imptrackers);
      expect(nativeBid.javascriptTrackers).to.exist.and.deep.equal(nativeResp.jstracker);

      // Verify Assets
      expect(nativeBid.title).to.exist.and.equal('Sample Prebid Test Title');
      expect(nativeBid.sponsoredBy).to.exist.and.equal('ImproveDigital');
      expect(nativeBid.body).to.exist.and.equal('Test content.');
    });

    it('should return a well-formed native bid for multi-format ad unit', function () {
      const bids = spec.interpretResponse(serverResponseNative, {bidderRequest: multiFormatBidderRequest});
      expect(bids[0].mediaType).to.equal(NATIVE);
    });

    // Video
    it('should return a well-formed instream video bid', function () {
      const bids = spec.interpretResponse(serverResponseVideo, {bidderRequest: instreamBidderRequest});
      expect(bids).to.deep.equal(expectedBidInstreamVideo);
    });

    it('should return a well-formed outstream video bid', function () {
      const bids = spec.interpretResponse(serverResponseVideo, {bidderRequest: outstreamBidderRequest});
      expect(bids[0].renderer).to.exist;
      delete (bids[0].renderer);
      expect(bids).to.deep.equal(expectedBidOutstreamVideo);
    });

    it('should return a well-formed outstream video bid for multi-format ad unit', function () {
      const videoResponse = deepClone(serverResponseVideo);
      let bids = spec.interpretResponse(videoResponse, {bidderRequest: multiFormatBidderRequest});
      expect(bids[0].renderer).to.exist;
      delete (bids[0].renderer);
      expect(bids).to.deep.equal(expectedBidOutstreamVideo);

      videoResponse.body.seatbid[0].bid[0].adm = '<vAst';
      bids = spec.interpretResponse(videoResponse, {bidderRequest: multiFormatBidderRequest});
      expect(bids[0].mediaType).to.equal(VIDEO);

      videoResponse.body.seatbid[0].bid[0].adm = '<?xml';
      bids = spec.interpretResponse(videoResponse, {bidderRequest: multiFormatBidderRequest});
      expect(bids[0].mediaType).to.equal(VIDEO);
    });

    it('should not affect non-RAZR bids', function () {
      const bids = spec.interpretResponse(serverResponse, {bidderRequest});
      expect(bids[0].renderer).to.not.exist;
    });

    it('should detect RAZR bids', function () {
      const bids = spec.interpretResponse(serverResponseRazr, {bidderRequest});
      expect(bids[0].renderer).to.exist;
    });
  });

  describe('getUserSyncs', function () {
    const serverResponses = [ serverResponse, serverResponseTwoBids ];
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
      let syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses, null, uspConsent);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: `${basicIframeSyncUrl}&us_privacy=${uspConsent}` }]);
    });

    it('should return iframe user sync for the adunit extend mode if iframe mode enabled', function () {
      // buildRequests() sets spec.syncStore vars
      spec.buildRequests([simpleBidRequest, extendBidRequest]);
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: basicIframeSyncUrl + '&pbs=1' }]);
    });

    it('should return iframe user sync for the global extend mode if iframe mode enabled', function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.extend').returns(true);
      // buildRequests() sets spec.syncStore vars
      spec.buildRequests([simpleBidRequest]);
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: basicIframeSyncUrl + '&pbs=1' }]);
    });
  });
});
