import { expect } from 'chai';
import {
  _features,
  internal as adagio,
  adagioScriptFromLocalStorageCb,
  getAdagioScript,
  storage,
  setExtraParam,
  spec,
  ENDPOINT,
  VERSION,
  RENDERER_URL,
  GlobalExchange
} from '../../../modules/adagioBidAdapter.js';
import { loadExternalScript } from '../../../src/adloader.js';
import * as utils from '../../../src/utils.js';
import { config } from '../../../src/config.js';
import { NATIVE } from '../../../src/mediaTypes.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { executeRenderer } from '../../../src/Renderer.js';

const BidRequestBuilder = function BidRequestBuilder(options) {
  const defaults = {
    request: {
      auctionId: '4fd1ca2d-846c-4211-b9e5-321dfe1709c9',
      adUnitCode: 'adunit-code',
      bidder: 'adagio'
    },
    params: {
      organizationId: '1000',
      placement: 'PAVE_ATF',
      site: 'SITE-NAME',
      adUnitElementId: 'gpt-adunit-code'
    },
    sizes: [[300, 250], [300, 600]],
  };

  const request = {
    ...defaults.request,
    ...options
  };

  this.withParams = (options) => {
    request.params = {
      ...defaults.params,
      ...options
    };
    return this;
  };

  this.build = () => request;
};

const BidderRequestBuilder = function BidderRequestBuilder(options) {
  const defaults = {
    bidderCode: 'adagio',
    auctionId: '4fd1ca2d-846c-4211-b9e5-321dfe1709c9',
    bidderRequestId: '7g36s867Tr4xF90X',
    timeout: 3000,
    refererInfo: {
      numIframes: 0,
      reachedTop: true,
      referer: 'http://test.io/index.html?pbjs_debug=true'
    }
  };

  const request = {
    ...defaults,
    ...options
  };

  this.build = () => request;
};

