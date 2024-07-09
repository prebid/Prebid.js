import {
  bidderData,
  enrichBidderRequest,
  lowEntropyData,
  wurflSubmodule,
} from 'modules/wurflRtdProvider';
import * as ajaxModule from 'src/ajax';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

describe('wurflRtdProvider', function () {
  describe('wurflSubmodule', function () {
    const altHost = 'http://example.local/wurfl.js';
    const wurfl_pbjs = {
      low_entropy_caps: ['complete_device_name', 'form_factor', 'is_mobile'],
      caps: [
        'advertised_browser',
        'advertised_browser_version',
        'advertised_device_os',
        'advertised_device_os_version',
        'brand_name',
        'complete_device_name',
        'form_factor',
        'is_app_webview',
        'is_full_desktop',
        'is_mobile',
        'is_robot',
        'is_smartphone',
        'is_smarttv',
        'is_tablet',
        'manufacturer_name',
        'marketing_name'
      ],
      authorized_bidders: {
        'bidder1': [0, 1, 2, 3, 4, 5, 6, 7, 10, 13, 15],
        'bidder2': [5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      }
    }

    const WURFL = {
      advertised_browser: 'Chrome',
      advertised_browser_version: '125.0.6422.76',
      advertised_device_os: 'Linux',
      advertised_device_os_version: '6.5.0',
      brand_name: 'Google',
      complete_device_name: 'Google Chrome',
      form_factor: 'Desktop',
      is_app_webview: !1,
      is_full_desktop: !0,
      is_mobile: !1,
      is_robot: !1,
      is_smartphone: !1,
      is_smarttv: !1,
      is_tablet: !1,
      manufacturer_name: '',
      marketing_name: '',
    }

    // expected analytics values
    const expectedStatsURL = 'https://prebid.wurflcloud.com/v1/prebid/stats';
    const expectedData = JSON.stringify({ bidders: ['bidder1', 'bidder2'] });

    let sandbox;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      window.WURFLPromises = {
        init: new Promise(function(resolve, reject) { resolve({ WURFL, wurfl_pbjs }) }),
        complete: new Promise(function(resolve, reject) { resolve({ WURFL, wurfl_pbjs }) }),
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
        expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.equal({
          bidder1: {
            device: {
              ext: {
                wurfl: {
                  advertised_browser: 'Chrome',
                  advertised_browser_version: '125.0.6422.76',
                  advertised_device_os: 'Linux',
                  advertised_device_os_version: '6.5.0',
                  brand_name: 'Google',
                  complete_device_name: 'Google Chrome',
                  form_factor: 'Desktop',
                  is_app_webview: !1,
                  is_robot: !1,
                  is_tablet: !1,
                  marketing_name: '',
                },
              },
            },
          },
          bidder2: {
            device: {
              ext: {
                wurfl: {
                  complete_device_name: 'Google Chrome',
                  form_factor: 'Desktop',
                  is_app_webview: !1,
                  is_full_desktop: !0,
                  is_mobile: !1,
                  is_robot: !1,
                  is_smartphone: !1,
                  is_smarttv: !1,
                  is_tablet: !1,
                  manufacturer_name: '',
                },
              },
            },
          },
          bidder3: {
            device: {
              ext: {
                wurfl: {
                  complete_device_name: 'Google Chrome',
                  form_factor: 'Desktop',
                  is_mobile: !1,
                },
              },
            },
          },
        });
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
      expect(loadExternalScriptCall.args[1]).to.equal('wurfl');
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
      };
      const lowEntropyCaps = ['complete_device_name', 'form_factor', 'is_mobile'];
      const expectedData = {
        complete_device_name: 'Apple iPhone',
        form_factor: 'Smartphone',
        is_mobile: !0,
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
});
