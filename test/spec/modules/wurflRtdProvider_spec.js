import {
  wurflSubmodule,
  storage
} from 'modules/wurflRtdProvider';
import * as ajaxModule from 'src/ajax';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import * as prebidGlobalModule from 'src/prebidGlobal.js';
import { guardOrtb2Fragments } from 'libraries/objectGuard/ortbGuard.js';
import { config } from 'src/config.js';

describe('wurflRtdProvider', function () {
  describe('wurflSubmodule', function () {
    const altHost = 'http://example.local/wurfl.js';

    // Global cleanup to ensure debug config doesn't leak between tests
    afterEach(function () {
      config.resetConfig();
    });

    const wurfl_pbjs = {
      caps: ['wurfl_id', 'advertised_browser', 'advertised_browser_version', 'advertised_device_os', 'advertised_device_os_version', 'ajax_support_javascript', 'brand_name', 'complete_device_name', 'density_class', 'form_factor', 'is_android', 'is_app_webview', 'is_connected_tv', 'is_full_desktop', 'is_ios', 'is_mobile', 'is_ott', 'is_phone', 'is_robot', 'is_smartphone', 'is_smarttv', 'is_tablet', 'manufacturer_name', 'marketing_name', 'max_image_height', 'max_image_width', 'model_name', 'physical_screen_height', 'physical_screen_width', 'pixel_density', 'pointing_method', 'resolution_height', 'resolution_width'],
      over_quota: 0,
      sampling_rate: 100,
      global: {
        basic_set: {
          cap_indices: [0, 9, 15, 16, 17, 18, 32]
        },
        publisher: {
          cap_indices: [1, 2, 3, 4, 5]
        }
      },
      bidders: {
        bidder1: {
          cap_indices: [6, 7, 8, 10, 11, 26, 27]
        },
        bidder2: {
          cap_indices: [12, 13, 14, 19, 20, 21, 22]
        }
      }
    }
    const WURFL = {
      advertised_browser: 'Chrome Mobile',
      advertised_browser_version: '130.0.0.0',
      advertised_device_os: 'Android',
      advertised_device_os_version: '6.0',
      ajax_support_javascript: !0,
      brand_name: 'Google',
      complete_device_name: 'Google Nexus 5',
      density_class: '3.0',
      form_factor: 'Feature Phone',
      is_android: !0,
      is_app_webview: !1,
      is_connected_tv: !1,
      is_full_desktop: !1,
      is_ios: !1,
      is_mobile: !0,
      is_ott: !1,
      is_phone: !0,
      is_robot: !1,
      is_smartphone: !1,
      is_smarttv: !1,
      is_tablet: !1,
      manufacturer_name: 'LG',
      marketing_name: '',
      max_image_height: 640,
      max_image_width: 360,
      model_name: 'Nexus 5',
      physical_screen_height: 110,
      physical_screen_width: 62,
      pixel_density: 443,
      pointing_method: 'touchscreen',
      resolution_height: 1920,
      resolution_width: 1080,
      wurfl_id: 'lg_nexus5_ver1',
    };

    // expected analytics values
    const expectedStatsURL = 'https://stats.prebid.wurflcloud.com/v2/prebid/stats';
    const expectedData = JSON.stringify({ bidders: ['bidder1', 'bidder2'] });

    let sandbox;
    // originalUserAgentData to restore after tests
    let originalUAData;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      window.WURFLPromises = {
        init: new Promise(function (resolve, reject) { resolve({ WURFL, wurfl_pbjs }) }),
        complete: new Promise(function (resolve, reject) { resolve({ WURFL, wurfl_pbjs }) }),
      };
      originalUAData = window.navigator.userAgentData;
      // Initialize module with clean state for each test
      wurflSubmodule.init({ params: {} });
    });

    afterEach(() => {
      // Restore the original functions
      sandbox.restore();
      window.WURFLPromises = undefined;
      Object.defineProperty(window.navigator, 'userAgentData', {
        value: originalUAData,
        configurable: true,
      });
    });

    // Bid request config
    const reqBidsConfigObj = {
      adUnits: [{
        bids: [
          { bidder: 'bidder1' },
          { bidder: 'bidder2' },
          { bidder: 'bidder3' },
        ]
      }],
      ortb2Fragments: {
        global: {
          device: {},
        },
        bidder: {},
      }
    };

    // Client Hints tests
    describe('Client Hints support', () => {
      it('should collect and send client hints when available', (done) => {
        const clock = sinon.useFakeTimers();
        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        // Mock Client Hints
        const mockClientHints = {
          architecture: 'arm',
          bitness: '64',
          model: 'Pixel 5',
          platformVersion: '13.0.0',
          uaFullVersion: '130.0.6723.58',
          fullVersionList: [
            { brand: 'Chromium', version: '130.0.6723.58' }
          ]
        };

        const getHighEntropyValuesStub = sandbox.stub().resolves(mockClientHints);
        Object.defineProperty(navigator, 'userAgentData', {
          value: { getHighEntropyValues: getHighEntropyValuesStub },
          configurable: true,
          writable: true
        });

        // Empty cache to trigger async load
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const callback = async () => {
          // Verify client hints were requested
          expect(getHighEntropyValuesStub.calledOnce).to.be.true;
          expect(getHighEntropyValuesStub.calledWith(
            ['architecture', 'bitness', 'model', 'platformVersion', 'uaFullVersion', 'fullVersionList']
          )).to.be.true;

          try {
            // Use tickAsync to properly handle promise microtasks
            await clock.tickAsync(1);

            // Now verify WURFL.js was loaded with client hints in URL
            expect(loadExternalScriptStub.called).to.be.true;
            const scriptUrl = loadExternalScriptStub.getCall(0).args[0];

            const url = new URL(scriptUrl);
            const uachParam = url.searchParams.get('uach');
            expect(uachParam).to.not.be.null;

            const parsedHints = JSON.parse(uachParam);
            expect(parsedHints).to.deep.equal(mockClientHints);

            clock.restore();
            done();
          } catch (err) {
            clock.restore();
            done(err);
          }
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      })
      it('should load WURFL.js without client hints when not available', (done) => {
        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        // No client hints available
        Object.defineProperty(navigator, 'userAgentData', {
          value: undefined,
          configurable: true,
          writable: true
        });

        // Empty cache to trigger async load
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const callback = () => {
          // Verify WURFL.js was loaded without uach parameter
          expect(loadExternalScriptStub.calledOnce).to.be.true;
          const scriptUrl = loadExternalScriptStub.getCall(0).args[0];

          const url = new URL(scriptUrl);
          const uachParam = url.searchParams.get('uach');
          expect(uachParam).to.be.null;

          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });
    });

    // TTL handling tests
    describe('TTL handling', () => {
      it('should use valid (not expired) cached data without triggering async load', (done) => {
        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        // Setup cache with valid TTL (expires in future)
        const futureExpiry = Date.now() + 1000000; // expires in future
        const cachedData = {
          WURFL,
          wurfl_pbjs: { ...wurfl_pbjs, ttl: 2592000 },
          expire_at: futureExpiry
        };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const callback = () => {
          // Verify global FPD enrichment happened (not over quota)
          expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.include({
            make: 'Google',
            model: 'Nexus 5',
            devicetype: 4
          });

          // Verify no async load was triggered (cache is valid)
          expect(loadExternalScriptStub.called).to.be.false;

          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should use expired cached data and trigger async refresh (without Client Hints)', (done) => {
        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        Object.defineProperty(navigator, 'userAgentData', {
          value: undefined,
          configurable: true,
          writable: true
        });
        // Setup cache with expired TTL
        const pastExpiry = Date.now() - 1000; // expired 1 second ago
        const cachedData = {
          WURFL,
          wurfl_pbjs: { ...wurfl_pbjs, ttl: 2592000 },
          expire_at: pastExpiry
        };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const callback = () => {
          // Verify expired cache data is still used for enrichment
          expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.include({
            make: 'Google',
            model: 'Nexus 5',
            devicetype: 4
          });

          // Verify bidders were enriched
          expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1).to.exist;
          expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2).to.exist;

          // Verify async load WAS triggered for refresh (cache expired)
          expect(loadExternalScriptStub.calledOnce).to.be.true;

          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });
    });

    // Debug mode initialization tests
    describe('Debug mode', () => {
      afterEach(() => {
        // Clean up window object after each test
        delete window.WurflRtdDebug;
        // Reset global config
        config.resetConfig();
      });

      it('should not create window.WurflRtdDebug when global debug=false', () => {
        config.setConfig({ debug: false });
        const moduleConfig = { params: {} };
        wurflSubmodule.init(moduleConfig);
        expect(window.WurflRtdDebug).to.be.undefined;
      });

      it('should not create window.WurflRtdDebug when global debug is not configured', () => {
        config.resetConfig();
        const moduleConfig = { params: {} };
        wurflSubmodule.init(moduleConfig);
        expect(window.WurflRtdDebug).to.be.undefined;
      });

      it('should create window.WurflRtdDebug when global debug=true', () => {
        config.setConfig({ debug: true });
        const moduleConfig = { params: {} };
        wurflSubmodule.init(moduleConfig);
        expect(window.WurflRtdDebug).to.exist;
        expect(window.WurflRtdDebug.dataSource).to.equal('unknown');
        expect(window.WurflRtdDebug.cacheExpired).to.be.false;
      });
    });

    it('initialises the WURFL RTD provider', function () {
      expect(wurflSubmodule.init()).to.be.true;
    });

    describe('A/B testing', () => {
      it('should return true when A/B testing is disabled', () => {
        const config = { params: { abTest: false } };
        expect(wurflSubmodule.init(config)).to.be.true;
      });

      it('should return true when A/B testing is not configured', () => {
        const config = { params: {} };
        expect(wurflSubmodule.init(config)).to.be.true;
      });

      it('should return true for users in treatment group (random < abSplit)', () => {
        sandbox.stub(Math, 'random').returns(0.25); // 0.25 < 0.5 = treatment
        const config = { params: { abTest: true, abName: 'test_sept', abSplit: 0.5 } };
        expect(wurflSubmodule.init(config)).to.be.true;
      });

      it('should return true for users in control group (random >= abSplit)', () => {
        sandbox.stub(Math, 'random').returns(0.75); // 0.75 >= 0.5 = control
        const config = { params: { abTest: true, abName: 'test_sept', abSplit: 0.5 } };
        expect(wurflSubmodule.init(config)).to.be.true;
      });

      it('should use default abSplit of 0.5 when not specified', () => {
        sandbox.stub(Math, 'random').returns(0.40); // 0.40 < 0.5 = treatment
        const config = { params: { abTest: true, abName: 'test_sept' } };
        expect(wurflSubmodule.init(config)).to.be.true;
      });

      it('should handle abSplit of 0 (all control)', () => {
        sandbox.stub(Math, 'random').returns(0.01); // split <= 0 = control
        const config = { params: { abTest: true, abName: 'test_sept', abSplit: 0 } };
        expect(wurflSubmodule.init(config)).to.be.true;
      });

      it('should handle abSplit of 1 (all treatment)', () => {
        sandbox.stub(Math, 'random').returns(0.99); // split >= 1 = treatment
        const config = { params: { abTest: true, abName: 'test_sept', abSplit: 1 } };
        expect(wurflSubmodule.init(config)).to.be.true;
      });

      it('should skip enrichment for control group in getBidRequestData', (done) => {
        sandbox.stub(Math, 'random').returns(0.75); // Control group
        const config = { params: { abTest: true, abName: 'test_sept', abSplit: 0.5 } };

        // Initialize with A/B test config
        wurflSubmodule.init(config);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          // Control group should not enrich
          expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.equal({});
          expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.equal({});
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
      });

      it('should send beacon with ab_name and ab_variant for treatment group', (done) => {
        sandbox.stub(Math, 'random').returns(0.25); // Treatment group
        const config = { params: { abTest: true, abName: 'test_sept', abSplit: 0.5 } };

        // Initialize with A/B test config
        wurflSubmodule.init(config);

        const cachedData = { WURFL, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [{ bidder: 'bidder1' }]
              }
            ]
          };

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);
          expect(payload).to.have.property('ab_name', 'test_sept');
          expect(payload).to.have.property('ab_variant', 'treatment');
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
      });

      it('should send beacon with ab_name and ab_variant for control group', (done) => {
        sandbox.stub(Math, 'random').returns(0.75); // Control group
        const config = { params: { abTest: true, abName: 'test_sept', abSplit: 0.5 } };

        // Initialize with A/B test config
        wurflSubmodule.init(config);

        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [{ bidder: 'bidder1' }]
              }
            ]
          };

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);
          expect(payload).to.have.property('ab_name', 'test_sept');
          expect(payload).to.have.property('ab_variant', 'control');
          expect(payload).to.have.property('enrichment', 'none');
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
      });

      describe('ABTestManager behavior', () => {
        it('should disable A/B test when abTest is false', () => {
          const config = { params: { abTest: false } };
          wurflSubmodule.init(config);
          // A/B test disabled, so enrichment should proceed normally
          expect(wurflSubmodule.init(config)).to.be.true;
        });

        it('should assign control group when split is 0', (done) => {
          sandbox.stub(Math, 'random').returns(0.01);
          const config = { params: { abTest: true, abName: 'test_split', abSplit: 0, abExcludeLCE: false } };
          wurflSubmodule.init(config);

          const cachedData = { WURFL, wurfl_pbjs };
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Control group should skip enrichment
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.equal({});
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should assign treatment group when split is 1', (done) => {
          sandbox.stub(Math, 'random').returns(0.99);
          const config = { params: { abTest: true, abName: 'test_split', abSplit: 1, abExcludeLCE: false } };
          wurflSubmodule.init(config);

          const cachedData = { WURFL, wurfl_pbjs };
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Treatment group should enrich
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.not.deep.equal({});
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should use default abName when not provided', (done) => {
          sandbox.stub(Math, 'random').returns(0.25);
          const config = { params: { abTest: true, abSplit: 0.5, abExcludeLCE: false } };
          wurflSubmodule.init(config);

          const cachedData = { WURFL, wurfl_pbjs };
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
          sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
            getHighestCpmBids: () => []
          });

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            const auctionDetails = {
              bidsReceived: [
                { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
              ],
              adUnits: [
                {
                  code: 'ad1',
                  bids: [{ bidder: 'bidder1' }]
                }
              ]
            };

            wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

            const payload = JSON.parse(sendBeaconStub.getCall(0).args[1]);
            expect(payload).to.have.property('ab_name', 'unknown');
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should exclude LCE from A/B test when abExcludeLCE is true (control group)', (done) => {
          sandbox.stub(Math, 'random').returns(0.75); // Control group
          const config = { params: { abTest: true, abName: 'test_lce', abSplit: 0.5, abExcludeLCE: true } };
          wurflSubmodule.init(config);

          // Trigger LCE (no cache)
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
          sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
            getHighestCpmBids: () => []
          });

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Control group should still enrich with LCE when excluded
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.have.property('js', 1);

            const auctionDetails = {
              bidsReceived: [
                { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
              ],
              adUnits: [
                {
                  code: 'ad1',
                  bids: [{ bidder: 'bidder1' }]
                }
              ]
            };

            wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

            const payload = JSON.parse(sendBeaconStub.getCall(0).args[1]);
            // Beacon should NOT include ab_name and ab_variant when LCE excluded
            expect(payload).to.not.have.property('ab_name');
            expect(payload).to.not.have.property('ab_variant');
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should exclude LCE from A/B test when abExcludeLCE is true (treatment group)', (done) => {
          sandbox.stub(Math, 'random').returns(0.25); // Treatment group
          const config = { params: { abTest: true, abName: 'test_lce', abSplit: 0.5, abExcludeLCE: true } };
          wurflSubmodule.init(config);

          // Trigger LCE (no cache)
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
          sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
            getHighestCpmBids: () => []
          });

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Treatment group should enrich with LCE
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.have.property('js', 1);

            const auctionDetails = {
              bidsReceived: [
                { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
              ],
              adUnits: [
                {
                  code: 'ad1',
                  bids: [{ bidder: 'bidder1' }]
                }
              ]
            };

            wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

            const payload = JSON.parse(sendBeaconStub.getCall(0).args[1]);
            // Beacon should NOT include ab_name and ab_variant when LCE excluded
            expect(payload).to.not.have.property('ab_name');
            expect(payload).to.not.have.property('ab_variant');
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should include WURFL in A/B test when abExcludeLCE is true (control group)', (done) => {
          sandbox.stub(Math, 'random').returns(0.75); // Control group
          const config = { params: { abTest: true, abName: 'test_wurfl', abSplit: 0.5, abExcludeLCE: true } };
          wurflSubmodule.init(config);

          // Provide WURFL cache
          const cachedData = { WURFL, wurfl_pbjs };
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
          sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
            getHighestCpmBids: () => []
          });

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Control group should skip enrichment
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.equal({});

            const auctionDetails = {
              bidsReceived: [
                { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
              ],
              adUnits: [
                {
                  code: 'ad1',
                  bids: [{ bidder: 'bidder1' }]
                }
              ]
            };

            wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

            const payload = JSON.parse(sendBeaconStub.getCall(0).args[1]);
            // Beacon should include ab_name and ab_variant for WURFL
            expect(payload).to.have.property('ab_name', 'test_wurfl');
            expect(payload).to.have.property('ab_variant', 'control');
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should include LCE in A/B test when abExcludeLCE is false (control group)', (done) => {
          sandbox.stub(Math, 'random').returns(0.75); // Control group
          const config = { params: { abTest: true, abName: 'test_include_lce', abSplit: 0.5, abExcludeLCE: false } };
          wurflSubmodule.init(config);

          // Trigger LCE (no cache)
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
          sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
            getHighestCpmBids: () => []
          });

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Control group should skip enrichment even with LCE
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.equal({});

            const auctionDetails = {
              bidsReceived: [
                { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
              ],
              adUnits: [
                {
                  code: 'ad1',
                  bids: [{ bidder: 'bidder1' }]
                }
              ]
            };

            wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

            const payload = JSON.parse(sendBeaconStub.getCall(0).args[1]);
            // Beacon should include ab_name and ab_variant
            expect(payload).to.have.property('ab_name', 'test_include_lce');
            expect(payload).to.have.property('ab_variant', 'control');
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should include LCE in A/B test when abExcludeLCE is false (treatment group)', (done) => {
          sandbox.stub(Math, 'random').returns(0.25); // Treatment group
          const config = { params: { abTest: true, abName: 'test_include_lce', abSplit: 0.5, abExcludeLCE: false } };
          wurflSubmodule.init(config);

          // Trigger LCE (no cache)
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
          sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
            getHighestCpmBids: () => []
          });

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Treatment group should enrich with LCE
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.have.property('js', 1);

            const auctionDetails = {
              bidsReceived: [
                { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
              ],
              adUnits: [
                {
                  code: 'ad1',
                  bids: [{ bidder: 'bidder1' }]
                }
              ]
            };

            wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

            const payload = JSON.parse(sendBeaconStub.getCall(0).args[1]);
            // Beacon should include ab_name and ab_variant
            expect(payload).to.have.property('ab_name', 'test_include_lce');
            expect(payload).to.have.property('ab_variant', 'treatment');
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });

        it('should default abExcludeLCE to true', (done) => {
          sandbox.stub(Math, 'random').returns(0.75); // Control group
          const config = { params: { abTest: true, abName: 'test_default', abSplit: 0.5 } }; // No abExcludeLCE specified
          wurflSubmodule.init(config);

          // Trigger LCE (no cache)
          sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
          sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
          sandbox.stub(storage, 'hasLocalStorage').returns(true);

          const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);
          sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
            getHighestCpmBids: () => []
          });

          reqBidsConfigObj.ortb2Fragments.global.device = {};
          reqBidsConfigObj.ortb2Fragments.bidder = {};

          const callback = () => {
            // Should behave like abExcludeLCE: true (control enriches with LCE)
            expect(reqBidsConfigObj.ortb2Fragments.global.device).to.have.property('js', 1);

            const auctionDetails = {
              bidsReceived: [
                { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
              ],
              adUnits: [
                {
                  code: 'ad1',
                  bids: [{ bidder: 'bidder1' }]
                }
              ]
            };

            wurflSubmodule.onAuctionEndEvent(auctionDetails, config, null);

            const payload = JSON.parse(sendBeaconStub.getCall(0).args[1]);
            // Beacon should NOT include ab_name and ab_variant (default is true)
            expect(payload).to.not.have.property('ab_name');
            expect(payload).to.not.have.property('ab_variant');
            done();
          };

          wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
        });
      });
    });

    it('should enrich multiple bidders with cached WURFL data (not over quota)', (done) => {
      // Reset reqBidsConfigObj to clean state
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      // Setup localStorage with cached WURFL data
      const cachedData = { WURFL, wurfl_pbjs };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      const callback = () => {
        // Verify global FPD has device data (not over quota)
        expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.include({
          make: 'Google',
          model: 'Nexus 5',
          devicetype: 4,
          os: 'Android',
          osv: '6.0',
          hwv: 'Nexus 5',
          h: 1920,
          w: 1080,
          ppi: 443,
          pxratio: 3.0,
          js: 1
        });

        // Verify global has ext.wurfl with basic+pub capabilities (new behavior)
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl).to.exist;

        // Calculate expected basic+pub caps
        const basicIndices = wurfl_pbjs.global.basic_set.cap_indices;
        const pubIndices = wurfl_pbjs.global.publisher.cap_indices;
        const allBasicPubIndices = [...new Set([...basicIndices, ...pubIndices])];
        const expectedBasicPubCaps = {};
        allBasicPubIndices.forEach(index => {
          const capName = wurfl_pbjs.caps[index];
          if (capName && capName in WURFL) {
            expectedBasicPubCaps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl).to.deep.equal(expectedBasicPubCaps);

        // Under quota, authorized bidders: should get only bidder-specific caps (delta)
        const bidder1Indices = wurfl_pbjs.bidders.bidder1.cap_indices;
        const expectedBidder1Caps = {};
        bidder1Indices.forEach(index => {
          const capName = wurfl_pbjs.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder1Caps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1.device.ext.wurfl).to.deep.equal(expectedBidder1Caps);

        const bidder2Indices = wurfl_pbjs.bidders.bidder2.cap_indices;
        const expectedBidder2Caps = {};
        bidder2Indices.forEach(index => {
          const capName = wurfl_pbjs.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder2Caps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2.device.ext.wurfl).to.deep.equal(expectedBidder2Caps);

        // bidder3 is NOT authorized, should get empty object (inherits from global)
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder3).to.not.exist;

        done();
      };

      const config = { params: {} };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
    });

    it('should use LCE data when cache is empty and load WURFL.js async', (done) => {
      // Reset reqBidsConfigObj to clean state
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      // Setup empty cache
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      // Set global debug flag
      config.setConfig({ debug: true });

      const expectedURL = new URL(altHost);
      expectedURL.searchParams.set('debug', 'true');
      expectedURL.searchParams.set('mode', 'prebid2');
      expectedURL.searchParams.set('bidders', 'bidder1,bidder2,bidder3');

      const callback = () => {
        // Verify global FPD has LCE device data
        expect(reqBidsConfigObj.ortb2Fragments.global.device).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.global.device.js).to.equal(1);

        // Verify ext.wurfl.is_robot is set
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl.is_robot).to.be.false;

        // No bidder enrichment should occur without cached WURFL data
        expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.equal({});

        done();
      };

      const moduleConfig = {
        params: {
          altHost: altHost,
        }
      };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, moduleConfig, userConsent);

      // Verify WURFL.js is loaded async for future requests
      expect(loadExternalScriptStub.calledOnce).to.be.true;
      const loadExternalScriptCall = loadExternalScriptStub.getCall(0);
      expect(loadExternalScriptCall.args[0]).to.equal(expectedURL.toString());
      expect(loadExternalScriptCall.args[2]).to.equal('wurfl');
    });

    it('should not include device.w and device.h in LCE enrichment (removed in v2.3.0 - fingerprinting APIs)', (done) => {
      // Reset reqBidsConfigObj to clean state
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      // Setup empty cache to trigger LCE
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      // Mock a typical desktop Chrome user agent to get consistent device detection
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        configurable: true,
        writable: true
      });

      const callback = () => {
        const device = reqBidsConfigObj.ortb2Fragments.global.device;

        // Verify device object exists
        expect(device).to.exist;

        // CRITICAL: Verify device.w and device.h are NOT present
        // These were removed in v2.3.0 due to fingerprinting API concerns (screen.availWidth, screen.width/height)
        expect(device).to.not.have.property('w');
        expect(device).to.not.have.property('h');

        // Verify other ORTB2_DEVICE_FIELDS properties ARE populated when available
        // From ORTB2_DEVICE_FIELDS: ['make', 'model', 'devicetype', 'os', 'osv', 'hwv', 'h', 'w', 'ppi', 'pxratio', 'js']
        expect(device.js).to.equal(1); // Always present

        // These should be present based on UA detection
        expect(device.make).to.be.a('string').and.not.be.empty;
        expect(device.devicetype).to.be.a('number'); // ORTB2_DEVICE_TYPE.PERSONAL_COMPUTER (2)
        expect(device.os).to.be.a('string').and.not.be.empty;

        // osv, model, hwv may be present depending on UA
        if (device.osv !== undefined) {
          expect(device.osv).to.be.a('string');
        }
        if (device.model !== undefined) {
          expect(device.model).to.be.a('string');
        }
        if (device.hwv !== undefined) {
          expect(device.hwv).to.be.a('string');
        }

        // pxratio uses OS-based hardcoded values (v2.4.0+), not window.devicePixelRatio (fingerprinting API)
        if (device.pxratio !== undefined) {
          expect(device.pxratio).to.be.a('number');
        }

        // ppi is not typically populated by LCE (would come from WURFL server-side data)
        // Just verify it doesn't exist or is undefined in LCE mode
        expect(device.ppi).to.be.undefined;

        // Verify ext.wurfl.is_robot is set
        expect(device.ext).to.exist;
        expect(device.ext.wurfl).to.exist;
        expect(device.ext.wurfl.is_robot).to.be.a('boolean');

        // Restore original userAgent
        Object.defineProperty(navigator, 'userAgent', {
          value: originalUserAgent,
          configurable: true,
          writable: true
        });

        done();
      };

      const moduleConfig = { params: {} };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, moduleConfig, userConsent);
    });

    describe('LCE bot detection', () => {
      let originalUserAgent;

      beforeEach(() => {
        // Setup empty cache to trigger LCE
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        // Save original userAgent
        originalUserAgent = navigator.userAgent;
      });

      afterEach(() => {
        // Restore original userAgent
        Object.defineProperty(navigator, 'userAgent', {
          value: originalUserAgent,
          configurable: true,
          writable: true
        });
      });

      it('should detect Googlebot and set is_robot to true', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          configurable: true,
          writable: true
        });

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext).to.exist;
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl).to.exist;
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl.is_robot).to.be.true;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should detect BingPreview and set is_robot to true', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534+ (KHTML, like Gecko) BingPreview/1.0b',
          configurable: true,
          writable: true
        });

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl.is_robot).to.be.true;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should detect Yahoo! Slurp and set is_robot to true', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
          configurable: true,
          writable: true
        });

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl.is_robot).to.be.true;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should detect +http bot token and set is_robot to true', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'SomeBot/1.0 (+http://example.com/bot)',
          configurable: true,
          writable: true
        });

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl.is_robot).to.be.true;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should set is_robot to false for regular Chrome user agent', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          configurable: true,
          writable: true
        });

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl.is_robot).to.be.false;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should set is_robot to false for regular mobile Safari user agent', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          configurable: true,
          writable: true
        });

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl.is_robot).to.be.false;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });
    });

    describe('LCE pxratio (OS-based device pixel ratio)', () => {
      let originalUserAgent;

      beforeEach(() => {
        // Setup empty cache to trigger LCE
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        // Save original userAgent
        originalUserAgent = navigator.userAgent;
      });

      afterEach(() => {
        // Restore original userAgent
        Object.defineProperty(navigator, 'userAgent', {
          value: originalUserAgent,
          configurable: true,
          writable: true
        });
      });

      it('should set pxratio to 2.0 for Android devices', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
          configurable: true,
          writable: true
        });

        const callback = () => {
          const device = reqBidsConfigObj.ortb2Fragments.global.device;
          expect(device.pxratio).to.equal(2.0);
          expect(device.os).to.equal('Android');
          expect(device.devicetype).to.equal(4); // PHONE
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should set pxratio to 3.0 for iOS (iPhone) devices', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          configurable: true,
          writable: true
        });

        const callback = () => {
          const device = reqBidsConfigObj.ortb2Fragments.global.device;
          expect(device.pxratio).to.equal(3.0);
          expect(device.os).to.equal('iOS');
          expect(device.devicetype).to.equal(4); // PHONE
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should set pxratio to 2.0 for iPadOS (iPad) devices', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          configurable: true,
          writable: true
        });

        const callback = () => {
          const device = reqBidsConfigObj.ortb2Fragments.global.device;
          expect(device.pxratio).to.equal(2.0);
          expect(device.os).to.equal('iPadOS');
          expect(device.devicetype).to.equal(5); // TABLET
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should set pxratio to 1.0 for desktop/other devices (default)', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          configurable: true,
          writable: true
        });

        const callback = () => {
          const device = reqBidsConfigObj.ortb2Fragments.global.device;
          expect(device.pxratio).to.equal(1.0);
          expect(device.os).to.equal('Windows');
          expect(device.devicetype).to.equal(2); // PERSONAL_COMPUTER
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should set pxratio to 1.0 for macOS devices (default)', (done) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          configurable: true,
          writable: true
        });

        const callback = () => {
          const device = reqBidsConfigObj.ortb2Fragments.global.device;
          expect(device.pxratio).to.equal(1.0);
          expect(device.os).to.equal('macOS');
          expect(device.devicetype).to.equal(2); // PERSONAL_COMPUTER
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });
    });

    it('should enrich only bidders when over quota', (done) => {
      // Reset reqBidsConfigObj to clean state
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      // Setup localStorage with cached WURFL data (over quota)
      const wurfl_pbjs_over_quota = {
        ...wurfl_pbjs,
        over_quota: 1
      };
      const cachedData = { WURFL, wurfl_pbjs: wurfl_pbjs_over_quota };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      const callback = () => {
        // Verify global FPD does NOT have device data (over quota)
        expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.equal({});

        // Over quota, authorized bidders: should get basic + bidder-specific (NO pub)
        // bidder1 should get device fields + ext.wurfl with basic + bidder1-specific
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1.device).to.deep.include({
          make: 'Google',
          model: 'Nexus 5',
          devicetype: 4,
          os: 'Android',
          osv: '6.0',
          hwv: 'Nexus 5',
          h: 1920,
          w: 1080,
          ppi: 443,
          pxratio: 3.0,
          js: 1
        });
        const basicIndices = wurfl_pbjs_over_quota.global.basic_set.cap_indices;
        const bidder1Indices = wurfl_pbjs_over_quota.bidders.bidder1.cap_indices;
        const allBidder1Indices = [...new Set([...basicIndices, ...bidder1Indices])];
        const expectedBidder1AllCaps = {};
        allBidder1Indices.forEach(index => {
          const capName = wurfl_pbjs_over_quota.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder1AllCaps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1.device.ext.wurfl).to.deep.equal(expectedBidder1AllCaps);

        // bidder2 should get device fields + ext.wurfl with basic + bidder2-specific
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2.device).to.deep.include({
          make: 'Google',
          model: 'Nexus 5',
          devicetype: 4,
          os: 'Android',
          osv: '6.0',
          hwv: 'Nexus 5',
          h: 1920,
          w: 1080,
          ppi: 443,
          pxratio: 3.0,
          js: 1
        });
        const bidder2Indices = wurfl_pbjs_over_quota.bidders.bidder2.cap_indices;
        const allBidder2Indices = [...new Set([...basicIndices, ...bidder2Indices])];
        const expectedBidder2AllCaps = {};
        allBidder2Indices.forEach(index => {
          const capName = wurfl_pbjs_over_quota.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder2AllCaps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2.device.ext.wurfl).to.deep.equal(expectedBidder2AllCaps);

        // bidder3 is NOT authorized, should get nothing
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder3).to.be.undefined;

        done();
      };

      const config = { params: {} };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
    });

    it('should initialize ortb2Fragments.bidder when undefined and enrich authorized bidders (over quota)', (done) => {
      // Test the fix for ortb2Fragments.bidder being undefined
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      // Explicitly set bidder to undefined to simulate the race condition
      reqBidsConfigObj.ortb2Fragments.bidder = undefined;

      // Setup localStorage with cached WURFL data (over quota)
      const wurfl_pbjs_over_quota = {
        ...wurfl_pbjs,
        over_quota: 1
      };
      const cachedData = { WURFL, wurfl_pbjs: wurfl_pbjs_over_quota };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      const callback = () => {
        // Verify ortb2Fragments.bidder was properly initialized
        expect(reqBidsConfigObj.ortb2Fragments.bidder).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.bidder).to.be.an('object');

        // Verify global FPD does NOT have device data (over quota)
        expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.equal({});

        // Over quota, authorized bidders: should get basic + pub + bidder-specific caps (ALL)
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1.device).to.deep.include({
          make: 'Google',
          model: 'Nexus 5',
          devicetype: 4,
          os: 'Android',
          osv: '6.0',
          hwv: 'Nexus 5',
          h: 1920,
          w: 1080,
          ppi: 443,
          pxratio: 3.0,
          js: 1
        });
        const basicIndices = wurfl_pbjs_over_quota.global.basic_set.cap_indices;
        const bidder1Indices = wurfl_pbjs_over_quota.bidders.bidder1.cap_indices;
        const allBidder1Indices = [...new Set([...basicIndices, ...bidder1Indices])];
        const expectedBidder1AllCaps = {};
        allBidder1Indices.forEach(index => {
          const capName = wurfl_pbjs_over_quota.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder1AllCaps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1.device.ext.wurfl).to.deep.equal(expectedBidder1AllCaps);

        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2.device).to.deep.include({
          make: 'Google',
          model: 'Nexus 5',
          devicetype: 4
        });
        const bidder2Indices = wurfl_pbjs_over_quota.bidders.bidder2.cap_indices;
        const allBidder2Indices = [...new Set([...basicIndices, ...bidder2Indices])];
        const expectedBidder2AllCaps = {};
        allBidder2Indices.forEach(index => {
          const capName = wurfl_pbjs_over_quota.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder2AllCaps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2.device.ext.wurfl).to.deep.equal(expectedBidder2AllCaps);

        // bidder3 is NOT authorized, should get nothing
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder3).to.be.undefined;

        done();
      };

      const config = { params: {} };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
    });

    it('should work with guardOrtb2Fragments Proxy (Prebid 10.x compatibility)', (done) => {
      // Simulate Prebid 10.x where rtdModule wraps ortb2Fragments with guardOrtb2Fragments
      const plainFragments = {
        global: { device: {} },
        bidder: {}
      };

      const plainReqBidsConfigObj = {
        adUnits: [{
          bids: [
            { bidder: 'bidder1' },
            { bidder: 'bidder2' }
          ]
        }],
        ortb2Fragments: plainFragments
      };

      // Setup localStorage with cached WURFL data (over quota)
      const wurfl_pbjs_over_quota = {
        ...wurfl_pbjs,
        over_quota: 1
      };
      const cachedData = { WURFL, wurfl_pbjs: wurfl_pbjs_over_quota };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      // Wrap with guard (like rtdModule does in production)
      const guardedFragments = guardOrtb2Fragments(plainFragments, {});
      const guardedReqBidsConfigObj = { ...plainReqBidsConfigObj, ortb2Fragments: guardedFragments };

      const callback = () => {
        // Over quota, authorized bidders: should get basic + pub + bidder-specific caps (ALL)
        expect(plainFragments.bidder.bidder1).to.exist;
        expect(plainFragments.bidder.bidder1.device).to.exist;
        expect(plainFragments.bidder.bidder1.device.ext).to.exist;

        const basicIndices = wurfl_pbjs_over_quota.global.basic_set.cap_indices;
        const bidder1Indices = wurfl_pbjs_over_quota.bidders.bidder1.cap_indices;
        const allBidder1Indices = [...new Set([...basicIndices, ...bidder1Indices])];
        const expectedBidder1AllCaps = {};
        allBidder1Indices.forEach(index => {
          const capName = wurfl_pbjs_over_quota.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder1AllCaps[capName] = WURFL[capName];
          }
        });
        expect(plainFragments.bidder.bidder1.device.ext.wurfl).to.deep.equal(expectedBidder1AllCaps);

        // Verify FPD is present
        expect(plainFragments.bidder.bidder1.device).to.deep.include({
          make: 'Google',
          model: 'Nexus 5',
          devicetype: 4,
          os: 'Android',
          osv: '6.0'
        });

        // Verify bidder2 (authorized) also got enriched
        expect(plainFragments.bidder.bidder2).to.exist;
        const bidder2Indices = wurfl_pbjs_over_quota.bidders.bidder2.cap_indices;
        const allBidder2Indices = [...new Set([...basicIndices, ...bidder2Indices])];
        const expectedBidder2AllCaps = {};
        allBidder2Indices.forEach(index => {
          const capName = wurfl_pbjs_over_quota.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder2AllCaps[capName] = WURFL[capName];
          }
        });
        expect(plainFragments.bidder.bidder2.device.ext.wurfl).to.deep.equal(expectedBidder2AllCaps);

        done();
      };

      const config = { params: {} };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(guardedReqBidsConfigObj, callback, config, userConsent);
    });

    it('should pass basic+pub caps via global and authorized bidders get full caps when under quota', (done) => {
      // Reset reqBidsConfigObj to clean state
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      // Setup localStorage with cached WURFL data (NOT over quota)
      const cachedData = { WURFL, wurfl_pbjs };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      const callback = () => {
        // Verify global FPD has device data (not over quota)
        expect(reqBidsConfigObj.ortb2Fragments.global.device).to.deep.include({
          make: 'Google',
          model: 'Nexus 5',
          devicetype: 4
        });

        // Calculate expected caps for basic + pub (no bidder-specific)
        const basicIndices = wurfl_pbjs.global.basic_set.cap_indices;
        const pubIndices = wurfl_pbjs.global.publisher.cap_indices;
        const allBasicPubIndices = [...new Set([...basicIndices, ...pubIndices])];

        const expectedBasicPubCaps = {};
        allBasicPubIndices.forEach(index => {
          const capName = wurfl_pbjs.caps[index];
          if (capName && capName in WURFL) {
            expectedBasicPubCaps[capName] = WURFL[capName];
          }
        });

        // Verify global has ext.wurfl with basic+pub caps (new behavior)
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl).to.deep.equal(expectedBasicPubCaps);

        // Under quota, authorized bidders: should get only bidder-specific caps (delta)
        const bidder1Indices = wurfl_pbjs.bidders.bidder1.cap_indices;
        const expectedBidder1Caps = {};
        bidder1Indices.forEach(index => {
          const capName = wurfl_pbjs.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder1Caps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder1.device.ext.wurfl).to.deep.equal(expectedBidder1Caps);

        const bidder2Indices = wurfl_pbjs.bidders.bidder2.cap_indices;
        const expectedBidder2Caps = {};
        bidder2Indices.forEach(index => {
          const capName = wurfl_pbjs.caps[index];
          if (capName && capName in WURFL) {
            expectedBidder2Caps[capName] = WURFL[capName];
          }
        });
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder2.device.ext.wurfl).to.deep.equal(expectedBidder2Caps);

        // bidder3 is NOT authorized, should get NOTHING (inherits from global.device.ext.wurfl)
        expect(reqBidsConfigObj.ortb2Fragments.bidder.bidder3).to.not.exist;

        // Verify the caps calculation: basic+pub union in global
        const globalCapCount = Object.keys(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl).length;
        expect(globalCapCount).to.equal(allBasicPubIndices.length);

        done();
      };

      const config = { params: {} };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
    });

    it('should enrich global.device.ext.wurfl when under quota (verifies GlobalExt)', (done) => {
      // This test verifies that GlobalExt() is called and global enrichment works
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      const cachedData = { WURFL, wurfl_pbjs };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      const callback = () => {
        // Calculate expected basic+pub caps
        const basicIndices = wurfl_pbjs.global.basic_set.cap_indices;
        const pubIndices = wurfl_pbjs.global.publisher.cap_indices;
        const allBasicPubIndices = [...new Set([...basicIndices, ...pubIndices])];
        const expectedBasicPubCaps = {};
        allBasicPubIndices.forEach(index => {
          const capName = wurfl_pbjs.caps[index];
          if (capName && capName in WURFL) {
            expectedBasicPubCaps[capName] = WURFL[capName];
          }
        });

        // Verify GlobalExt() populated global.device.ext.wurfl with basic+pub
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext).to.exist;
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ext.wurfl).to.deep.equal(expectedBasicPubCaps);

        done();
      };

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
    });

    it('onAuctionEndEvent: should send analytics data using navigator.sendBeacon, if available', (done) => {
      // Reset reqBidsConfigObj to clean state
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      // Setup localStorage with cached WURFL data to populate enrichedBidders
      const cachedData = { WURFL, wurfl_pbjs };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      const sendBeaconStub = sandbox.stub(navigator, 'sendBeacon').returns(true);

      // Mock getGlobal().getHighestCpmBids()
      const mockHighestCpmBids = [
        { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1' }
      ];
      sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
        getHighestCpmBids: () => mockHighestCpmBids
      });

      const callback = () => {
        // Build auctionDetails with bidsReceived and adUnits
        const auctionDetails = {
          bidsReceived: [
            { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' },
            { requestId: 'req2', bidderCode: 'bidder2', adUnitCode: 'ad1', cpm: 1.2, currency: 'USD' }
          ],
          adUnits: [
            {
              code: 'ad1',
              bids: [
                { bidder: 'bidder1' },
                { bidder: 'bidder2' }
              ]
            }
          ]
        };
        const config = { params: {} };
        const userConsent = {};

        wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

        // Assertions
        expect(sendBeaconStub.calledOnce).to.be.true;
        const beaconCall = sendBeaconStub.getCall(0);
        expect(beaconCall.args[0]).to.equal(expectedStatsURL);

        // Parse and verify payload structure
        const payload = JSON.parse(beaconCall.args[1]);
        expect(payload).to.have.property('version');
        expect(payload).to.have.property('domain');
        expect(payload).to.have.property('path');
        expect(payload).to.have.property('sampling_rate', 100);
        expect(payload).to.have.property('enrichment', 'wurfl_pub');
        expect(payload).to.have.property('wurfl_id', 'lg_nexus5_ver1');
        expect(payload).to.have.property('over_quota', 0);
        expect(payload).to.have.property('consent_class', 0);
        expect(payload).to.have.property('ad_units');
        expect(payload.ad_units).to.be.an('array').with.lengthOf(1);
        expect(payload.ad_units[0].ad_unit_code).to.equal('ad1');
        expect(payload.ad_units[0].bidders).to.be.an('array').with.lengthOf(2);
        expect(payload.ad_units[0].bidders[0]).to.deep.include({
          bidder: 'bidder1',
          bdr_enrich: 'wurfl_ssp',
          cpm: 1.5,
          currency: 'USD',
          won: true
        });
        expect(payload.ad_units[0].bidders[1]).to.deep.include({
          bidder: 'bidder2',
          bdr_enrich: 'wurfl_ssp',
          cpm: 1.2,
          currency: 'USD',
          won: false
        });

        done();
      };

      const config = { params: {} };
      const userConsent = {};

      // First enrich bidders to populate enrichedBidders Set
      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
    });

    it('onAuctionEndEvent: should send analytics data using fetch as fallback, if navigator.sendBeacon is not available', (done) => {
      // Reset reqBidsConfigObj to clean state
      reqBidsConfigObj.ortb2Fragments.global.device = {};
      reqBidsConfigObj.ortb2Fragments.bidder = {};

      // Setup localStorage with cached WURFL data to populate enrichedBidders
      const cachedData = { WURFL, wurfl_pbjs };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'hasLocalStorage').returns(true);

      const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(false);
      const fetchAjaxStub = sandbox.stub(ajaxModule, 'fetch').returns(Promise.resolve());

      // Mock getGlobal().getHighestCpmBids()
      const mockHighestCpmBids = [
        { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1' }
      ];
      sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
        getHighestCpmBids: () => mockHighestCpmBids
      });

      const callback = () => {
        // Build auctionDetails with bidsReceived and adUnits
        const auctionDetails = {
          bidsReceived: [
            { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' },
            { requestId: 'req2', bidderCode: 'bidder2', adUnitCode: 'ad1', cpm: 1.2, currency: 'USD' }
          ],
          adUnits: [
            {
              code: 'ad1',
              bids: [
                { bidder: 'bidder1' },
                { bidder: 'bidder2' }
              ]
            }
          ]
        };
        const config = { params: {} };
        const userConsent = {};

        wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

        // Assertions
        expect(sendBeaconStub.calledOnce).to.be.true;

        expect(fetchAjaxStub.calledOnce).to.be.true;
        const fetchAjaxCall = fetchAjaxStub.getCall(0);
        expect(fetchAjaxCall.args[0]).to.equal(expectedStatsURL);
        expect(fetchAjaxCall.args[1].method).to.equal('POST');
        expect(fetchAjaxCall.args[1].mode).to.equal('no-cors');

        // Parse and verify payload structure
        const payload = JSON.parse(fetchAjaxCall.args[1].body);
        expect(payload).to.have.property('domain');
        expect(payload).to.have.property('path');
        expect(payload).to.have.property('sampling_rate', 100);
        expect(payload).to.have.property('enrichment', 'wurfl_pub');
        expect(payload).to.have.property('wurfl_id', 'lg_nexus5_ver1');
        expect(payload).to.have.property('over_quota', 0);
        expect(payload).to.have.property('consent_class', 0);
        expect(payload).to.have.property('ad_units');
        expect(payload.ad_units).to.be.an('array').with.lengthOf(1);

        done();
      };

      const config = { params: {} };
      const userConsent = {};

      // First enrich bidders to populate enrichedBidders Set
      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
    });

    describe('consent classification', () => {
      beforeEach(function () {
        // Setup localStorage with cached WURFL data
        const cachedData = { WURFL, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        // Mock getGlobal().getHighestCpmBids()
        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        // Reset reqBidsConfigObj
        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};
      });

      const testConsentClass = (description, userConsent, expectedClass, done) => {
        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [{ bidder: 'bidder1' }]
              }
            ]
          };
          const config = { params: {} };

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);
          expect(payload).to.have.property('consent_class', expectedClass);
          done();
        };

        const config = { params: {} };
        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
      };

      it('should return NO consent (0) when userConsent is null', (done) => {
        testConsentClass('null userConsent', null, 0, done);
      });

      it('should return NO consent (0) when userConsent is empty object', (done) => {
        testConsentClass('empty object', {}, 0, done);
      });

      it('should return NO consent (0) when COPPA is enabled', (done) => {
        testConsentClass('COPPA enabled', { coppa: true }, 0, done);
      });

      it('should return NO consent (0) when USP opt-out (1Y)', (done) => {
        testConsentClass('USP opt-out', { usp: '1YYN' }, 0, done);
      });

      it('should return NO consent (0) when GDPR applies but no purposes granted', (done) => {
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: {},
                legitimateInterests: {}
              }
            }
          }
        };
        testConsentClass('GDPR no purposes', userConsent, 0, done);
      });

      it('should return FULL consent (2) when no GDPR object (non-GDPR region)', (done) => {
        testConsentClass('no GDPR object', { usp: '1NNN' }, 2, done);
      });

      it('should return FULL consent (2) when GDPR does not apply', (done) => {
        const userConsent = {
          gdpr: {
            gdprApplies: false
          }
        };
        testConsentClass('GDPR not applicable', userConsent, 2, done);
      });

      it('should return FULL consent (2) when all 3 GDPR purposes granted via consents', (done) => {
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: { 7: true, 8: true, 10: true }
              }
            }
          }
        };
        testConsentClass('all purposes via consents', userConsent, 2, done);
      });

      it('should return FULL consent (2) when all 3 GDPR purposes granted via legitimateInterests', (done) => {
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                legitimateInterests: { 7: true, 8: true, 10: true }
              }
            }
          }
        };
        testConsentClass('all purposes via LI', userConsent, 2, done);
      });

      it('should return FULL consent (2) when all 3 GDPR purposes granted via mixed consents and LI', (done) => {
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: { 7: true, 10: true },
                legitimateInterests: { 8: true }
              }
            }
          }
        };
        testConsentClass('mixed consents and LI', userConsent, 2, done);
      });

      it('should return PARTIAL consent (1) when only 1 GDPR purpose granted', (done) => {
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: { 7: true }
              }
            }
          }
        };
        testConsentClass('1 purpose granted', userConsent, 1, done);
      });

      it('should return PARTIAL consent (1) when 2 GDPR purposes granted', (done) => {
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: { 7: true },
                legitimateInterests: { 8: true }
              }
            }
          }
        };
        testConsentClass('2 purposes granted', userConsent, 1, done);
      });
    });

    describe('sampling rate', () => {
      it('should not send beacon when sampling_rate is 0', (done) => {
        // Setup WURFL data with sampling_rate: 0
        const wurfl_pbjs_zero_sampling = { ...wurfl_pbjs, sampling_rate: 0 };
        const cachedData = { WURFL, wurfl_pbjs: wurfl_pbjs_zero_sampling };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon');
        const fetchStub = sandbox.stub(ajaxModule, 'fetch').returns(Promise.resolve());

        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [{ bidder: 'bidder1' }]
              }
            ]
          };
          const config = { params: {} };
          const userConsent = null;

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

          // Beacon should NOT be sent due to sampling_rate: 0
          expect(sendBeaconStub.called).to.be.false;
          expect(fetchStub.called).to.be.false;
          done();
        };

        const config = { params: {} };
        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
      });

      it('should send beacon when sampling_rate is 100', (done) => {
        // Setup WURFL data with sampling_rate: 100
        const wurfl_pbjs_full_sampling = { ...wurfl_pbjs, sampling_rate: 100 };
        const cachedData = { WURFL, wurfl_pbjs: wurfl_pbjs_full_sampling };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [{ bidder: 'bidder1' }]
              }
            ]
          };
          const config = { params: {} };
          const userConsent = null;

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

          // Beacon should be sent
          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);
          expect(payload).to.have.property('sampling_rate', 100);
          done();
        };

        const config = { params: {} };
        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
      });

      it('should use default sampling_rate (100) for LCE and send beacon', (done) => {
        // No cached data - will use LCE
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [{ bidder: 'bidder1' }]
              }
            ]
          };
          const config = { params: {} };
          const userConsent = null;

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

          // Beacon should be sent with default sampling_rate
          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);
          expect(payload).to.have.property('sampling_rate', 100);
          // Enrichment type can be 'lce' or 'lcefailed' depending on what data is available
          expect(payload.enrichment).to.be.oneOf(['lce', 'lcefailed']);
          done();
        };

        const config = { params: {} };
        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, {});
      });
    });

    describe('onAuctionEndEvent: overquota beacon enrichment', () => {
      beforeEach(() => {
        // Mock getGlobal().getHighestCpmBids()
        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        // Reset reqBidsConfigObj
        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};
      });

      it('should report wurfl_ssp for authorized bidders and none for unauthorized when overquota', (done) => {
        // Setup overquota scenario
        const wurfl_pbjs_over_quota = {
          ...wurfl_pbjs,
          over_quota: 1
        };
        const cachedData = { WURFL, wurfl_pbjs: wurfl_pbjs_over_quota };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' },
              { requestId: 'req2', bidderCode: 'bidder2', adUnitCode: 'ad1', cpm: 1.2, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [
                  { bidder: 'bidder1' },  // authorized
                  { bidder: 'bidder2' },  // authorized
                  { bidder: 'bidder3' }   // NOT authorized
                ]
              }
            ]
          };
          const config = { params: {} };
          const userConsent = {};

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);

          // Verify overall enrichment is none when overquota (publisher not enriched)
          expect(payload).to.have.property('enrichment', 'none');
          expect(payload).to.have.property('over_quota', 1);

          // Verify per-bidder enrichment
          expect(payload.ad_units).to.be.an('array').with.lengthOf(1);
          expect(payload.ad_units[0].bidders).to.be.an('array').with.lengthOf(3);

          // bidder1 and bidder2 are authorized - should report wurfl_ssp
          expect(payload.ad_units[0].bidders[0]).to.deep.include({
            bidder: 'bidder1',
            bdr_enrich: 'wurfl_ssp',
            cpm: 1.5,
            currency: 'USD',
            won: false
          });
          expect(payload.ad_units[0].bidders[1]).to.deep.include({
            bidder: 'bidder2',
            bdr_enrich: 'wurfl_ssp',
            cpm: 1.2,
            currency: 'USD',
            won: false
          });

          // bidder3 is NOT authorized and overquota - should report none
          expect(payload.ad_units[0].bidders[2]).to.deep.include({
            bidder: 'bidder3',
            bdr_enrich: 'none',
            won: false
          });

          done();
        };

        const config = { params: {} };
        const userConsent = {};

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
      });

      it('should report wurfl_ssp for authorized and wurfl_pub for unauthorized when not overquota', (done) => {
        // Setup NOT overquota scenario
        const cachedData = { WURFL, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        const callback = () => {
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' },
              { requestId: 'req3', bidderCode: 'bidder3', adUnitCode: 'ad1', cpm: 1.0, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [
                  { bidder: 'bidder1' },  // authorized
                  { bidder: 'bidder3' }   // NOT authorized
                ]
              }
            ]
          };
          const config = { params: {} };
          const userConsent = {};

          wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);

          // Verify overall enrichment is wurfl_pub when not overquota
          expect(payload).to.have.property('enrichment', 'wurfl_pub');
          expect(payload).to.have.property('over_quota', 0);

          // Verify per-bidder enrichment
          expect(payload.ad_units).to.be.an('array').with.lengthOf(1);
          expect(payload.ad_units[0].bidders).to.be.an('array').with.lengthOf(2);

          // bidder1 is authorized - should always report wurfl_ssp
          expect(payload.ad_units[0].bidders[0]).to.deep.include({
            bidder: 'bidder1',
            bdr_enrich: 'wurfl_ssp',
            cpm: 1.5,
            currency: 'USD',
            won: false
          });

          // bidder3 is NOT authorized but not overquota - should report wurfl_pub
          expect(payload.ad_units[0].bidders[1]).to.deep.include({
            bidder: 'bidder3',
            bdr_enrich: 'wurfl_pub',
            cpm: 1.0,
            currency: 'USD',
            won: false
          });

          done();
        };

        const config = { params: {} };
        const userConsent = {};

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
      });
    });

    describe('device type mapping', () => {
      it('should map is_ott priority over form_factor', (done) => {
        const wurflWithOtt = { ...WURFL, is_ott: true, form_factor: 'Desktop' };
        const cachedData = { WURFL: wurflWithOtt, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(7);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map is_console priority over form_factor', (done) => {
        const wurflWithConsole = { ...WURFL, is_console: true, form_factor: 'Desktop' };
        const cachedData = { WURFL: wurflWithConsole, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(6);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map physical_form_factor out_of_home_device', (done) => {
        const wurflWithOOH = { ...WURFL, physical_form_factor: 'out_of_home_device', form_factor: 'Desktop' };
        const cachedData = { WURFL: wurflWithOOH, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(8);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map form_factor Desktop to PERSONAL_COMPUTER', (done) => {
        const wurflDesktop = { ...WURFL, form_factor: 'Desktop' };
        const cachedData = { WURFL: wurflDesktop, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(2);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map form_factor Smartphone to PHONE', (done) => {
        const wurflSmartphone = { ...WURFL, form_factor: 'Smartphone' };
        const cachedData = { WURFL: wurflSmartphone, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(4);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map form_factor Tablet to TABLET', (done) => {
        const wurflTablet = { ...WURFL, form_factor: 'Tablet' };
        const cachedData = { WURFL: wurflTablet, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(5);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map form_factor Smart-TV to CONNECTED_TV', (done) => {
        const wurflSmartTV = { ...WURFL, form_factor: 'Smart-TV' };
        const cachedData = { WURFL: wurflSmartTV, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(3);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map form_factor Other Non-Mobile to CONNECTED_DEVICE', (done) => {
        const wurflOtherNonMobile = { ...WURFL, form_factor: 'Other Non-Mobile' };
        const cachedData = { WURFL: wurflOtherNonMobile, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(6);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should map form_factor Other Mobile to MOBILE_OR_TABLET', (done) => {
        const wurflOtherMobile = { ...WURFL, form_factor: 'Other Mobile' };
        const cachedData = { WURFL: wurflOtherMobile, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.equal(1);
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should return undefined when form_factor is missing', (done) => {
        const wurflNoFormFactor = { ...WURFL };
        delete wurflNoFormFactor.form_factor;
        const cachedData = { WURFL: wurflNoFormFactor, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.be.undefined;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });

      it('should return undefined for unknown form_factor', (done) => {
        const wurflUnknownFormFactor = { ...WURFL, form_factor: 'UnknownDevice' };
        const cachedData = { WURFL: wurflUnknownFormFactor, wurfl_pbjs };
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify(cachedData));
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};

        const callback = () => {
          expect(reqBidsConfigObj.ortb2Fragments.global.device.devicetype).to.be.undefined;
          done();
        };

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});
      });
    });

    describe('LCE Error Handling', function () {
      beforeEach(function () {
        // Setup empty cache to force LCE
        sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'hasLocalStorage').returns(true);

        reqBidsConfigObj.ortb2Fragments.global.device = {};
        reqBidsConfigObj.ortb2Fragments.bidder = {};
      });

      it('should set LCE_ERROR enrichment type when LCE device detection throws error', (done) => {
        const sendBeaconStub = sandbox.stub(ajaxModule, 'sendBeacon').returns(true);

        sandbox.stub(prebidGlobalModule, 'getGlobal').returns({
          getHighestCpmBids: () => []
        });

        // Import the WurflLCEDevice to stub it
        const wurflRtdProvider = require('modules/wurflRtdProvider.js');

        const callback = () => {
          const device = reqBidsConfigObj.ortb2Fragments.global.device;

          // Should have minimal fallback data
          expect(device.js).to.equal(1);

          // UA-dependent fields should not be set when error occurs
          expect(device.devicetype).to.be.undefined;
          expect(device.os).to.be.undefined;

          // Trigger auction to verify enrichment type in beacon
          const auctionDetails = {
            bidsReceived: [
              { requestId: 'req1', bidderCode: 'bidder1', adUnitCode: 'ad1', cpm: 1.5, currency: 'USD' }
            ],
            adUnits: [
              {
                code: 'ad1',
                bids: [{ bidder: 'bidder1' }]
              }
            ]
          };

          wurflSubmodule.onAuctionEndEvent(auctionDetails, { params: {} }, null);

          // Check beacon was sent with lcefailed enrichment type
          expect(sendBeaconStub.calledOnce).to.be.true;
          const beaconCall = sendBeaconStub.getCall(0);
          const payload = JSON.parse(beaconCall.args[1]);
          expect(payload).to.have.property('enrichment', 'lcefailed');

          done();
        };

        // Stub _getDeviceInfo to throw an error
        const originalGetDeviceInfo = window.navigator.userAgent;
        Object.defineProperty(window.navigator, 'userAgent', {
          get: () => {
            throw new Error('User agent access failed');
          },
          configurable: true
        });

        wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, { params: {} }, {});

        // Restore
        Object.defineProperty(window.navigator, 'userAgent', {
          value: originalGetDeviceInfo,
          configurable: true
        });
      });
    });
  });
});
