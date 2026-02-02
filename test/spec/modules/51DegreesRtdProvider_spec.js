import {
  extractConfig,
  get51DegreesJSURL,
  is51DegreesMetaPresent,
  deepSetNotEmptyValue,
  convert51DegreesDataToOrtb2,
  convert51DegreesDeviceToOrtb2,
  getBidRequestData,
  fiftyOneDegreesSubmodule,
} from 'modules/51DegreesRtdProvider';
import {mergeDeep} from '../../../src/utils.js';

const inject51DegreesMeta = () => {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Delegate-CH';
  meta.content = 'sec-ch-ua-full-version-list https://cloud.51degrees.com; sec-ch-ua-model https://cloud.51degrees.com; sec-ch-ua-platform https://cloud.51degrees.com; sec-ch-ua-platform-version https://cloud.51degrees.com';
  document.head.appendChild(meta);
};

describe('51DegreesRtdProvider', function() {
  const fiftyOneDegreesDevice = {
    screenpixelswidth: 5120,
    screenpixelsheight: 1440,
    hardwarevendor: 'Apple',
    hardwaremodel: 'Macintosh',
    hardwarename: [
      'Macintosh',
    ],
    platformname: 'macOS',
    platformversion: '14.1.2',
    screeninchesheight: 13.27,
    screenincheswidth: 47.17,
    devicetype: 'Desktop',
    pixelratio: 1,
    deviceid: '17595-131215-132535-18092',
    thirdpartycookiesenabled: 'True',
  };

  const fiftyOneDegreesDeviceX2scaling = {
    ...fiftyOneDegreesDevice,
    screenpixelsheight: fiftyOneDegreesDevice.screenpixelsheight / 2,
    screenpixelswidth: fiftyOneDegreesDevice.screenpixelswidth / 2,
    screenpixelsphysicalheight: fiftyOneDegreesDevice.screenpixelsheight,
    screenpixelsphysicalwidth: fiftyOneDegreesDevice.screenpixelswidth,
    pixelratio: fiftyOneDegreesDevice.pixelratio * 2,
  };

  const fiftyOneDegreesData = {
    device: fiftyOneDegreesDevice,
  };

  const expectedORTB2DeviceResult = {
    device: {
      devicetype: 2,
      make: 'Apple',
      model: 'Macintosh',
      os: 'macOS',
      osv: '14.1.2',
      h: 1440,
      w: 5120,
      ppi: 109,
      pxratio: 1,
      ext: {
        fiftyonedegrees_deviceId: '17595-131215-132535-18092',
        fod: {
          deviceId: '17595-131215-132535-18092',
          tpc: 1,
        },
      },
    },
  };

  const expectedORTB2Result = {};
  mergeDeep(
    expectedORTB2Result,
    expectedORTB2DeviceResult,
    // placeholder for the next 51Degrees RTD submodule update
  );

  describe('extractConfig', function() {
    it('returns the resourceKey from the moduleConfig', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = {params: {resourceKey: 'TEST_RESOURCE_KEY'}};
      expect(extractConfig(moduleConfig, reqBidsConfigObj)).to.deep.equal({
        resourceKey: 'TEST_RESOURCE_KEY',
        onPremiseJSUrl: undefined,
      });
    });

    it('returns the onPremiseJSUrl from the moduleConfig', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = {params: {onPremiseJSUrl: 'https://example.com/51Degrees.core.js'}};
      expect(extractConfig(moduleConfig, reqBidsConfigObj)).to.deep.equal({
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
        resourceKey: undefined,
      });
    });

    it('throws an error if neither resourceKey nor onPremiseJSUrl is provided', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = {params: {}};
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    });

    it('throws an error if both resourceKey and onPremiseJSUrl are provided', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = {params: {
        resourceKey: 'TEST_RESOURCE_KEY',
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
      }};
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    });

    it('throws an error if the resourceKey is equal to "<YOUR_RESOURCE_KEY>" from example', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = {params: {resourceKey: '<YOUR_RESOURCE_KEY>'}};
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    });

    it('sets the resourceKey to undefined if it was set to "0"', function() {
      const moduleConfig = {params: {
        resourceKey: '0',
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
      }};
      expect(extractConfig(moduleConfig, {})).to.deep.equal({
        resourceKey: undefined,
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
      });
    });

    it('sets the onPremiseJSUrl to undefined if it was set to "0"', function() {
      const moduleConfig = {params: {
        resourceKey: 'TEST_RESOURCE_KEY',
        onPremiseJSUrl: '0',
      }};
      expect(extractConfig(moduleConfig, {})).to.deep.equal({
        resourceKey: 'TEST_RESOURCE_KEY',
        onPremiseJSUrl: undefined,
      });
    });

    it('throws an error if the onPremiseJSUrl is not a valid URL', function() {
      expect(() => extractConfig({
        params: {onPremiseJSUrl: 'invalid URL'}
      }, {})).to.throw();
      expect(() => extractConfig({
        params: {onPremiseJSUrl: 'www.example.com/51Degrees.core.js'}
      }, {})).to.throw();
    });

    it('allows the onPremiseJSUrl to be a valid URL', function() {
      const VALID_URLS = [
        'https://www.example.com/51Degrees.core.js',
        'http://example.com/51Degrees.core.js',
        '//example.com/51Degrees.core.js',
        '/51Degrees.core.js',
      ];

      VALID_URLS.forEach(url => {
        expect(() => extractConfig({
          params: {onPremiseJSUrl: url}
        }, {})).to.not.throw();
      });
    });
  });

  describe('get51DegreesJSURL', function() {
    const hev = {
      'brands': [
        {
          'brand': 'Chromium',
          'version': '130'
        },
        {
          'brand': 'Google Chrome',
          'version': '130'
        },
        {
          'brand': 'Not?A_Brand',
          'version': '99'
        }
      ],
      'fullVersionList': [
        {
          'brand': 'Chromium',
          'version': '130.0.6723.92'
        },
        {
          'brand': 'Google Chrome',
          'version': '130.0.6723.92'
        },
        {
          'brand': 'Not?A_Brand',
          'version': '99.0.0.0'
        }
      ],
      'mobile': false,
      'model': '',
      'platform': 'macOS',
      'platformVersion': '14.6.1'
    };
    const mockWindow = {
      ...window,
      screen: {
        height: 1117,
        width: 1728,
      },
      devicePixelRatio: 2,
    };

    it('returns the cloud URL if the resourceKey is provided', function() {
      const config = {resourceKey: 'TEST_RESOURCE_KEY'};
      expect(get51DegreesJSURL(config, mockWindow)).to.equal(
        'https://cloud.51degrees.com/api/v4/TEST_RESOURCE_KEY.js?' +
        `51D_ScreenPixelsHeight=${mockWindow.screen.height}&` +
        `51D_ScreenPixelsWidth=${mockWindow.screen.width}&` +
        `51D_PixelRatio=${mockWindow.devicePixelRatio}`
      );
    });

    it('returns the on-premise URL if the onPremiseJSUrl is provided', function () {
      const config = {onPremiseJSUrl: 'https://example.com/51Degrees.core.js'};
      expect(get51DegreesJSURL(config, mockWindow)).to.equal(
        `https://example.com/51Degrees.core.js?` +
        `51D_ScreenPixelsHeight=${mockWindow.screen.height}&` +
        `51D_ScreenPixelsWidth=${mockWindow.screen.width}&` +
        `51D_PixelRatio=${mockWindow.devicePixelRatio}`
      );
    });

    it('doesn\'t override static query string parameters', function () {
      const config = {onPremiseJSUrl: 'https://example.com/51Degrees.core.js?test=1'};
      expect(get51DegreesJSURL(config, mockWindow)).to.equal(
        `https://example.com/51Degrees.core.js?test=1&` +
        `51D_ScreenPixelsHeight=${mockWindow.screen.height}&` +
        `51D_ScreenPixelsWidth=${mockWindow.screen.width}&` +
        `51D_PixelRatio=${mockWindow.devicePixelRatio}`
      );
    });

    it('adds high entropy values to the query string, if available', async function () {
      const config = {
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
        hev,
      };
      expect(get51DegreesJSURL(config, mockWindow)).to.equal(
        `https://example.com/51Degrees.core.js?` +
        `51D_GetHighEntropyValues=${btoa(JSON.stringify(hev))}&` +
        `51D_ScreenPixelsHeight=${mockWindow.screen.height}&` +
        `51D_ScreenPixelsWidth=${mockWindow.screen.width}&` +
        `51D_PixelRatio=${mockWindow.devicePixelRatio}`
      );
    });

    it('doesn\'t add high entropy values to the query string if object is empty', function () {
      const config = {
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
        hev: {},
      };
      expect(get51DegreesJSURL(config, mockWindow)).to.equal(
        `https://example.com/51Degrees.core.js?` +
        `51D_ScreenPixelsHeight=${mockWindow.screen.height}&` +
        `51D_ScreenPixelsWidth=${mockWindow.screen.width}&` +
        `51D_PixelRatio=${mockWindow.devicePixelRatio}`
      );
    });

    it('keeps the original URL if none of the additional parameters are available', function () {
      // delete screen and devicePixelRatio properties to test the case when they are not available
      delete mockWindow.screen;
      delete mockWindow.devicePixelRatio;

      const config = {onPremiseJSUrl: 'https://example.com/51Degrees.core.js'};
      expect(get51DegreesJSURL(config, mockWindow)).to.equal('https://example.com/51Degrees.core.js');
      expect(get51DegreesJSURL(config, window)).to.not.equal('https://example.com/51Degrees.core.js');
    });
  });

  describe('is51DegreesMetaPresent', function() {
    let initialHeadInnerHTML;

    before(function() {
      initialHeadInnerHTML = document.head.innerHTML;
    });

    afterEach(function() {
      document.head.innerHTML = initialHeadInnerHTML;
    });

    it('returns true if the 51Degrees meta tag is present', function () {
      inject51DegreesMeta();
      expect(is51DegreesMetaPresent()).to.be.true;
    });

    it('returns false if the 51Degrees meta tag is not present', function() {
      expect(is51DegreesMetaPresent()).to.be.false;
    });

    it('works with multiple meta tags, even if those are not to include any `content`', function() {
      const meta1 = document.createElement('meta');
      meta1.httpEquiv = 'Delegate-CH';
      document.head.appendChild(meta1);

      inject51DegreesMeta();

      const meta2 = document.createElement('meta');
      meta2.httpEquiv = 'Delegate-CH';
      document.head.appendChild(meta2);

      expect(is51DegreesMetaPresent()).to.be.true;
    });
  });

  describe('deepSetNotEmptyValue', function() {
    it('sets value of ORTB2 key if it is not empty', function() {
      const data = {};
      deepSetNotEmptyValue(data, 'TEST_ORTB2_KEY', 'TEST_ORTB2_VALUE');
      expect(data).to.deep.equal({TEST_ORTB2_KEY: 'TEST_ORTB2_VALUE'});
      deepSetNotEmptyValue(data, 'test2.TEST_ORTB2_KEY_2', 'TEST_ORTB2_VALUE_2');
      expect(data).to.deep.equal({
        TEST_ORTB2_KEY: 'TEST_ORTB2_VALUE',
        test2: {
          TEST_ORTB2_KEY_2: 'TEST_ORTB2_VALUE_2'
        },
      });
    });

    it('throws an error if the key is empty', function() {
      const data = {};
      expect(() => deepSetNotEmptyValue(data, '', 'TEST_ORTB2_VALUE')).to.throw();
    });

    it('does not set value of ORTB2 key if it is empty', function() {
      const data = {};
      deepSetNotEmptyValue(data, 'TEST_ORTB2_KEY', '');
      deepSetNotEmptyValue(data, 'TEST_ORTB2_KEY', 0);
      deepSetNotEmptyValue(data, 'TEST_ORTB2_KEY', null);
      deepSetNotEmptyValue(data, 'TEST_ORTB2_KEY', undefined);
      deepSetNotEmptyValue(data, 'TEST.TEST_ORTB2_KEY', undefined);
      expect(data).to.deep.equal({});
    });
  });

  describe('convert51DegreesDataToOrtb2', function() {
    it('returns empty object if data is null, undefined or empty', () => {
      expect(convert51DegreesDataToOrtb2(null)).to.deep.equal({});
      expect(convert51DegreesDataToOrtb2(undefined)).to.deep.equal({});
      expect(convert51DegreesDataToOrtb2({})).to.deep.equal({});
    });

    it('converts all 51Degrees data to ORTB2 format', function() {
      expect(convert51DegreesDataToOrtb2(fiftyOneDegreesData)).to.deep.equal(expectedORTB2Result);
    });
  });

  describe('convert51DegreesDeviceToOrtb2', function() {
    it('converts 51Degrees device data to ORTB2 format', function() {
      expect(
        convert51DegreesDeviceToOrtb2(fiftyOneDegreesDevice)
      ).to.deep.equal(expectedORTB2DeviceResult);
    });

    it('returns an empty object if the device data is not provided', function() {
      expect(convert51DegreesDeviceToOrtb2()).to.deep.equal({});
    });

    it('does not set the deviceid if it is not provided', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.deviceid;
      expect(convert51DegreesDeviceToOrtb2(device).device.ext).to.not.have.any.keys('fiftyonedegrees_deviceId');
      expect(convert51DegreesDeviceToOrtb2(device).device.ext.fod).to.not.have.any.keys('deviceId');
    });

    it('sets the model to hardwarename if hardwaremodel is not provided', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.hardwaremodel;
      expect(convert51DegreesDeviceToOrtb2(device).device).to.deep.include({model: 'Macintosh'});
    });

    it('does not set the model if hardwarename is empty', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.hardwaremodel;
      device.hardwarename = [];
      expect(convert51DegreesDeviceToOrtb2(device).device).to.not.have.any.keys('model');
    });

    it('does not set the ppi if screeninchesheight is not provided', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.screeninchesheight;
      expect(convert51DegreesDeviceToOrtb2(device).device).to.not.have.any.keys('ppi');
    });

    it('sets correct ppi if screenpixelsphysicalheight & screeninchesheight are provided', function() {
      expect(convert51DegreesDeviceToOrtb2(fiftyOneDegreesDeviceX2scaling).device).to.deep.include({
        ppi: expectedORTB2DeviceResult.device.ppi,
      });
    });

    it('if screenpixelsphysical properties are available, use them for screen size', function() {
      expect(fiftyOneDegreesDevice.screenpixelswidth).to.not.equal(fiftyOneDegreesDeviceX2scaling.screenpixelswidth);
      expect(fiftyOneDegreesDevice.screenpixelsheight).to.not.equal(fiftyOneDegreesDeviceX2scaling.screenpixelsheight);
      expect(fiftyOneDegreesDevice.screenpixelsphysicalwidth).to.equal(undefined);
      expect(fiftyOneDegreesDevice.screenpixelsphysicalheight).to.equal(undefined);
      expect(convert51DegreesDeviceToOrtb2(fiftyOneDegreesDeviceX2scaling).device).to.deep.include({
        h: expectedORTB2DeviceResult.device.h,
        w: expectedORTB2DeviceResult.device.w,
      });
    });

    it('does not set the tpc if thirdpartycookiesenabled is "Unknown"', function () {
      const device = { ...fiftyOneDegreesDevice };
      device.thirdpartycookiesenabled = 'Unknown';
      expect(convert51DegreesDeviceToOrtb2(device).device.ext.fod).to.not.have.any.keys('tpc');
    });

    it('sets the tpc if thirdpartycookiesenabled is "True" or "False"', function () {
      const deviceTrue = { ...fiftyOneDegreesDevice, thirdpartycookiesenabled: 'True' };
      const deviceFalse = { ...fiftyOneDegreesDevice, thirdpartycookiesenabled: 'False' };
      expect(convert51DegreesDeviceToOrtb2(deviceTrue).device.ext.fod).to.deep.include({ tpc: 1 });
      expect(convert51DegreesDeviceToOrtb2(deviceFalse).device.ext.fod).to.deep.include({ tpc: 0 });
    });
  });

  describe('getBidRequestData', function() {
    let initialHeadInnerHTML;
    let reqBidsConfigObj = {};
    const resetReqBidsConfigObj = () => {
      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {
            device: {},
          },
        },
      };
    };

    before(function() {
      initialHeadInnerHTML = document.head.innerHTML;

      const mockScript = document.createElement('script');
      mockScript.innerHTML = `
      window.fod = {complete: (_callback) => _callback(${JSON.stringify(fiftyOneDegreesData)})};
      `;
      document.head.appendChild(mockScript);
    });

    beforeEach(function() {
      resetReqBidsConfigObj();
    });

    after(function() {
      document.head.innerHTML = initialHeadInnerHTML;
    });

    it('calls the callback even if submodule fails (wrong config)', function() {
      const callback = sinon.spy();
      const moduleConfig = {params: {}};
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(callback.calledOnce).to.be.true;
    });

    it('calls the callback even if submodule fails (on-premise, non-working URL)', async function() {
      const callback = sinon.spy();
      const moduleConfig = {params: {onPremiseJSUrl: 'http://localhost:12345/test/51Degrees.core.js'}};

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
    });

    it('calls the callback even if submodule fails (invalid resource key)', async function() {
      const callback = sinon.spy();
      const moduleConfig = {params: {resourceKey: 'INVALID_RESOURCE_KEY'}};

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
    });

    it('works with Delegate-CH meta tag', async function() {
      inject51DegreesMeta();
      const callback = sinon.spy();
      const moduleConfig = {params: {resourceKey: 'INVALID_RESOURCE_KEY'}};
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
    });

    it('has the correct ORTB2 data', async function() {
      const callback = sinon.spy();
      const moduleConfig = {params: {resourceKey: 'INVALID_RESOURCE_KEY'}};
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal(expectedORTB2Result);
    });
  });

  describe('init', function() {
    it('initialises the 51Degrees RTD provider', function() {
      expect(fiftyOneDegreesSubmodule.init()).to.be.true;
    });
  });
});
