import find from 'core-js-pure/features/array/find.js';
import { expect, util } from 'chai';
import {
  _features,
  internal as adagio,
  adagioScriptFromLocalStorageCb,
  getAdagioScript,
  storage,
  spec,
  ENDPOINT,
  VERSION,
  RENDERER_URL
} from '../../../modules/adagioBidAdapter.js';
import { loadExternalScript } from '../../../src/adloader.js';
import * as utils from '../../../src/utils.js';
import { config } from '../../../src/config.js';
import { NATIVE } from '../../../src/mediaTypes.js';

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

  describe('isBidRequestValid()', function() {
    it('should return true when required params have been found', function() {
      const bid = new BidRequestBuilder().withParams().build();

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

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
    })

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

      expect(spec.isBidRequestValid(bid01)).to.equal(false);
      expect(spec.isBidRequestValid(bid02)).to.equal(false);
      expect(spec.isBidRequestValid(bid03)).to.equal(false);
    });

    it('should return false when refererInfo.reachedTop is false', function() {
      sandbox.spy(utils, 'logWarn');
      sandbox.stub(adagio, 'getRefererInfo').returns({ reachedTop: false });
      const bid = new BidRequestBuilder().withParams().build();

      expect(spec.isBidRequestValid(bid)).to.equal(false);
      sinon.assert.callCount(utils.logWarn, 1);
      sinon.assert.calledWith(utils.logWarn, 'Adagio: the main page url is unreachabled.');
    });

    it('should log warning and enqueue the bid object in ADAGIO.queue when isBidRequestValid is false', function() {
      sandbox.stub(Date, 'now').returns(12345);
      sandbox.spy(utils, 'logWarn');
      sandbox.spy(adagio, 'enqueue');

      const bid = new BidRequestBuilder({'params': {
        organizationId: '1000',
        placement: 'PAVE_ATF'
      }}).build();

      const expectedEnqueued = {
        action: 'pb-dbg',
        ts: 12345,
        data: { bid }
      };

      spec.isBidRequestValid(bid);

      sinon.assert.calledWith(adagio.enqueue, expectedEnqueued);
      sinon.assert.callCount(utils.logWarn, 1);
    });

    describe('Store ADAGIO global in window.top or window.self depending on context', function() {
      const bid01 = new BidRequestBuilder({
        adUnitCode: 'adunit-code-01',
        sizes: [[300, 250], [300, 600]]
      }).withParams().build();

      const bid02 = new BidRequestBuilder({
        adUnitCode: 'adunit-code-02',
        mediaTypes: {
          banner: { sizes: [[300, 250]] }
        },
      }).withParams().build();

      const bid03 = new BidRequestBuilder({
        adUnitCode: 'adunit-code-02',
        mediaTypes: {
          banner: { sizes: [[300, 600]] }
        },
      }).withParams().build();

      const expected = [
        {
          code: 'adunit-code-01',
          sizes: [[300, 250], [300, 600]],
          mediaTypes: {},
          bids: [{
            bidder: 'adagio',
            params: {
              organizationId: '1000',
              placement: 'PAVE_ATF',
              site: 'SITE-NAME',
              adUnitElementId: 'gpt-adunit-code',
              environment: 'desktop',
              supportIObs: true
            }
          }],
          auctionId: '4fd1ca2d-846c-4211-b9e5-321dfe1709c9',
          pageviewId: 'dda61753-4059-4f75-b0bf-3f60bd2c4d9a',
          printNumber: 1,
        },
        {
          code: 'adunit-code-02',
          sizes: [[300, 600]],
          mediaTypes: {
            banner: { sizes: [[300, 600]] }
          },
          bids: [{
            bidder: 'adagio',
            params: {
              organizationId: '1000',
              placement: 'PAVE_ATF',
              site: 'SITE-NAME',
              adUnitElementId: 'gpt-adunit-code',
              environment: 'desktop',
              supportIObs: true
            }
          }],
          auctionId: '4fd1ca2d-846c-4211-b9e5-321dfe1709c9',
          pageviewId: 'dda61753-4059-4f75-b0bf-3f60bd2c4d9a',
          printNumber: 2,
        }
      ];

      it('should store bids config once by bid in window.top if it accessible', function() {
        sandbox.stub(adagio, 'getCurrentWindow').returns(window.top);
        sandbox.stub(adagio, 'supportIObs').returns(true);

        // replace by the values defined in beforeEach
        window.top.ADAGIO = {
          ...window.ADAGIO
        };

        spec.isBidRequestValid(bid01);
        spec.isBidRequestValid(bid02);
        spec.isBidRequestValid(bid03);

        expect(find(window.top.ADAGIO.pbjsAdUnits, aU => aU.code === 'adunit-code-01')).to.deep.eql(expected[0]);
        expect(find(window.top.ADAGIO.pbjsAdUnits, aU => aU.code === 'adunit-code-02')).to.deep.eql(expected[1]);
      });

      it('should detect IntersectionObserver support', function() {
        sandbox.stub(adagio, 'getCurrentWindow').returns(window.top);
        sandbox.stub(adagio, 'supportIObs').returns(false);

        window.top.ADAGIO = {
          ...window.ADAGIO
        };

        spec.isBidRequestValid(bid01);
        const validBidReq = find(window.top.ADAGIO.pbjsAdUnits, aU => aU.code === 'adunit-code-01');
        expect(validBidReq.bids[0].params.supportIObs).to.equal(false);
      });

      it('should store bids config once by bid in current window', function() {
        sandbox.stub(adagio, 'getCurrentWindow').returns(window.self);
        sandbox.stub(adagio, 'supportIObs').returns(true);

        spec.isBidRequestValid(bid01);
        spec.isBidRequestValid(bid02);
        spec.isBidRequestValid(bid03);

        expect(find(window.ADAGIO.pbjsAdUnits, aU => aU.code === 'adunit-code-01')).to.deep.eql(expected[0]);
        expect(find(window.ADAGIO.pbjsAdUnits, aU => aU.code === 'adunit-code-02')).to.deep.eql(expected[1]);
      });
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
      'adapterVersion',
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
      sandbox.stub(adagio, 'getFeatures').returns({});

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

      for (const prop in _features) {
        sandbox.stub(_features, prop).returns('');
      }

      adagioMock.expects('enqueue').withExactArgs({
        action: 'features',
        ts: 12345,
        data: {
          'gpt-adunit-code': {
            features: {},
            version: '1'
          }
        }
      }).atLeast(1);

      const bid01 = new BidRequestBuilder().withParams().build();
      const bidderRequest = new BidderRequestBuilder().build();

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
        sinon.assert.calledTwice(utils.logWarn);
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
        sharedid: {id: '01EAJWWNEPN3CYMM5N8M5VXY22', third: '01EAJWWNEPN3CYMM5N8M5VXY22'},
        unsuported: '666'
      };

      it('should send "user.eids" in the request for Prebid.js supported modules only', function() {
        const bid01 = new BidRequestBuilder({
          userId
        }).withParams().build();

        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        const expected = [{
          source: 'sharedid.org',
          uids: [
            {
              atype: 1,
              ext: {
                third: '01EAJWWNEPN3CYMM5N8M5VXY22'
              },
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
          width: 300
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
        environment: 'desktop'
      }];

      expect(spec.interpretResponse(serverResponse, bidRequest)).to.be.an('array');
      expect(spec.interpretResponse(serverResponse, bidRequest)).to.deep.equal(expectedResponse);
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
    });

    describe('Response with native add', () => {
      const serverResponseWithNative = utils.deepClone(serverResponse)
      serverResponseWithNative.body.bids[0].mediaType = 'native';
      serverResponseWithNative.body.bids[0].admNative = {
        ver: '1.2',
        link: {
          url: 'https://i.am.a.click.url',
          clickTrackers: [
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
            required: 1,
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
      bidRequestNative.mediaTypes = {
        native: {
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

  describe('Adagio features', function() {
    it('should return all expected features when all expected bidder params are available', function() {
      sandbox.stub(window.top.document, 'getElementById').returns(
        fixtures.getElementById()
      );
      sandbox.stub(window.top, 'getComputedStyle').returns({ display: 'block' });

      const bidRequest = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).withParams().build();

      const bidderRequest = new BidderRequestBuilder().build();

      const result = adagio.getFeatures(bidRequest, bidderRequest);

      expect(result.adunit_position).to.match(/^[\d]+x[\d]+$/);
      expect(result.page_dimensions).to.match(/^[\d]+x[\d]+$/);
      expect(result.viewport_dimensions).to.match(/^[\d]+x[\d]+$/);
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
      expect(result.url).to.be.a('String');
      expect(result.device).to.be.a('String');
      expect(result.os).to.be.a('String');
      expect(result.browser).to.be.a('String');
    });

    it('should return all expected features when `adUnitElementId` param is not available', function() {
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

      const result = adagio.getFeatures(bidRequest, bidderRequest);

      expect(result.adunit_position).to.not.exist;
      expect(result.page_dimensions).to.be.a('String');
      expect(result.viewport_dimensions).to.be.a('String');
      expect(result.print_number).to.be.a('String');
      expect(result.dom_loading).to.be.a('String');
      expect(result.user_timestamp).to.be.a('String');
      expect(result.url).to.be.a('String');
      expect(result.device).to.be.a('String');
      expect(result.os).to.be.a('String');
      expect(result.browser).to.be.a('String');
    });

    it('should not return feature with an empty value', function() {
      sandbox.stub(_features, 'getDomLoadingDuration').returns('');
      sandbox.stub(_features, 'getUrl').returns('');
      sandbox.stub(_features, 'getBrowser').returns('');

      const bidRequest = new BidRequestBuilder({
        'mediaTypes': {
          banner: { sizes: [[300, 250]] }
        }
      }).withParams().build();

      const bidderRequest = new BidderRequestBuilder().build();

      const result = adagio.getFeatures(bidRequest, bidderRequest);

      expect(result.adunit_position).to.not.exist;
      expect(result.page_dimensions).to.exist;
      expect(result.viewport_dimensions).to.exist;
      expect(result.print_number).to.exist;
      expect(result.dom_loading).to.not.exist;
      expect(result.user_timestamp).to.exist;
      expect(result.url).to.not.exist;
      expect(result.device).to.exist;
      expect(result.os).to.exist;
      expect(result.browser).to.not.exist;
    });

    describe('getPageDimensions feature', function() {
      afterEach(() => {
        delete window.$sf;
      });

      it('should not compute the page dimensions in cross-origin iframe', function() {
        sandbox.stub(utils, 'getWindowTop').throws();
        const result = _features.getPageDimensions();
        expect(result).to.eq('');
      });

      it('should not compute the page dimensions even with safeFrame api', function() {
        window.$sf = $sf;
        const result = _features.getPageDimensions();
        expect(result).to.eq('');
      });

      it('should not compute the page dimensions if <body> is not in the DOM', function() {
        sandbox.stub(window.top.document, 'querySelector').withArgs('body').returns(null);
        const result = _features.getPageDimensions();
        expect(result).to.eq('');
      });

      it('should compute the page dimensions based on body and viewport dimensions', function() {
        sandbox.stub(window.top.document, 'querySelector').withArgs('body').returns({ scrollWidth: 1360, offsetWidth: 1280, scrollHeight: 2000, offsetHeight: 1000 });
        const result = _features.getPageDimensions();
        expect(result).to.eq('1360x2000');
      });
    });

    describe('getViewPortDimensions feature', function() {
      afterEach(() => {
        delete window.$sf;
      });

      it('should not compute the viewport dimensions in cross-origin iframe', function() {
        sandbox.stub(utils, 'getWindowTop').throws();
        const result = _features.getViewPortDimensions();
        expect(result).to.eq('');
      });

      it('should compute the viewport dimensions in cross-origin iframe w/ safeFrame api', function() {
        window.$sf = $sf;
        sandbox.stub(window.$sf.ext, 'geom').returns({
          win: {t: 23, r: 1920, b: 1200, l: 0, w: 1920, h: 1177},
          self: {t: 210, r: 1159, b: 460, l: 859, w: 300, h: 250},
        });
        const result = _features.getViewPortDimensions();
        expect(result).to.eq('1920x1177');
      });

      it('should not compute the viewport dimensions if safeFrame api is misimplemented', function() {
        window.$sf = {
          ext: { geom: 'nothing' }
        };
        const result = _features.getViewPortDimensions();
        expect(result).to.eq('');
      });

      it('should not compute the viewport dimensions if <body> is not in the DOM', function() {
        const querySelectorSpy = sandbox.spy(() => null);
        sandbox.stub(utils, 'getWindowTop').returns({
          location: { href: 'https://mytest.io' },
          document: { querySelector: querySelectorSpy }
        });
        const result = _features.getViewPortDimensions();
        expect(result).to.eq('');
      });

      it('should compute the viewport dimensions based on window', function() {
        sandbox.stub(utils, 'getWindowTop').returns({
          location: { href: 'https://mytest.io' },
          innerWidth: 960,
          innerHeight: 3000
        });
        const result = _features.getViewPortDimensions();
        expect(result).to.eq('960x3000');
      });

      it('should compute the viewport dimensions based on body', function() {
        const querySelectorSpy = sandbox.spy(() => ({ clientWidth: 1024, clientHeight: 2000 }));
        sandbox.stub(utils, 'getWindowTop').returns({
          location: { href: 'https://mytest.io' },
          document: { querySelector: querySelectorSpy }
        });
        const result = _features.getViewPortDimensions();
        expect(result).to.eq('1024x2000');
      });
    });

    describe('getSlotPosition feature', function() {
      let getElementByIdStub;
      let getComputedStyleStub;

      beforeEach(() => {
        getElementByIdStub = sandbox.stub(window.top.document, 'getElementById');
        getElementByIdStub.returns(fixtures.getElementById());
        getComputedStyleStub = sandbox.stub(window.top, 'getComputedStyle');
        getComputedStyleStub.returns({ display: 'block' });
      });

      afterEach(() => {
        delete window.$sf;
        getElementByIdStub.restore();
        getComputedStyleStub.restore();
      });

      it('should not compute the slot position in cross-origin iframe', function() {
        sandbox.stub(utils, 'getWindowTop').throws();
        const result = _features.getSlotPosition({ adUnitElementId: 'gpt-adunit-code', postBid: false });
        expect(result).to.eq('');
      });

      it('should compute the slot position in cross-origin iframe w/ safeFrame api', function() {
        window.$sf = $sf;
        sandbox.stub(window.$sf.ext, 'geom').returns({
          win: {t: 23, r: 1920, b: 1200, l: 0, w: 1920, h: 1177},
          self: {t: 210, r: 1159, b: 460, l: 859, w: 300, h: 250},
        });
        const result = _features.getSlotPosition({ adUnitElementId: 'gpt-adunit-code', postBid: false });
        expect(result).to.eq('210x859');
      });

      it('should not compute the slot position if safeFrame api is misimplemented', function() {
        window.$sf = {
          ext: { geom: 'nothing' }
        };
        utilsMock.expects('logWarn').once();
        const result = _features.getSlotPosition({ adUnitElementId: 'gpt-adunit-code', postBid: false });
        expect(result).to.eq('');
        utilsMock.verify();
      });

      it('should not compute the slot position due to unreachable adUnitElementId', function() {
        getElementByIdStub.returns(null);
        const result = _features.getSlotPosition({ adUnitElementId: 'gpt-adunit-code', postBid: false });
        expect(result).to.eq('');
      });

      it('should use a quick switch to display slot and compute position', function() {
        getComputedStyleStub.returns({ display: 'none' });
        const result = _features.getSlotPosition({ adUnitElementId: 'gpt-adunit-code', postBid: false });
        expect(result).to.eq('800x300');
      });

      it('should compute the slot position based on window.top w/o postBid param', function() {
        const result = _features.getSlotPosition({ adUnitElementId: 'gpt-adunit-code', postBid: false });
        expect(result).to.eq('800x300');
      });

      it.skip('should compute the slot position inside the parent window (window.top) when safeFrame is not available and postBid params is `true`', function() {
        const result = _features.getSlotPosition({ adUnitElementId: 'gpt-adunit-code', postBid: true });
        // expect(result).to.eq('800x300');
      });
    });
  });

  describe('optional params auto detection', function() {
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

  describe('print number handling', function() {
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
          referer: 'http://test.io/index.html?pbjs_debug=true'
        }
      }).build();

      expect(adagio.getSite(bidderRequest)).to.deep.equal({
        domain: 'test.io',
        page: 'https://test.io/article/a.html',
        referrer: 'https://google.com'
      });
    });

    it('should returns domain and page in a cross-domain w/ top domain reached context', function() {
      sandbox.stub(utils, 'getWindowTop').throws();

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
        referrer: ''
      });
    });

    it('should not return anything in a cross-domain w/o top domain reached and w/o ancestor context', function() {
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

      expect(adagio.getSite(bidderRequest)).to.deep.equal({
        domain: '',
        page: '',
        referrer: ''
      });
    });

    it('should return domain only in a cross-domain w/o top domain reached and w/ ancestors context', function() {
      sandbox.stub(utils, 'getWindowTop').throws();

      const info = {
        numIframes: 2,
        reachedTop: false,
        referer: 'http://example.com/iframe1.html',
        stack: [
          'http://mytest.com/',
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: ''
      };

      const bidderRequest = new BidderRequestBuilder({
        refererInfo: info
      }).build();

      expect(adagio.getSite(bidderRequest)).to.deep.equal({
        domain: 'mytest.com',
        page: '',
        referrer: ''
      });
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