describe('Adagio bid adapter', () => {
  let adagioMock;
  let utilsMock;
  let sandbox;

  const fixtures = {
    getElementById(width, height, x, y) {
      const obj = {
        x: x || 800,
        y: y || 300,
        width: width || 300,
        height: height || 250,
      };

      return {
        ...obj,
        getBoundingClientRect: () => {
          return {
            width: obj.width,
            height: obj.height,
            left: obj.x,
            top: obj.y,
            right: obj.x + obj.width,
            bottom: obj.y + obj.height
          };
        }
      };
    }
  };

  // safeFrame implementation
  const $sf = {
    ext: {
      geom: function() {}
    }
  };

  beforeEach(() => {
    window.ADAGIO = {};
    window.ADAGIO.adUnits = {};
    window.ADAGIO.pbjsAdUnits = [];
    window.ADAGIO.queue = [];
    window.ADAGIO.versions = {};
    window.ADAGIO.versions.adagioBidderAdapter = VERSION;
    window.ADAGIO.pageviewId = 'dda61753-4059-4f75-b0bf-3f60bd2c4d9a';

    GlobalExchange.clearFeatures();
    GlobalExchange.clearExchangeData();

    adagioMock = sinon.mock(adagio);
    utilsMock = sinon.mock(utils);

    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    window.ADAGIO = undefined;

    adagioMock.restore();
    utilsMock.restore();

    sandbox.restore();
  });

  describe('get and set params at adUnit level from global Prebid configuration', function() {
    it('should set params get from ortb2 config or bidderSettings. Priority to bidderSetting', function() {
      const bid = new BidRequestBuilder().build();

      sandbox.stub(config, 'getConfig').callsFake(key => {
        const config = {
          adagio: {
            pagetype: 'article'
          },
          ortb2: {
            site: {
              ext: {
                data: {
                  environment: 'desktop',
                  pagetype: 'abc'
                }
              }
            }
          }
        };
        return utils.deepAccess(config, key);
      });

      setExtraParam(bid, 'environment');
      expect(bid.params.environment).to.equal('desktop');

      setExtraParam(bid, 'pagetype')
      expect(bid.params.pagetype).to.equal('article');
    });

    it('should use the adUnit param unit if defined', function() {
      const bid = new BidRequestBuilder({ params: { pagetype: 'article' } }).build();
      sandbox.stub(config, 'getConfig').withArgs('adagio').returns({
        pagetype: 'ignore-me'
      });
      setExtraParam(bid, 'pagetype')
      expect(bid.params.pagetype).to.equal('article');
    });
  })

  describe('isBidRequestValid()', function() {
    it('should return true when required params have been found', function() {
      const bid = new BidRequestBuilder().withParams().build();

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should compute organizationId and site params from global BidderSettings config', function() {
      sandbox.stub(adagio, 'getRefererInfo').returns({ reachedTop: true });
      sandbox.stub(config, 'getConfig').withArgs('adagio').returns({
        siteId: '1000:SITE-NAME'
      });

      const bid = new BidRequestBuilder({
        params: { placement: 'PAVE_ATF' }
      }).build();

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    })

    it('should return false if bid.params is missing', function() {
      sandbox.spy(utils, 'logWarn');
      const bid01 = new BidRequestBuilder().build();

      expect(spec.isBidRequestValid(bid01)).to.equal(false);
      sinon.assert.callCount(utils.logWarn, 1);
    });

    it('should use adUnit code for adUnitElementId and placement params', function() {
      const bid01 = new BidRequestBuilder({ params: {
        organizationId: '1000',
        site: 'site-name',
        useAdUnitCodeAsPlacement: true,
        useAdUnitCodeAsAdUnitElementId: true
      }}).build();

      expect(spec.isBidRequestValid(bid01)).to.equal(true);
      expect(bid01.params.adUnitElementId).to.equal('adunit-code');
      expect(bid01.params.placement).to.equal('adunit-code');
    });

    it('should return false when a required param is missing', function() {
      const bid01 = new BidRequestBuilder({ params: {
        organizationId: '1000',
        placement: 'PAVE_ATF'
      }}).build();

      const bid02 = new BidRequestBuilder({ params: {
        organizationId: '1000',
        site: 'SITE-NAME'
      }}).build();

      const bid03 = new BidRequestBuilder({ params: {
        placement: 'PAVE_ATF',
        site: 'SITE-NAME'
      }}).build();

      sandbox.stub(config, 'getConfig').withArgs('adagio').returns({
        siteId: '1000'
      });

      const bid04 = new BidRequestBuilder({ params: { placement: 'PAVE_ATF' } }).build();

      expect(spec.isBidRequestValid(bid01)).to.equal(false);
      expect(spec.isBidRequestValid(bid02)).to.equal(false);
      expect(spec.isBidRequestValid(bid03)).to.equal(false);
      expect(spec.isBidRequestValid(bid04)).to.equal(false);
    });
  });

  describe('buildRequests()', function() {
    const expectedDataKeys = [
      'id',
      'organizationId',
      'secure',
      'device',
      'site',
      'pageviewId',
      'adUnits',
      'regs',
      'user',
      'schain',
      'prebidVersion',
      'featuresVersion',
      'data'
    ];

    it('groups requests by organizationId', function() {
      const bid01 = new BidRequestBuilder().withParams().build();
      const bid02 = new BidRequestBuilder().withParams().build();
      const bid03 = new BidRequestBuilder().withParams({
        organizationId: '1002'
      }).build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01, bid02, bid03], bidderRequest);

      expect(requests).to.have.lengthOf(2);

      expect(requests[0].data.organizationId).to.equal('1000');
      expect(requests[0].data.adUnits).to.have.lengthOf(2);

      expect(requests[1].data.organizationId).to.equal('1002');
      expect(requests[1].data.adUnits).to.have.lengthOf(1);
    });

    it('should send bid request to ENDPOINT_PB via POST', function() {
      sandbox.stub(adagio, 'getDevice').returns({ a: 'a' });
      sandbox.stub(adagio, 'getSite').returns({ domain: 'adagio.io', 'page': 'https://adagio.io/hb' });
      sandbox.stub(adagio, 'getPageviewId').returns('1234-567');

      const bid01 = new BidRequestBuilder().withParams().build();
      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].options.contentType).to.eq('text/plain');
      expect(requests[0].data).to.have.all.keys(expectedDataKeys);
    });

    it('should enqueue computed features for collect usage', function() {
      sandbox.stub(Date, 'now').returns(12345);

      const bid01 = new BidRequestBuilder().withParams().build();
      const bidderRequest = new BidderRequestBuilder().build();

      adagioMock.expects('enqueue').withArgs(sinon.match({ action: 'features' })).atLeast(1);

      const requests = spec.buildRequests([bid01], bidderRequest);

      expect(requests[0].data).to.have.all.keys(expectedDataKeys);

      adagioMock.verify();
    });

    it('should filter some props in case refererDetection.reachedTop is false', function() {
      const bid01 = new BidRequestBuilder().withParams().build();
      const bidderRequest = new BidderRequestBuilder({
        refererInfo: {
          numIframes: 2,
          reachedTop: false,
          referer: 'http://example.com/iframe1.html',
          stack: [
            null,
            'http://example.com/iframe1.html',
            'http://example.com/iframe2.html'
          ],
          canonicalUrl: ''
        }
      }).build();

      const requests = spec.buildRequests([bid01], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data).to.have.all.keys(expectedDataKeys);
      expect(requests[0].data.adUnits[0].features).to.exist;
      expect(requests[0].data.adUnits[0].features.url).to.not.exist;
    });

    describe('With video mediatype', function() {
      context('Outstream video', function() {
        it('should logWarn if user does not set renderer.backupOnly: true', function() {
          sandbox.spy(utils, 'logWarn');
          const bid01 = new BidRequestBuilder({
            adUnitCode: 'adunit-code-01',
            mediaTypes: {
              banner: { sizes: [[300, 250]] },
              video: {
                context: 'outstream',
                playerSize: [[300, 250]],
                renderer: {
                  url: 'https://url.tld',
                  render: () => true
                }
              }
            },
          }).withParams().build();
          const bidderRequest = new BidderRequestBuilder().build();
          const request = spec.buildRequests([bid01], bidderRequest)[0];

          expect(request.data.adUnits[0].mediaTypes.video.playerName).to.equal('other');
          sinon.assert.calledWith(utils.logWarn, 'Adagio: renderer.backupOnly has not been set. Adagio recommends to use its own player to get expected behavior.');
        });
      });

      it('Update mediaTypes.video with OpenRTB options. Validate and sanitize whitelisted OpenRTB', function() {
        sandbox.spy(utils, 'logWarn');
        const bid01 = new BidRequestBuilder({
          adUnitCode: 'adunit-code-01',
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            video: {
              context: 'outstream',
              playerSize: [[300, 250]],
              mimes: ['video/mp4'],
              api: 5, // will be removed because invalid
              playbackmethod: [7], // will be removed because invalid
            }
          },
        }).withParams({
          // options in video, will overide
          video: {
            skip: 1,
            skipafter: 4,
            minduration: 10,
            maxduration: 30,
            placement: [3],
            protocols: [8]
          }
        }).build();

        const bidderRequest = new BidderRequestBuilder().build();
        const expected = {
          context: 'outstream',
          playerSize: [[300, 250]],
          playerName: 'adagio',
          mimes: ['video/mp4'],
          skip: 1,
          skipafter: 4,
          minduration: 10,
          maxduration: 30,
          placement: [3],
          protocols: [8],
          w: 300,
          h: 250
        };

        const requests = spec.buildRequests([bid01], bidderRequest);
        expect(requests).to.have.lengthOf(1);
        expect(requests[0].data.adUnits[0].mediaTypes.video).to.deep.equal(expected);
        sinon.assert.calledTwice(utils.logWarn.withArgs(sinon.match(new RegExp(/^Adagio: The OpenRTB/))));
      });
    });

    describe('with sChain', function() {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'ssp.test',
          sid: '00001',
          hp: 1
        }]
      };

      it('should add the schain if available at bidder level', function() {
        const bid01 = new BidRequestBuilder({ schain }).withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data).to.have.all.keys(expectedDataKeys);
        expect(requests[0].data.schain).to.deep.equal(schain);
      });

      it('Schain should not be added to the request', function() {
        const bid01 = new BidRequestBuilder().withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.schain).to.not.exist;
      });
    });

    describe('with GDPR', function() {
      const bid01 = new BidRequestBuilder().withParams().build();

      const consentString = 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==';

      const gdprConsentBuilderTCF1 = function gdprConsentBuilderTCF1(applies, allows) {
        return {
          consentString,
          gdprApplies: applies,
          allowAuctionWithoutConsent: allows,
          apiVersion: 1
        };
      };

      const gdprConsentBuilderTCF2 = function gdprConsentBuilderTCF2(applies) {
        return {
          consentString,
          gdprApplies: applies,
          apiVersion: 2
        };
      };

      context('When GDPR applies', function() {
        it('send data.gdpr object to the server from TCF v.1.1 cmp', function() {
          const bidderRequest = new BidderRequestBuilder({
            gdprConsent: gdprConsentBuilderTCF1(true, true)
          }).build();

          const expected = {
            consentString,
            allowAuctionWithoutConsent: 1,
            consentRequired: 1,
            apiVersion: 1
          };

          const requests = spec.buildRequests([bid01], bidderRequest);

          expect(requests[0].data.regs.gdpr).to.deep.equal(expected);
        });

        it('send data.gdpr object to the server from TCF v.2 cmp', function() {
          const bidderRequest = new BidderRequestBuilder({
            gdprConsent: gdprConsentBuilderTCF2(true)
          }).build();

          const expected = {
            consentString,
            allowAuctionWithoutConsent: 0,
            consentRequired: 1,
            apiVersion: 2
          };

          const requests = spec.buildRequests([bid01], bidderRequest);

          expect(requests[0].data.regs.gdpr).to.deep.equal(expected);
        });
      });

      context('When GDPR does not applies', function() {
        it('send data.gdpr object to the server from TCF v.1.1 cmp', function() {
          const bidderRequest = new BidderRequestBuilder({
            gdprConsent: gdprConsentBuilderTCF1(false, true)
          }).build();

          const expected = {
            consentString,
            allowAuctionWithoutConsent: 1,
            consentRequired: 0,
            apiVersion: 1
          };

          const requests = spec.buildRequests([bid01], bidderRequest);

          expect(requests[0].data.regs.gdpr).to.deep.equal(expected);
        });

        it('send data.gdpr object to the server from TCF v.2 cmp', function() {
          const bidderRequest = new BidderRequestBuilder({
            gdprConsent: gdprConsentBuilderTCF2(false)
          }).build();

          const expected = {
            consentString,
            consentRequired: 0,
            allowAuctionWithoutConsent: 0,
            apiVersion: 2
          };

          const requests = spec.buildRequests([bid01], bidderRequest);

          expect(requests[0].data.regs.gdpr).to.deep.equal(expected);
        });
      });

      context('When GDPR is undefined in bidderRequest', function() {
        it('send an empty data.gdpr to the server', function() {
          const bidderRequest = new BidderRequestBuilder().build();
          const requests = spec.buildRequests([bid01], bidderRequest);

          expect(requests[0].data.regs.gdpr).to.be.empty;
        });
      });
    });

    describe('with COPPA', function() {
      const bid01 = new BidRequestBuilder().withParams().build();

      it('should send the Coppa "required" flag set to "1" in the request', function () {
        const bidderRequest = new BidderRequestBuilder().build();

        sinon.stub(config, 'getConfig')
          .withArgs('coppa')
          .returns(true);

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.regs.coppa.required).to.equal(1);

        config.getConfig.restore();
      });
    });

    describe('without COPPA', function() {
      const bid01 = new BidRequestBuilder().withParams().build();

      it('should send the Coppa "required" flag set to "0" in the request', function () {
        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.regs.coppa.required).to.equal(0);
      });
    });

    describe('with USPrivacy', function() {
      const bid01 = new BidRequestBuilder().withParams().build();

      const consent = 'Y11N';

      it('should send the USPrivacy "ccpa.uspConsent" in the request', function () {
        const bidderRequest = new BidderRequestBuilder({
          uspConsent: consent
        }).build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.regs.ccpa.uspConsent).to.equal(consent);
      });
    });

    describe('without USPrivacy', function() {
      const bid01 = new BidRequestBuilder().withParams().build();

      it('should have an empty "ccpa" field in the request', function () {
        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.regs.ccpa).to.be.empty;
      });
    });

    describe('with userID modules', function() {
      const userId = {
        pubcid: '01EAJWWNEPN3CYMM5N8M5VXY22',
        unsuported: '666'
      };

      it('should send "user.eids" in the request for Prebid.js supported modules only', function() {
        const bid01 = new BidRequestBuilder({
          userId
        }).withParams().build();

        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        const expected = [{
          source: 'pubcid.org',
          uids: [
            {
              atype: 1,
              id: '01EAJWWNEPN3CYMM5N8M5VXY22'
            }
          ]
        }];

        expect(requests[0].data.user.eids).to.have.lengthOf(1);
        expect(requests[0].data.user.eids).to.deep.equal(expected);
      });

      it('should send an empty "user.eids" array in the request if userId module is unsupported', function() {
        const bid01 = new BidRequestBuilder({
          userId: {
            unsuported: '666'
          }
        }).withParams().build();

        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.user.eids).to.be.empty;
      });
    });

    describe('with priceFloors module', function() {
      it('should get and set floor by mediatype and sizes', function() {
        const bid01 = new BidRequestBuilder({
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            },
            video: {
              playerSize: [600, 480]
            }
          }
        }).withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();

        // delete the computed `sizes` prop as we are based on mediaTypes only.
        delete bid01.sizes

        bid01.getFloor = () => {
          return { floor: 1, currency: 'USD' }
        }
        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.adUnits[0].floors.length).to.equal(3);
        expect(requests[0].data.adUnits[0].floors[0]).to.deep.equal({f: 1, mt: 'banner', s: '300x250'});
        expect(requests[0].data.adUnits[0].floors[1]).to.deep.equal({f: 1, mt: 'banner', s: '300x600'});
        expect(requests[0].data.adUnits[0].floors[2]).to.deep.equal({f: 1, mt: 'video', s: '600x480'});

        expect(requests[0].data.adUnits[0].mediaTypes.banner.sizes.length).to.equal(2);
        expect(requests[0].data.adUnits[0].mediaTypes.banner.bannerSizes[0]).to.deep.equal({size: [300, 250], floor: 1});
        expect(requests[0].data.adUnits[0].mediaTypes.banner.bannerSizes[1]).to.deep.equal({size: [300, 600], floor: 1});
        expect(requests[0].data.adUnits[0].mediaTypes.video.floor).to.equal(1);
      });

      it('should get and set floor by mediatype if no size provided (ex native, video)', function() {
        const bid01 = new BidRequestBuilder({
          mediaTypes: {
            video: {
              context: 'outstream',
              mimes: ['video/mp4']
            },
            native: {
              body: { required: true }
            }
          }
        }).withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();
        bid01.getFloor = () => {
          return { floor: 1, currency: 'USD' }
        }
        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.adUnits[0].floors.length).to.equal(2);
        expect(requests[0].data.adUnits[0].floors[0]).to.deep.equal({f: 1, mt: 'video'});
        expect(requests[0].data.adUnits[0].floors[1]).to.deep.equal({f: 1, mt: 'native'});

        expect(requests[0].data.adUnits[0].mediaTypes.video.floor).to.equal(1);
        expect(requests[0].data.adUnits[0].mediaTypes.native.floor).to.equal(1);
      });

      it('should get and set floor with default value if no floors found', function() {
        const bid01 = new BidRequestBuilder({
          mediaTypes: {
            video: {
              context: 'outstream',
              mimes: ['video/mp4']
            }
          }
        }).withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();
        bid01.getFloor = () => {
          return { floor: NaN, currency: 'USD', mt: 'video' }
        }
        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.adUnits[0].floors.length).to.equal(1);
        expect(requests[0].data.adUnits[0].floors[0]).to.deep.equal({mt: 'video'});
        expect(requests[0].data.adUnits[0].mediaTypes.video.floor).to.be.undefined;
      });
    });
  });

  describe('interpretResponse()', function() {
    let serverResponse = {
      body: {
        data: {
          pred: 1
        },
        bids: [{
          ad: '<div style="background-color:red; height:250px; width:300px"></div>',
          cpm: 1,
          creativeId: 'creativeId',
          currency: 'EUR',
          height: 250,
          netRevenue: true,
          requestId: 'c180kg4267tyqz',
          ttl: 360,
          width: 300,
          aDomain: ['advertiser.com'],
          mediaType: 'banner',
          meta: {
            advertiserId: '80',
            advertiserName: 'An Advertiser',
            networkId: '110'
          }
        }]
      }
    };

    let bidRequest = {
      data: {
        adUnits: [{
          bidder: 'adagio',
          params: {
            organizationId: '1000',
            placement: 'PAVE_ATF',
            site: 'SITE-NAME',
            adUnitElementId: 'gpt-adunit-code',
            pagetype: 'ARTICLE',
            category: 'NEWS',
            subcategory: 'SPORT',
            environment: 'desktop',
            supportIObs: true
          },
          adUnitCode: 'adunit-code',
          mediaTypes: {
            banner: { sizes: [[300, 250], [300, 600]] }
          },
          bidId: 'c180kg4267tyqz',
          bidderRequestId: '8vfscuixrovn8i',
          auctionId: 'lel4fhp239i9km',
          pageviewId: 'd8c4fl2k39i0wn',
        }]
      }
    };

    it('should return an empty response array if body is empty', function() {
      expect(spec.interpretResponse({
        body: null
      }, bidRequest)).to.be.an('array').length(0);

      expect(spec.interpretResponse({
        body: {}
      }, bidRequest)).to.be.an('array').length(0);
    });

    it('should return an empty response array if bids array is empty', function() {
      expect(spec.interpretResponse({
        body: {
          bids: []
        }
      }, bidRequest)).to.be.an('array').length(0);
    });

    it('should handle properly a correct bid response', function() {
      let expectedResponse = [{
        ad: '<div style="background-color:red; height:250px; width:300px"></div>',
        cpm: 1,
        creativeId: 'creativeId',
        currency: 'EUR',
        height: 250,
        netRevenue: true,
        requestId: 'c180kg4267tyqz',
        ttl: 360,
        width: 300,
        placement: 'PAVE_ATF',
        site: 'SITE-NAME',
        pagetype: 'ARTICLE',
        category: 'NEWS',
        subcategory: 'SPORT',
        environment: 'desktop',
        aDomain: ['advertiser.com'],
        mediaType: 'banner',
        meta: {
          advertiserId: '80',
          advertiserName: 'An Advertiser',
          advertiserDomains: ['advertiser.com'],
          networkId: '110',
          mediaType: 'banner'
        }
      }];

      expect(spec.interpretResponse(serverResponse, bidRequest)).to.be.an('array');
      expect(spec.interpretResponse(serverResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('Meta props should be limited if no bid.meta is provided', function() {
      const altServerResponse = utils.deepClone(serverResponse);
      delete altServerResponse.body.bids[0].meta;

      let expectedResponse = [{
        ad: '<div style="background-color:red; height:250px; width:300px"></div>',
        cpm: 1,
        creativeId: 'creativeId',
        currency: 'EUR',
        height: 250,
        netRevenue: true,
        requestId: 'c180kg4267tyqz',
        ttl: 360,
        width: 300,
        placement: 'PAVE_ATF',
        site: 'SITE-NAME',
        pagetype: 'ARTICLE',
        category: 'NEWS',
        subcategory: 'SPORT',
        environment: 'desktop',
        aDomain: ['advertiser.com'],
        mediaType: 'banner',
        meta: {
          advertiserDomains: ['advertiser.com'],
          mediaType: 'banner'
        }
      }];

      expect(spec.interpretResponse(altServerResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('should populate ADAGIO queue with ssp-data', function() {
      sandbox.stub(Date, 'now').returns(12345);

      adagioMock.expects('enqueue').withExactArgs({
        action: 'ssp-data',
        ts: 12345,
        data: serverResponse.body.data
      }).once();

      spec.interpretResponse(serverResponse, bidRequest);

      adagioMock.verify();
    });

    it('should properly try-catch an exception and return an empty array', function() {
      sandbox.stub(adagio, 'enqueue').throws();
      utilsMock.expects('logError').once();

      expect(spec.interpretResponse(serverResponse, bidRequest)).to.be.an('array').length(0);

      utilsMock.verify();
    });

    describe('Response with video outstream', () => {
      const bidRequestWithOutstream = utils.deepClone(bidRequest);
      bidRequestWithOutstream.data.adUnits[0].mediaTypes.video = {
        context: 'outstream',
        playerSize: [[300, 250]],
        mimes: ['video/mp4'],
        skip: true
      };

      const serverResponseWithOutstream = utils.deepClone(serverResponse);
      serverResponseWithOutstream.body.bids[0].vastXml = '<VAST version="4.0"><Ad></Ad></VAST>';
      serverResponseWithOutstream.body.bids[0].mediaType = 'video';
      serverResponseWithOutstream.body.bids[0].outstream = {
        bvwUrl: 'https://foo.baz',
        impUrl: 'https://foo.bar'
      };

      it('should set a renderer in video outstream context', function() {
        const bidResponse = spec.interpretResponse(serverResponseWithOutstream, bidRequestWithOutstream)[0];
        expect(bidResponse).to.have.any.keys('outstream', 'renderer', 'mediaType');
        expect(bidResponse.renderer).to.be.a('object');
        expect(bidResponse.renderer.url).to.equal(RENDERER_URL);
        expect(bidResponse.renderer.config.bvwUrl).to.be.ok;
        expect(bidResponse.renderer.config.impUrl).to.be.ok;
        expect(bidResponse.renderer.loaded).to.not.be.ok;
        expect(bidResponse.width).to.equal(300);
        expect(bidResponse.height).to.equal(250);
        expect(bidResponse.vastUrl).to.match(/^data:text\/xml;/)
      });

      it('should execute Adagio outstreamPlayer if defined', function() {
        window.ADAGIO.outstreamPlayer = sinon.stub();
        const bidResponse = spec.interpretResponse(serverResponseWithOutstream, bidRequestWithOutstream)[0];
        executeRenderer(bidResponse.renderer, bidResponse)
        sinon.assert.calledOnce(window.ADAGIO.outstreamPlayer);
        delete window.ADAGIO.outstreamPlayer;
      });

      it('should logError if Adagio outstreamPlayer is not defined', function() {
        const bidResponse = spec.interpretResponse(serverResponseWithOutstream, bidRequestWithOutstream)[0];
        executeRenderer(bidResponse.renderer, bidResponse)
        utilsMock.expects('logError').withExactArgs('Adagio: Adagio outstream player is not defined').once();
      });
    });

    describe('Response with native add', () => {
      const serverResponseWithNative = utils.deepClone(serverResponse)
      serverResponseWithNative.body.bids[0].mediaType = 'native';
      serverResponseWithNative.body.bids[0].admNative = {
        ver: '1.2',
        link: {
          url: 'https://i.am.a.click.url',
          clicktrackers: [
            'https://i.am.a.clicktracker.url'
          ]
        },
        privacy: 'http://www.myprivacyurl.url',
        ext: {
          bvw: 'test'
        },
        eventtrackers: [
          {
            event: 1,
            method: 1,
            url: 'https://eventrack.local/impression'
          },
          {
            event: 1,
            method: 2,
            url: 'https://eventrack.local/impression'
          },
          {
            event: 2,
            method: 1,
            url: 'https://eventrack.local/viewable-mrc50'
          }
        ],
        assets: [
          {
            title: {
              text: 'My title'
            }
          },
          {
            img: {
              url: 'https://images.local/image.jpg',
              w: 100,
              h: 250
            }
          },
          {
            img: {
              type: 1,
              url: 'https://images.local/icon.png',
              w: 40,
              h: 40
            }
          },
          {
            data: {
              type: 1, // sponsored
              value: 'Adagio'
            }
          },
          {
            data: {
              type: 2, // desc / body
              value: 'The super ad text'
            }
          },
          {
            data: {
              type: 3, // rating
              value: '10 from 10'
            }
          },
          {
            data: {
              type: 11, // displayUrl
              value: 'https://i.am.a.display.url'
            }
          }
        ]
      };

      const bidRequestNative = utils.deepClone(bidRequest)
      bidRequestNative.nativeParams = {
        sendTargetingKeys: false,

        clickUrl: {
          required: true,
        },
        title: {
          required: true,
        },
        body: {
          required: true,
        },
        sponsoredBy: {
          required: false
        },
        image: {
          required: true
        },
        icon: {
          required: true
        },
        privacyLink: {
          required: false
        },
        ext: {
          adagio_bvw: {}
        }
      };

      it('Should ignore native parsing due to missing raw admNative property', () => {
        const alternateServerResponse = utils.deepClone(serverResponseWithNative);
        delete alternateServerResponse.body.bids[0].admNative
        const r = spec.interpretResponse(alternateServerResponse, bidRequestNative);
        expect(r[0].mediaType).to.equal(NATIVE);
        expect(r[0].native).not.ok;
        utilsMock.expects('logError').once();
      });

      it('Should ignore native parsing due to invalid raw admNative.assets property', () => {
        const alternateServerResponse = utils.deepClone(serverResponseWithNative);
        alternateServerResponse.body.bids[0].admNative.assets = { title: { text: 'test' } };
        const r = spec.interpretResponse(alternateServerResponse, bidRequestNative);
        expect(r[0].mediaType).to.equal(NATIVE);
        expect(r[0].native).not.ok;
        utilsMock.expects('logError').once();
      });

      it('Should handle and return a formated Native ad', () => {
        const r = spec.interpretResponse(serverResponseWithNative, bidRequestNative);
        const expected = {
          displayUrl: 'https://i.am.a.display.url',
          sponsoredBy: 'Adagio',
          body: 'The super ad text',
          rating: '10 from 10',
          clickUrl: 'https://i.am.a.click.url',
          title: 'My title',
          impressionTrackers: [
            'https://eventrack.local/impression'
          ],
          javascriptTrackers: '<script src=\"https://eventrack.local/impression\"></script>',
          clickTrackers: [
            'https://i.am.a.clicktracker.url'
          ],
          image: {
            url: 'https://images.local/image.jpg',
            width: 100,
            height: 250
          },
          icon: {
            url: 'https://images.local/icon.png',
            width: 40,
            height: 40
          },
          ext: {
            adagio_bvw: 'test'
          },
          privacyLink: 'http://www.myprivacyurl.url'
        }
        expect(r[0].mediaType).to.equal(NATIVE);
        expect(r[0].native).ok;
        expect(r[0].native).to.deep.equal(expected);
      });
    });
  });

  describe('getUserSyncs()', function() {
    const syncOptions = {
      syncEnabled: false
    };

    it('should handle user syncs if data is in the server response ', function() {
      const serverResponses = [{
        body: {
          userSyncs: [
            { t: 'i', u: 'https://test.url.com/setuid' },
            { t: 'p', u: 'https://test.url.com/setuid' }
          ]
        }
      }];

      let result = spec.getUserSyncs(syncOptions, serverResponses);

      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).contain('setuid');

      expect(result[1].type).to.equal('image');
      expect(result[1].url).contain('setuid');
    });

    it('should return false if data is not in server response', function() {
      const serverResponse = [{ body: '' }];
      const result = spec.getUserSyncs(syncOptions, serverResponse);
      expect(result).to.equal(false);
    });
  });

  describe('transformBidParams', function() {
    it('Compute additional params in s2s mode', function() {
      GlobalExchange.prepareExchangeData('{}');

      sandbox.stub(window.top.document, 'getElementById').returns(
        fixtures.getElementById()
      );
      sandbox.stub(window.top, 'getComputedStyle').returns({ display: 'block' });
      sandbox.stub(utils, 'inIframe').returns(false);

      const adUnit = {
        code: 'adunit-code',
        params: {
          organizationId: '1000'
        }
      };
      const bid01 = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] },
          video: {
            context: 'outstream',
            playerSize: [300, 250],
            renderer: {
              url: 'https://url.tld',
              render: () => true
            }
          }
        }
      }).withParams().build();

      const params = spec.transformBidParams({ organizationId: '1000' }, true, adUnit, [{ bidderCode: 'adagio', auctionId: bid01.auctionId, bids: [bid01] }]);

      expect(params.organizationId).to.exist;
      expect(params.auctionId).to.exist;
      expect(params.playerName).to.exist;
      expect(params.playerName).to.equal('other');
      expect(params.features).to.exist;
      expect(params.features.page_dimensions).to.exist;
      expect(params.features.adunit_position).to.exist;
      expect(params.features.dom_loading).to.exist;
      expect(params.features.print_number).to.exist;
      expect(params.features.user_timestamp).to.exist;
      expect(params.placement).to.exist;
      expect(params.adUnitElementId).to.exist;
      expect(params.site).to.exist;
      expect(params.data.session).to.exist;
    });
  });

  describe('Adagio features when prebid in top.window', function() {
    it('should return all expected features when all expected bidder params are available', function() {
      sandbox.stub(window.top.document, 'getElementById').returns(
        fixtures.getElementById()
      );
      sandbox.stub(window.top, 'getComputedStyle').returns({ display: 'block' });
      sandbox.stub(utils, 'inIframe').returns(false);

      const bidRequest = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).withParams().build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const result = requests[0].data.adUnits[0].features;

      expect(result.adunit_position).to.match(/^[\d]+x[\d]+$/);
      expect(result.page_dimensions).to.match(/^[\d]+x[\d]+$/);
      expect(result.viewport_dimensions).to.match(/^[\d]+x[\d]+$/);
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
      expect(result.url).to.not.exist;
      expect(result.device).to.not.exist;
      expect(result.os).to.not.exist;
      expect(result.browser).to.not.exist;
    });

    it('should return all expected features when `adUnitElementId` param is not available', function() {
      sandbox.stub(utils, 'inIframe').returns(false);

      const bidRequest = new BidRequestBuilder({
        params: {
          organizationId: '1000',
          placement: 'PAVE_ATF',
          site: 'SITE-NAME'
        },
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const result = requests[0].data.adUnits[0].features;

      expect(result.adunit_position).to.not.exist;
      expect(result.page_dimensions).to.be.a('String');
      expect(result.viewport_dimensions).to.be.a('String');
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
    });
  });

  describe('Adagio features when prebid in Safeframe', function() {
    beforeEach(function () {
      window.$sf = $sf;
    });

    afterEach(function () {
      delete window.$sf;
    });

    it('should return all expected features when prebid is in safeframe iframe', function() {
      sandbox.stub(window.$sf.ext, 'geom').returns({
        win: {t: 23, r: 1920, b: 1200, l: 0, w: 1920, h: 1177},
        self: {t: 210, r: 1159, b: 460, l: 859, w: 300, h: 250},
      });

      const bidRequest = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).withParams().build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const result = requests[0].data.adUnits[0].features;

      expect(result.page_dimensions).to.not.exist;
      expect(result.viewport_dimensions).to.be.a('String');
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
      expect(result.adunit_position).to.exist;
    });

    it('should return all expected features when prebid safeframe api not properly implemented', function() {
      const bidRequest = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).withParams().build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const result = requests[0].data.adUnits[0].features;

      expect(result.page_dimensions).to.not.exist;
      expect(result.viewport_dimensions).to.not.exist;
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
      expect(result.adunit_position).to.not.exist;
    });

    it('should return all expected features when prebid safeframe api not properly implemented bis', function() {
      window.$sf.ext.geom = undefined;

      const bidRequest = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).withParams().build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const result = requests[0].data.adUnits[0].features;

      expect(result.page_dimensions).to.not.exist;
      expect(result.viewport_dimensions).to.not.exist;
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
      expect(result.adunit_position).to.not.exist;
    });
  });

  describe('Adagio features when prebid in crossdomain iframe', function() {
    it('should return all expected features', function() {
      sandbox.stub(utils, 'getWindowTop').throws();

      const bidRequest = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).withParams().build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const result = requests[0].data.adUnits[0].features;

      expect(result.page_dimensions).to.not.exist;
      expect(result.viewport_dimensions).to.not.exist;
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
      expect(result.adunit_position).to.not.exist;
    });
  });

  describe.skip('optional params auto detection', function() {
    it('should auto detect environment', function() {
      const getDeviceStub = sandbox.stub(_features, 'getDevice');

      getDeviceStub.returns(5);
      expect(adagio.autoDetectEnvironment()).to.eq('tablet');

      getDeviceStub.returns(4);
      expect(adagio.autoDetectEnvironment()).to.eq('mobile');

      getDeviceStub.returns(2);
      expect(adagio.autoDetectEnvironment()).to.eq('desktop');
    });

    it('should auto detect adUnitElementId when GPT is used', function() {
      sandbox.stub(utils, 'getGptSlotInfoForAdUnitCode').withArgs('banner').returns({divId: 'gpt-banner'});
      expect(adagio.autoDetectAdUnitElementId('banner')).to.eq('gpt-banner');
    });
  });

  describe.skip('print number handling', function() {
    it('should return 1 if no adunit-code found. This means it is the first auction', function() {
      sandbox.stub(adagio, 'getPageviewId').returns('abc-def');
      expect(adagio.computePrintNumber('adunit-code')).to.eql(1);
    });

    it('should increment the adunit print number when the adunit-code has already been used for an other auction', function() {
      sandbox.stub(adagio, 'getPageviewId').returns('abc-def');

      window.top.ADAGIO.adUnits['adunit-code'] = {
        pageviewId: 'abc-def',
        printNumber: 1,
      };

      expect(adagio.computePrintNumber('adunit-code')).to.eql(2);
    });
  });

  describe('site information using refererDetection or window.top', function() {
    it('should returns domain, page and window.referrer in a window.top context', function() {
      sandbox.stub(utils, 'getWindowTop').returns({
        location: {
          hostname: 'test.io',
          href: 'https://test.io/article/a.html'
        },
        document: {
          referrer: 'https://google.com'
        }
      });

      const bidderRequest = new BidderRequestBuilder({
        refererInfo: {
          numIframes: 0,
          reachedTop: true,
          referer: 'https://test.io/article/a.html'
        }
      }).build();

      expect(adagio.getSite(bidderRequest)).to.deep.equal({
        domain: 'test.io',
        page: 'https://test.io/article/a.html',
        referrer: 'https://google.com',
        top: true
      });
    });

    it('should returns domain and page in a cross-domain w/ top domain reached context', function() {
      sandbox.stub(utils, 'getWindowTop').throws();
      sandbox.stub(utils, 'getWindowSelf').returns({
        document: {
          referrer: 'https://google.com'
        }
      });

      const info = {
        numIframes: 0,
        reachedTop: true,
        referer: 'http://level.io/',
        stack: [
          'http://level.io/',
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: ''
      };

      const bidderRequest = new BidderRequestBuilder({
        refererInfo: info
      }).build();

      expect(adagio.getSite(bidderRequest)).to.deep.equal({
        domain: 'level.io',
        page: 'http://level.io/',
        referrer: 'https://google.com',
        top: true
      });
    });

    it('should return info in a cross-domain w/o top domain reached and w/o ancestor context', function() {
      sandbox.stub(utils, 'getWindowTop').throws();

      const info = {
        numIframes: 2,
        reachedTop: false,
        referer: 'http://example.com/iframe1.html',
        stack: [
          null,
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: ''
      };

      const bidderRequest = new BidderRequestBuilder({
        refererInfo: info
      }).build();

      const s = adagio.getSite(bidderRequest)
      expect(s.domain).equal('example.com')
      expect(s.page).equal('http://example.com/iframe1.html')
      expect(s.referrer).match(/^https?:\/\/.+/);
      expect(s.top).equal(false)
    });
  });

  describe('adagioScriptFromLocalStorageCb()', function() {
    const VALID_HASH = 'Lddcw3AADdQDrPtbRJkKxvA+o1CtScGDIMNRpHB3NnlC/FYmy/9RKXelKrYj/sjuWusl5YcOpo+lbGSkk655i8EKuDiOvK6ae/imxSrmdziIp+S/TA6hTFJXcB8k1Q9OIp4CMCT52jjXgHwX6G0rp+uYoCR25B1jHaHnpH26A6I=';
    const INVALID_HASH = 'invalid';
    const VALID_SCRIPT_CONTENT = 'var _ADAGIO=function(){};(_ADAGIO)();\n';
    const INVALID_SCRIPT_CONTENT = 'var _ADAGIO=function(){//corrupted};(_ADAGIO)();\n';
    const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';

    beforeEach(function() {
      localStorage.removeItem(ADAGIO_LOCALSTORAGE_KEY);
    });

    describe('getAdagioScript', function() {
      it('should run storage.getDataFromLocalStorage callback and call adagioScriptFromLocalStorageCb() ', function() {
        sandbox.spy(adagio, 'adagioScriptFromLocalStorageCb');
        const getDataFromLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage').callsArg(1);
        localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + VALID_HASH + '\n' + VALID_SCRIPT_CONTENT);

        getAdagioScript();

        sinon.assert.callCount(getDataFromLocalStorageStub, 1);
        sinon.assert.callCount(adagio.adagioScriptFromLocalStorageCb, 1);
      });

      it('should load external script if the user consent', function() {
        sandbox.stub(storage, 'localStorageIsEnabled').callsArgWith(0, true);
        getAdagioScript();

        expect(loadExternalScript.called).to.be.true;
      });

      it('should not load external script if the user does not consent', function() {
        sandbox.stub(storage, 'localStorageIsEnabled').callsArgWith(0, false);
        getAdagioScript();

        expect(loadExternalScript.called).to.be.false;
      });

      it('should remove the localStorage key if exists and the user does not consent', function() {
        sandbox.stub(storage, 'localStorageIsEnabled').callsArgWith(0, false);
        localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, 'the script');

        getAdagioScript();

        expect(loadExternalScript.called).to.be.false;
        expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      });
    });

    it('should verify valid hash with valid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + VALID_HASH + '\n' + VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script.').once();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').never();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.equals('// hash: ' + VALID_HASH + '\n' + VALID_SCRIPT_CONTENT);
      utilsMock.verify();
    });

    it('should verify valid hash with invalid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + VALID_HASH + '\n' + INVALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').once();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify invalid hash with valid script', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, '// hash: ' + INVALID_HASH + '\n' + VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').once();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify missing hash', function () {
      localStorage.setItem(ADAGIO_LOCALSTORAGE_KEY, VALID_SCRIPT_CONTENT);

      utilsMock.expects('logInfo').withExactArgs('Adagio: start script').never();
      utilsMock.expects('logWarn').withExactArgs('Adagio: no hash found.').once();
      utilsMock.expects('logWarn').withExactArgs('Adagio: invalid script found.').never();

      adagioScriptFromLocalStorageCb(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY));

      expect(localStorage.getItem(ADAGIO_LOCALSTORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should return false if content script does not exist in localStorage', function() {
      sandbox.spy(utils, 'logWarn');
      expect(adagioScriptFromLocalStorageCb(null)).to.be.undefined;
      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, 'Adagio: script not found.');
    });
  });
});
