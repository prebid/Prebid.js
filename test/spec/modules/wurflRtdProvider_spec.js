import {
  bidderData,
  enrichBidderRequest,
  lowEntropyData,
  wurflSubmodule,
  makeOrtb2DeviceType,
} from 'modules/wurflRtdProvider';
import * as ajaxModule from 'src/ajax';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

describe('wurflRtdProvider', function () {
  describe('wurflSubmodule', function () {
    const altHost = 'http://example.local/wurfl.js';

    const wurfl_pbjs = {
      low_entropy_caps: ['is_mobile', 'complete_device_name', 'form_factor'],
      caps: ['advertised_browser', 'advertised_browser_version', 'advertised_device_os', 'advertised_device_os_version', 'ajax_support_javascript', 'brand_name', 'complete_device_name', 'density_class', 'form_factor', 'is_android', 'is_app_webview', 'is_connected_tv', 'is_full_desktop', 'is_ios', 'is_mobile', 'is_ott', 'is_phone', 'is_robot', 'is_smartphone', 'is_smarttv', 'is_tablet', 'manufacturer_name', 'marketing_name', 'max_image_height', 'max_image_width', 'model_name', 'physical_screen_height', 'physical_screen_width', 'pixel_density', 'pointing_method', 'resolution_height', 'resolution_width'],
      authorized_bidders: {
        bidder1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
        bidder2: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 25, 28, 30, 31]
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
      resolution_width: 1080
    };

    // expected analytics values
    const expectedStatsURL = 'https://prebid.wurflcloud.com/v1/prebid/stats';
    const expectedData = JSON.stringify({ bidders: ['bidder1', 'bidder2'] });

    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      window.WURFLPromises = {
        init: new Promise(function (resolve, reject) { resolve({ WURFL, wurfl_pbjs }) }),
        complete: new Promise(function (resolve, reject) { resolve({ WURFL, wurfl_pbjs }) }),
      };
    });

    afterEach(() => {
      // Restore the original functions
      sandbox.restore();
      window.WURFLPromises = undefined;
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

    it('initialises the WURFL RTD provider', function () {
      expect(wurflSubmodule.init()).to.be.true;
    });

    it('should enrich the bid request data', (done) => {
      const expectedURL = new URL(altHost);
      expectedURL.searchParams.set('debug', true);
      expectedURL.searchParams.set('mode', 'prebid');

      const callback = () => {
        const v = {
          bidder1: {
            device: {
              make: 'Google',
              model: 'Nexus 5',
              devicetype: 1,
              os: 'Android',
              osv: '6.0',
              hwv: 'Nexus 5',
              h: 1920,
              w: 1080,
              ppi: 443,
              pxratio: '3.0',
              js: true,
              ext: {
                wurfl: {
                  advertised_browser: 'Chrome Mobile',
                  advertised_browser_version: '130.0.0.0',
                  advertised_device_os: 'Android',
                  advertised_device_os_version: '6.0',
                  ajax_support_javascript: !0,
                  brand_name: 'Google',
                  complete_device_name: 'Google Nexus 5',
                  density_class: '3.0',
                  form_factor: 'Feature Phone',
                  is_app_webview: !1,
                  is_connected_tv: !1,
                  is_full_desktop: !1,
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
                  resolution_width: 1080
                },
              },
            },
          },
          bidder2: {
            device: {
              make: 'Google',
              model: 'Nexus 5',
              devicetype: 1,
              os: 'Android',
              osv: '6.0',
              hwv: 'Nexus 5',
              h: 1920,
              w: 1080,
              ppi: 443,
              pxratio: '3.0',
              js: true,
              ext: {
                wurfl: {
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
                  is_tablet: !1,
                  manufacturer_name: 'LG',
                  model_name: 'Nexus 5',
                  pixel_density: 443,
                  resolution_height: 1920,
                  resolution_width: 1080
                },
              },
            },
          },
          bidder3: {
            device: {
              make: 'Google',
              model: 'Nexus 5',
              ext: {
                wurfl: {
                  complete_device_name: 'Google Nexus 5',
                  form_factor: 'Feature Phone',
                  is_mobile: !0,
                  model_name: 'Nexus 5',
                  brand_name: 'Google',
                },
              },
            },
          },
        };
        expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.equal(v);
        done();
      };

      const config = {
        params: {
          altHost: altHost,
          debug: true,
        }
      };
      const userConsent = {};

      wurflSubmodule.getBidRequestData(reqBidsConfigObj, callback, config, userConsent);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
      const loadExternalScriptCall = loadExternalScriptStub.getCall(0);
      expect(loadExternalScriptCall.args[0]).to.equal(expectedURL.toString());
      expect(loadExternalScriptCall.args[2]).to.equal('wurfl');
    });

    it('onAuctionEndEvent: should send analytics data using navigator.sendBeacon, if available', () => {
      const auctionDetails = {};
      const config = {};
      const userConsent = {};

      const sendBeaconStub = sandbox.stub(navigator, 'sendBeacon');

      // Call the function
      wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

      // Assertions
      expect(sendBeaconStub.calledOnce).to.be.true;
      expect(sendBeaconStub.calledWithExactly(expectedStatsURL, expectedData)).to.be.true;
    });

    it('onAuctionEndEvent: should send analytics data using fetch as fallback, if navigator.sendBeacon is not available', () => {
      const auctionDetails = {};
      const config = {};
      const userConsent = {};

      const sendBeaconStub = sandbox.stub(navigator, 'sendBeacon').value(undefined);
      const windowFetchStub = sandbox.stub(window, 'fetch');
      const fetchAjaxStub = sandbox.stub(ajaxModule, 'fetch');

      // Call the function
      wurflSubmodule.onAuctionEndEvent(auctionDetails, config, userConsent);

      // Assertions
      expect(sendBeaconStub.called).to.be.false;

      expect(fetchAjaxStub.calledOnce).to.be.true;
      const fetchAjaxCall = fetchAjaxStub.getCall(0);
      expect(fetchAjaxCall.args[0]).to.equal(expectedStatsURL);
      expect(fetchAjaxCall.args[1].method).to.equal('POST');
      expect(fetchAjaxCall.args[1].body).to.equal(expectedData);
      expect(fetchAjaxCall.args[1].mode).to.equal('no-cors');
    });
  });

  describe('bidderData', () => {
    it('should return the WURFL data for a bidder', () => {
      const wjsData = {
        capability1: 'value1',
        capability2: 'value2',
        capability3: 'value3',
      };
      const caps = ['capability1', 'capability2', 'capability3'];
      const filter = [0, 2];

      const result = bidderData(wjsData, caps, filter);

      expect(result).to.deep.equal({
        capability1: 'value1',
        capability3: 'value3',
      });
    });

    it('should return an empty object if the filter is empty', () => {
      const wjsData = {
        capability1: 'value1',
        capability2: 'value2',
        capability3: 'value3',
      };
      const caps = ['capability1', 'capability3'];
      const filter = [];

      const result = bidderData(wjsData, caps, filter);

      expect(result).to.deep.equal({});
    });
  });

  describe('lowEntropyData', () => {
    it('should return the correct low entropy data for Apple devices', () => {
      const wjsData = {
        complete_device_name: 'Apple iPhone X',
        form_factor: 'Smartphone',
        is_mobile: !0,
        brand_name: 'Apple',
        model_name: 'iPhone X',
      };
      const lowEntropyCaps = ['complete_device_name', 'form_factor', 'is_mobile'];
      const expectedData = {
        complete_device_name: 'Apple iPhone',
        form_factor: 'Smartphone',
        is_mobile: !0,
        brand_name: 'Apple',
        model_name: 'iPhone',
      };
      const result = lowEntropyData(wjsData, lowEntropyCaps);
      expect(result).to.deep.equal(expectedData);
    });

    it('should return the correct low entropy data for Android devices', () => {
      const wjsData = {
        complete_device_name: 'Samsung SM-G981B (Galaxy S20 5G)',
        form_factor: 'Smartphone',
        is_mobile: !0,
      };
      const lowEntropyCaps = ['complete_device_name', 'form_factor', 'is_mobile'];
      const expectedData = {
        complete_device_name: 'Samsung SM-G981B (Galaxy S20 5G)',
        form_factor: 'Smartphone',
        is_mobile: !0,
      };
      const result = lowEntropyData(wjsData, lowEntropyCaps);
      expect(result).to.deep.equal(expectedData);
    });

    it('should return an empty object if the lowEntropyCaps array is empty', () => {
      const wjsData = {
        complete_device_name: 'Samsung SM-G981B (Galaxy S20 5G)',
        form_factor: 'Smartphone',
        is_mobile: !0,
      };
      const lowEntropyCaps = [];
      const expectedData = {};
      const result = lowEntropyData(wjsData, lowEntropyCaps);
      expect(result).to.deep.equal(expectedData);
    });
  });

  describe('enrichBidderRequest', () => {
    it('should enrich the bidder request with WURFL data', () => {
      const reqBidsConfigObj = {
        ortb2Fragments: {
          global: {
            device: {},
          },
          bidder: {
            exampleBidder: {
              device: {
                ua: 'user-agent',
              }
            }
          }
        }
      };
      const bidderCode = 'exampleBidder';
      const wjsData = {
        capability1: 'value1',
        capability2: 'value2'
      };

      enrichBidderRequest(reqBidsConfigObj, bidderCode, wjsData);

      expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.equal({
        exampleBidder: {
          device: {
            ua: 'user-agent',
            ext: {
              wurfl: {
                capability1: 'value1',
                capability2: 'value2'
              }
            }
          }
        }
      });
    });
  });

  describe('makeOrtb2DeviceType', function () {
    it('should return 1 when wurflData is_mobile and is_phone is true', function () {
      const wurflData = { is_mobile: true, is_phone: true, is_tablet: false };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(1);
    });

    it('should return 1 when wurflData is_mobile and is_tablet is true', function () {
      const wurflData = { is_mobile: true, is_phone: false, is_tablet: true };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(1);
    });

    it('should return 6 when wurflData is_mobile but is_phone and is_tablet are false', function () {
      const wurflData = { is_mobile: true, is_phone: false, is_tablet: false };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(6);
    });

    it('should return 2 when wurflData is_full_desktop is true', function () {
      const wurflData = { is_full_desktop: true };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(2);
    });

    it('should return 3 when wurflData is_connected_tv is true', function () {
      const wurflData = { is_connected_tv: true };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(3);
    });

    it('should return 4 when wurflData is_phone is true and is_mobile is false or undefined', function () {
      const wurflData = { is_phone: true };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(4);
    });

    it('should return 5 when wurflData is_tablet is true and is_mobile is false or undefined', function () {
      const wurflData = { is_tablet: true };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(5);
    });

    it('should return 7 when wurflData is_ott is true', function () {
      const wurflData = { is_ott: true };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.equal(7);
    });

    it('should return undefined when wurflData is_mobile is true but is_phone and is_tablet are missing', function () {
      const wurflData = { is_mobile: true };
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.be.undefined;
    });

    it('should return undefined when no conditions are met', function () {
      const wurflData = {};
      const result = makeOrtb2DeviceType(wurflData);
      expect(result).to.be.undefined;
    });
  });
});
