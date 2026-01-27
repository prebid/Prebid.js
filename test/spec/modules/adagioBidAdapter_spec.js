import * as utils from '../../../src/utils.js';
import {
  BB_RENDERER_URL,
  ENDPOINT,
  VERSION,
  _internal,
  setExtraParam,
  spec
} from '../../../modules/adagioBidAdapter.js';
import { NATIVE } from '../../../src/mediaTypes.js';
import { config } from '../../../src/config.js';
import { executeRenderer } from '../../../src/Renderer.js';
import { expect } from 'chai';
import { userSync } from '../../../src/userSync.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

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
  let utilsMock;
  let sandbox;
  let fakeRenderer;

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

    utilsMock = sinon.mock(utils);

    sandbox = sinon.createSandbox();
    utilsMock = sandbox.mock(utils);
  });

  afterEach(() => {
    window.ADAGIO = undefined;
    getGlobal().bidderSettings = {};

    utilsMock.restore();

    sandbox.restore();
  });

  describe('get and set params at adUnit level from global Prebid configuration', function() {
    it('should set params get from bid.ortb2', function() {
      const bid = new BidRequestBuilder().build();
      bid.ortb2 = {
        site: {
          ext: {
            data: {
              pagetype: 'abc',
              category: ['cat1', 'cat2', 'cat3']
            }
          }
        }
      };

      sandbox.stub(config, 'getConfig').callsFake(key => {
        const config = {
          adagio: {
            pagetype: 'article'
          },
        };
        return utils.deepAccess(config, key);
      });

      setExtraParam(bid, 'pagetype')
      expect(bid.params.pagetype).to.equal('article');

      setExtraParam(bid, 'category');
      expect(bid.params.category).to.equal('cat1'); // Only the first value is kept
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
      sandbox.stub(_internal, 'getRefererInfo').returns({ reachedTop: true });
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
      'hasRtd',
      'data',
      'usIfr',
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
      sandbox.stub(_internal, 'getDevice').returns({ a: 'a' });
      sandbox.stub(_internal, 'getSite').returns({ domain: 'adagio.io', 'page': 'https://adagio.io/hb' });

      const bid01 = new BidRequestBuilder().withParams().build();
      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01], bidderRequest);
      const expectedUrl = `${ENDPOINT}?orgid=1000`;

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(expectedUrl);
      expect(requests[0].data).to.have.all.keys(expectedDataKeys);
    });

    it('should use a custom generated auctionId from ortb2.site.ext.data.adg_rtd.uid when available', function() {
      const expectedAuctionId = '373bcda7-9794-4f1c-be2c-0d223d11d579'

      const bid01 = new BidRequestBuilder().withParams().build();
      const ortb = {
        ortb2: {
          site: {
            ext: {
              data: {
                adg_rtd: {
                  uid: expectedAuctionId
                }
              }
            }
          }
        }
      }
      const bidderRequest = new BidderRequestBuilder(ortb).build();

      const requests = spec.buildRequests([bid01], bidderRequest);
      expect(requests[0].data.adUnits[0].auctionId).eq(expectedAuctionId);
      expect(requests[0].data.adUnits[0].transactionId).to.not.exist;
    });

    it('should use a custom generated auctionId when ortb2.site.ext.data.adg_rtd.uid is absent and remove transactionId', function() {
      const expectedAuctionId = '373bcda7-9794-4f1c-be2c-0d223d11d579'
      sandbox.stub(utils, 'generateUUID').returns(expectedAuctionId);

      const bid01 = new BidRequestBuilder().withParams().build();
      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01], bidderRequest);
      expect(requests[0].data.adUnits[0].auctionId).eq(expectedAuctionId);
      expect(requests[0].data.adUnits[0].transactionId).to.not.exist;
    });

    it('should enrich prebid bid requests params', function() {
      const expectedPageviewId = '56befc26-8cf0-472d-b105-73896df8eb89';
      sandbox.stub(_internal, 'getAdagioNs').returns({ pageviewId: expectedPageviewId });

      const bid01 = new BidRequestBuilder().withParams().build();
      const bidderRequest = new BidderRequestBuilder().build();

      spec.buildRequests([bid01], bidderRequest);

      expect(bid01.params.pageviewId).eq(expectedPageviewId);
    });

    it('should force split keyword param into a string', function() {
      const bid01 = new BidRequestBuilder().withParams({
        splitKeyword: 1234
      }).build();
      const bid02 = new BidRequestBuilder().withParams({
        splitKeyword: ['1234']
      }).build();
      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01, bid02], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data).to.have.all.keys(expectedDataKeys);
      expect(requests[0].data.adUnits[0].params).to.exist;
      expect(requests[0].data.adUnits[0].params.splitKeyword).to.exist;
      expect(requests[0].data.adUnits[0].params.splitKeyword).to.equal('1234');
      expect(requests[0].data.adUnits[1].params.splitKeyword).to.not.exist;
    });

    it('should force key and value from data layer param into a string', function() {
      const bid01 = new BidRequestBuilder().withParams({
        dataLayer: {
          1234: 'dlparam',
          goodkey: 1234,
          objectvalue: {
            random: 'result'
          },
          arrayvalue: ['1234']
        }
      }).build();

      const bid02 = new BidRequestBuilder().withParams({
        dataLayer: 'a random string'
      }).build();

      const bid03 = new BidRequestBuilder().withParams({
        dataLayer: 1234
      }).build();

      const bid04 = new BidRequestBuilder().withParams({
        dataLayer: ['an array']
      }).build();

      const bidderRequest = new BidderRequestBuilder().build();

      const requests = spec.buildRequests([bid01, bid02, bid03, bid04], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data).to.have.all.keys(expectedDataKeys);
      expect(requests[0].data.adUnits[0].params).to.exist;
      expect(requests[0].data.adUnits[0].params.dataLayer).to.not.exist;
      expect(requests[0].data.adUnits[0].params.dl).to.exist;
      expect(requests[0].data.adUnits[0].params.dl['1234']).to.equal('dlparam');
      expect(requests[0].data.adUnits[0].params.dl.goodkey).to.equal('1234');
      expect(requests[0].data.adUnits[0].params.dl.objectvalue).to.not.exist;
      expect(requests[0].data.adUnits[0].params.dl.arrayvalue).to.not.exist;

      expect(requests[0].data.adUnits[1].params).to.exist;
      expect(requests[0].data.adUnits[1].params.dl).to.not.exist;
      expect(requests[0].data.adUnits[1].params.dataLayer).to.not.exist;

      expect(requests[0].data.adUnits[2].params).to.exist;
      expect(requests[0].data.adUnits[2].params.dl).to.not.exist;
      expect(requests[0].data.adUnits[2].params.dataLayer).to.not.exist;

      expect(requests[0].data.adUnits[3].params).to.exist;
      expect(requests[0].data.adUnits[3].params.dl).to.not.exist;
      expect(requests[0].data.adUnits[3].params.dataLayer).to.not.exist;
    });

    describe('with adagioRtdProvider enrichments', function() {
      const adUnitRtdEnrichments = {
        ortb2: {
          site: {
            ext: {
              data: {
                adg_rtd: {
                  features: {
                    page_dimensions: '1024x768',
                    viewport_dimensions: '1024x768',
                    user_timestamp: '111111111',
                    dom_loading: '111111111',
                  }
                }
              }}}
        },
        ortb2Imp: {
          ext: {
            data: {
              adg_rtd: {
                adunit_position: '1x1'
              }
            }
          }
        }
      }
      const rtdEnrichments = {
        ortb2: {
          site: {
            ext: {
              data: {
                adg_rtd: {
                  session: {
                    new: true,
                    rnd: 0.0666
                  },
                }
              }
            }
          }
        }
      }

      it('should add features and data to the request if exists', function() {
        const bid01 = new BidRequestBuilder(adUnitRtdEnrichments).withParams().build();
        const bidderRequest = new BidderRequestBuilder(rtdEnrichments).build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.data).to.deep.equal({
          session: {
            new: true,
            rnd: 0.0666
          }
        });

        expect(requests[0].data.adUnits[0].features).to.deep.equal({
          page_dimensions: '1024x768',
          viewport_dimensions: '1024x768',
          user_timestamp: '111111111',
          dom_loading: '111111111',
          adunit_position: '1x1',
          print_number: '1'
        })
      });

      it('should add an only "print_number" in features object if ortb2 is not properly defined', function() {
        const bid01 = new BidRequestBuilder({
          ortb2: {},
          bidderRequestsCount: 2
        }).withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.adUnits[0].features).to.deep.equal({
          print_number: '2'
        });
      });

      it('should send data.session with default if the ortb2 ext is not properly defined', function() {
        const bid01 = new BidRequestBuilder().withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();
        sandbox.stub(Math, 'random').returns(0.444);

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.data.session).to.exist;
        expect(requests[0].data.data.session.new).to.equal(true);
        expect(requests[0].data.data.session.rnd).to.equal(0.444);
      });
    });

    describe('With video mediatype', function() {
      context('Outstream video', function() {
        it('should set playerName = "other" if user does not set renderer.backupOnly: true', function() {
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
        });

        it('should set playerName = "adagio" if user does not set a renderer or set `renderer.backupOnly: true`', function() {
          const bid01 = new BidRequestBuilder({
            adUnitCode: 'adunit-code-01',
            mediaTypes: {
              banner: { sizes: [[300, 250]] },
              video: {
                context: 'outstream',
                playerSize: [[300, 250]],
              }
            },
          }).withParams().build();
          const bid02 = new BidRequestBuilder({
            adUnitCode: 'adunit-code-02',
            mediaTypes: {
              banner: { sizes: [[300, 250]] },
              video: {
                context: 'outstream',
                playerSize: [[300, 250]],
                renderer: {
                  url: 'https://url.tld',
                  render: () => true,
                  backupOnly: true
                }
              }
            },
          }).withParams().build();
          const bidderRequest = new BidderRequestBuilder().build();
          const request = spec.buildRequests([bid01, bid02], bidderRequest)[0];

          expect(request.data.adUnits[0].mediaTypes.video.playerName).to.equal('adagio');
          expect(request.data.adUnits[1].mediaTypes.video.playerName).to.equal('adagio');
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
              api: 'val', // will be removed because invalid
              playbackmethod: ['val'], // will be removed because invalid
            }
          },
        }).withParams({
          // options in video, will overide
          video: {
            skip: 1,
            skipafter: 4,
            minduration: 10,
            maxduration: 30,
            plcmt: 4,
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
          plcmt: 4,
          protocols: [8],
          w: 300,
          h: 250
        };

        const requests = spec.buildRequests([bid01], bidderRequest);
        expect(requests).to.have.lengthOf(1);
        expect(requests[0].data.adUnits[0].mediaTypes.video).to.deep.equal(expected);
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
        const bid01 = new BidRequestBuilder({ ortb2: { source: { ext: { schain } } } }).withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data).to.have.all.keys(expectedDataKeys);
        expect(requests[0].data.schain).to.exist;
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

        sandbox.stub(config, 'getConfig')
          .withArgs('userSync').returns({ syncEnabled: true })
          .withArgs('coppa').returns(true);

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.regs.coppa.required).to.equal(1);
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

    describe('with GPP', function() {
      const bid01 = new BidRequestBuilder().withParams().build();

      const gpp = 'gpp_consent_string';
      const gppSid = [1];

      context('When GPP is defined', function() {
        it('send gpp and gppSid coming from ortb2 to the server', function() {
          const bidderRequest = new BidderRequestBuilder({
            ortb2: {
              regs: {
                gpp,
                gpp_sid: gppSid,
              }
            }
          }).build();

          const requests = spec.buildRequests([bid01], bidderRequest);

          expect(requests[0].data.regs.gpp).to.equal(gpp);
          expect(requests[0].data.regs.gppSid).to.equal(gppSid);
        });
      });

      context('When GPP not defined in any modules', function() {
        it('send empty gpp and gppSid', function() {
          const bidderRequest = new BidderRequestBuilder({}).build();

          const requests = spec.buildRequests([bid01], bidderRequest);

          expect(requests[0].data.regs.gpp).to.equal('');
          expect(requests[0].data.regs.gppSid).to.be.empty;
        });
      });
    });

    describe('with userID modules', function() {
      const userIdAsEids = [{
        'source': 'pubcid.org',
        'uids': [
          {
            'atype': 1,
            'id': '01EAJWWNEPN3CYMM5N8M5VXY22'
          }
        ]
      }];

      it('should send "user.eids" in the request for Prebid.js supported modules only', function() {
        const bid01 = new BidRequestBuilder({
          userIdAsEids
        }).withParams().build();

        const bidderRequest = new BidderRequestBuilder().build();

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.user.eids).to.deep.equal(userIdAsEids);
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

        expect(requests[0].data.adUnits[0].mediaTypes.video.floor).to.be.undefined;
      });
    });

    describe('with user-sync iframe enabled', function () {
      const bid01 = new BidRequestBuilder().withParams().build();

      it('should send the UsIfr flag set to "true" in the request', function () {
        const bidderRequest = new BidderRequestBuilder().build();

        sandbox.stub(config, 'getConfig')
          .withArgs('userSync')
          .returns({ syncEnabled: true });

        sandbox.stub(userSync, 'canBidderRegisterSync')
          .withArgs('iframe', 'adagio')
          .returns(true);

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.usIfr).to.equal(true);
      });
    });

    describe('with user-sync iframe disabled', function () {
      const bid01 = new BidRequestBuilder().withParams().build();

      it('should send the UsIfr flag set to "false" in the request', function () {
        const bidderRequest = new BidderRequestBuilder().build();

        sandbox.stub(config, 'getConfig')
          .withArgs('userSync')
          .returns({ syncEnabled: true });

        sandbox.stub(userSync, 'canBidderRegisterSync')
          .withArgs('iframe', 'adagio')
          .returns(false);

        const requests = spec.buildRequests([bid01], bidderRequest);

        expect(requests[0].data.usIfr).to.equal(false);
      });
    });

    describe('with GPID', function () {
      const gpid = '/12345/my-gpt-tag-0';

      it('should add preferred gpid to the request', function () {
        const bid01 = new BidRequestBuilder().withParams().build();
        bid01.ortb2Imp = {
          ext: {
            gpid: gpid
          }
        };
        const bidderRequest = new BidderRequestBuilder().build();
        const requests = spec.buildRequests([bid01], bidderRequest);
        expect(requests[0].data.adUnits[0].gpid).to.exist.and.equal(gpid);
      });

      it('should add backup gpid to the request', function () {
        const bid01 = new BidRequestBuilder().withParams().build();
        bid01.ortb2Imp = {
          ext: {
            data: {},
            gpid,
          }
        };
        const bidderRequest = new BidderRequestBuilder().build();
        const requests = spec.buildRequests([bid01], bidderRequest);
        expect(requests[0].data.adUnits[0].gpid).to.exist.and.equal(gpid);
      });
    });

    describe('with DSA', function() {
      it('should add DSA to the request', function() {
        const dsaObject = {
          dsarequired: 1,
          pubrender: 1,
          datatopub: 2,
          transparency: [{
            domain: 'domain.com',
            dsaparams: [1, 2]
          }]
        }

        const bid01 = new BidRequestBuilder().withParams().build();

        const bidderRequest = new BidderRequestBuilder({
          ortb2: {
            regs: {
              ext: {
                dsa: dsaObject
              }
            }
          }
        }).build();
        const requests = spec.buildRequests([bid01], bidderRequest);
        expect(requests[0].data.regs.dsa).to.deep.equal(dsaObject);
      });

      it('should not add DSA to the request if not present', function() {
        const bid01 = new BidRequestBuilder().withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();
        const requests = spec.buildRequests([bid01], bidderRequest);
        expect(requests[0].data.regs.dsa).to.be.undefined;
      });
    })

    describe('with ORTB2', function() {
      it('should add ortb2 device data to the request', function() {
        const ortb2 = {
          device: {
            w: 980,
            h: 1720,
            dnt: 0,
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1',
            language: 'en',
            devicetype: 1,
            make: 'Apple',
            model: 'iPhone 12 Pro Max',
            os: 'iOS',
            osv: '17.4',
            ext: {fiftyonedegrees_deviceId: '17595-133085-133468-18092'},
          },
        };

        const bid01 = new BidRequestBuilder().withParams().build();
        const bidderRequest = new BidderRequestBuilder({ortb2}).build();
        const requests = spec.buildRequests([bid01], bidderRequest);

        const expectedData = {
          ...ortb2.device,
          language: navigator[navigator.language ? 'language' : 'userLanguage'],
          js: 1,
          geo: {},
          userAgent: navigator.userAgent,
        };

        expect(requests[0].data.device).to.deep.equal(expectedData);
      });
    });

    describe('with `rwdd` and `instl` signals', function() {
      const tests = [
        {
          n: 'Should set signals in bidRequest if value is 1',
          ortb2Imp: {
            rwdd: 1,
            instl: '1'
          },
          expected: {
            rwdd: 1,
            instl: 1
          }
        },
        {
          n: 'Should not set signals in bidRequest if value is 0',
          ortb2Imp: {
            rwdd: 0,
            instl: '0'
          },
          expected: {
            rwdd: undefined,
            instl: undefined
          }
        },
        {
          n: 'Should not set if rwdd and instl are missformated',
          ortb2Imp: {
            rwdd: 'a',
            ext: { instl: 1 }
          },
          expected: {
            rwdd: undefined,
            instl: undefined
          }
        },
        {
          n: 'Should not set rwdd and instl in bidRequest if undefined',
          ortb2Imp: {},
          expected: {
            rwdd: undefined,
            instl: undefined
          }
        }
      ]

      tests.forEach((t) => {
        it(t.n, function() {
          const bid01 = new BidRequestBuilder().withParams().build();
          bid01.ortb2Imp = t.ortb2Imp;
          const bidderRequest = new BidderRequestBuilder().build();
          const requests = spec.buildRequests([bid01], bidderRequest);
          const expected = t.expected;
          expect(requests[0].data.adUnits[0].rwdd).to.equal(expected.rwdd);
          expect(requests[0].data.adUnits[0].instl).to.equal(expected.instl);
        });
      })
    })

    describe('with endpoint compression', function() {
      it('should always use the endpoint compression option', function() {
        const bid01 = new BidRequestBuilder().withParams().build();
        const bidderRequest = new BidderRequestBuilder().build();
        const requests = spec.buildRequests([bid01], bidderRequest);
        expect(requests[0].options).to.exist;
        expect(requests[0].options.endpointCompression).to.equal(true);
      });
    });
  });

  describe('interpretResponse()', function() {
    const serverResponse = {
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

    const bidRequest = {
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
      const expectedResponse = [{
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

      const expectedResponse = [{
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
      sandbox.stub(_internal, 'hasRtd').returns(true);
      const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

      spec.interpretResponse(serverResponse, bidRequest);

      expect(spy.withArgs({
        action: 'ssp-data',
        ts: 12345,
        data: serverResponse.body.data
      }).calledOnce).to.be.true;
    });

    it('should properly try-catch an exception and return an empty array', function() {
      sandbox.stub(_internal, 'hasRtd').returns(true);
      sandbox.stub(_internal, 'getAdagioNs').returns({ queue: () => { throw new Error('test') } });
      const spy = sandbox.spy(utils, 'logError');
      expect(spec.interpretResponse(serverResponse, bidRequest)).to.be.an('array').length(0);
      expect(spy.calledOnce).to.be.true;
    });

    describe('Response with video outstream', function() {
      const bidRequestWithOutstream = utils.deepClone(bidRequest);
      bidRequestWithOutstream.data.adUnits[0].mediaTypes.video = {
        context: 'outstream',
        playerSize: [[300, 250]],
        mimes: ['video/mp4'],
        skip: 1,
        skipafter: 3
      };

      const serverResponseWithOutstream = utils.deepClone(serverResponse);
      serverResponseWithOutstream.body.bids[0].vastXml = '<VAST version="4.0"><Ad></Ad></VAST>';
      serverResponseWithOutstream.body.bids[0].mediaType = 'video';

      const defaultRendererUrl = BB_RENDERER_URL.replace('$RENDERER', 'renderer');

      it('should set related properties for video outstream context', function() {
        const bidResponse = spec.interpretResponse(serverResponseWithOutstream, bidRequestWithOutstream)[0];
        expect(bidResponse).to.have.any.keys('renderer', 'mediaType');
        expect(bidResponse.renderer).to.be.a('object');
        expect(bidResponse.renderer.url).to.equal(defaultRendererUrl);
        expect(bidResponse.renderer.loaded).to.not.be.ok;
        expect(bidResponse.width).to.equal(300);
        expect(bidResponse.height).to.equal(250);
        expect(bidResponse.vastUrl).to.match(/^data:text\/xml;/)
      });

      it('should execute Blue Billywig VAST Renderer bootstrap if defined', function() {
        window.bluebillywig = {
          renderers: [{ bootstrap: sinon.stub(), _id: 'adagio-renderer' }]
        };

        const bidResponse = spec.interpretResponse(serverResponseWithOutstream, bidRequestWithOutstream)[0];
        executeRenderer(bidResponse.renderer, bidResponse)
        sinon.assert.calledOnce(window.bluebillywig.renderers[0].bootstrap);

        delete window.bluebillywig;
      });

      it('Should logError if response does not have a vastXml or vastUrl', function() {
        utilsMock.expects('logError').withExactArgs('Adagio: no vastXml or vastUrl on bid').once();

        const localServerResponseWithOutstream = utils.deepClone(serverResponse);
        localServerResponseWithOutstream.body.bids[0].mediaType = 'video';

        const bidResponse = spec.interpretResponse(localServerResponseWithOutstream, bidRequestWithOutstream)[0];
        executeRenderer(bidResponse.renderer, bidResponse)

        utilsMock.verify();
      })

      it('should logError if Blue Billywig API is not defined', function() {
        utilsMock.expects('logError').withExactArgs('Adagio: no BlueBillywig renderers found!').once();

        const bidResponse = spec.interpretResponse(serverResponseWithOutstream, bidRequestWithOutstream)[0];
        executeRenderer(bidResponse.renderer, bidResponse)

        utilsMock.verify();
      });

      it('should logError if correct renderer is not defined', function() {
        window.bluebillywig = { renderers: [ { _id: 'adagio-another_renderer' } ] };

        utilsMock.expects('logError').withExactArgs('Adagio: couldn\'t find a renderer with ID adagio-renderer').once();

        const bidResponse = spec.interpretResponse(serverResponseWithOutstream, bidRequestWithOutstream)[0];
        executeRenderer(bidResponse.renderer, bidResponse)

        delete window.bluebillywig;
        utilsMock.verify();
      });
    });

    describe('Response with native add', function() {
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
          javascriptTrackers: '<script async src=\"https://eventrack.local/impression\"></script>',
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

      it('Should handle multiple javascriptTrackers in one single string', () => {
        const serverResponseWithNativeCopy = utils.deepClone(serverResponseWithNative);
        serverResponseWithNativeCopy.body.bids[0].admNative.eventtrackers.push(
          {
            event: 1,
            method: 2,
            url: 'https://eventrack.local/impression-2'
          },)
        const r = spec.interpretResponse(serverResponseWithNativeCopy, bidRequestNative);
        const expected = '<script async src=\"https://eventrack.local/impression\"></script>\n<script async src=\"https://eventrack.local/impression-2\"></script>';
        expect(r[0].native.javascriptTrackers).to.equal(expected);
      });
    });

    describe('Response with DSA', function() {
      const dsaResponseObj = {
        'behalf': 'Advertiser',
        'paid': 'Advertiser',
        'transparency': {
          'domain': 'dsp1domain.com',
          'params': [1, 2]
        },
        'adrender': 1
      };

      const serverResponseWithDsa = utils.deepClone(serverResponse);
      serverResponseWithDsa.body.bids[0].meta.dsa = dsaResponseObj;

      const bidResponse = spec.interpretResponse(serverResponseWithDsa, bidRequest)[0];
      expect(bidResponse.meta.dsa).to.to.deep.equals(dsaResponseObj);
    })
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

      const result = spec.getUserSyncs(syncOptions, serverResponses);

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

  describe('site information using refererDetection or window.top', function() {
    it('should returns domain, page and window.referrer in a window.top context', function() {
      const bidderRequest = new BidderRequestBuilder({
        refererInfo: {
          numIframes: 0,
          reachedTop: true,
          topmostLocation: 'https://test.io/article/a.html',
          page: 'https://test.io/article/a.html',
          domain: 'test.io',
          ref: 'https://google.com'
        }
      }).build();

      expect(_internal.getSite(bidderRequest)).to.deep.equal({
        domain: 'test.io',
        page: 'https://test.io/article/a.html',
        referrer: 'https://google.com',
        top: true
      });
    });

    it('should returns domain and page in a cross-domain w/ top domain reached context', function() {
      sandbox.stub(utils, 'canAccessWindowTop').returns(false);
      sandbox.stub(utils, 'getWindowSelf').returns({
        document: {
          referrer: 'https://google.com'
        }
      });

      const info = {
        numIframes: 0,
        reachedTop: true,
        page: 'http://level.io/',
        topmostLocation: 'http://level.io/',
        stack: [
          'http://level.io/',
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: '',
        domain: 'level.io',
        ref: null,
      };

      const bidderRequest = new BidderRequestBuilder({
        refererInfo: info
      }).build();

      expect(_internal.getSite(bidderRequest)).to.deep.equal({
        domain: 'level.io',
        page: 'http://level.io/',
        referrer: 'https://google.com',
        top: true
      });
    });

    it('should return info in a cross-domain w/o top domain reached and w/o ancestor context', function() {
      sandbox.stub(utils, 'canAccessWindowTop').returns(false);

      const info = {
        numIframes: 2,
        reachedTop: false,
        topmostLocation: 'http://example.com/iframe1.html',
        stack: [
          null,
          'http://example.com/iframe1.html',
          'http://example.com/iframe2.html'
        ],
        canonicalUrl: '',
        page: null,
        domain: null,
        ref: null
      };

      const bidderRequest = new BidderRequestBuilder({
        refererInfo: info
      }).build();

      const s = _internal.getSite(bidderRequest)
      expect(s.domain).equal('example.com')
      expect(s.page).equal('http://example.com/iframe1.html')
      expect(s.referrer).match(/^https?:\/\/.+/);
      expect(s.top).equal(false)
    });
  });
});
