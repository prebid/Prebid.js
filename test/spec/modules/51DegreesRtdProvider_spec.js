import {
  extractConfig,
  get51DegreesJSURL,
  is51DegreesMetaPresent,
  deepSetNotEmptyValue,
  convert51DegreesDataToOrtb2,
  convert51DegreesDeviceToOrtb2,
  convert51DegreesIpToOrtb2,
  convert51DegreesFoDiDToOrtb2,
  resolveIdUsage,
  resolveTcString,
  resolveGpp,
  getBidRequestData,
  fiftyOneDegreesSubmodule,
} from 'modules/51DegreesRtdProvider';
import { mergeDeep } from '../../../src/utils.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

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
      const moduleConfig = { params: { resourceKey: 'TEST_RESOURCE_KEY' } };
      expect(extractConfig(moduleConfig, reqBidsConfigObj)).to.deep.equal({
        resourceKey: 'TEST_RESOURCE_KEY',
        onPremiseJSUrl: undefined,
      });
    });

    it('returns the onPremiseJSUrl from the moduleConfig', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = { params: { onPremiseJSUrl: 'https://example.com/51Degrees.core.js' } };
      expect(extractConfig(moduleConfig, reqBidsConfigObj)).to.deep.equal({
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
        resourceKey: undefined,
      });
    });

    it('throws an error if neither resourceKey nor onPremiseJSUrl is provided', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = { params: {} };
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    });

    it('throws an error if both resourceKey and onPremiseJSUrl are provided', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = {
        params: {
          resourceKey: 'TEST_RESOURCE_KEY',
          onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
        }
      };
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    });

    it('throws an error if the resourceKey is equal to "<YOUR_RESOURCE_KEY>" from example', function() {
      const reqBidsConfigObj = {};
      const moduleConfig = { params: { resourceKey: '<YOUR_RESOURCE_KEY>' } };
      expect(() => extractConfig(moduleConfig, reqBidsConfigObj)).to.throw();
    });

    it('sets the resourceKey to undefined if it was set to "0"', function() {
      const moduleConfig = {
        params: {
          resourceKey: '0',
          onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
        }
      };
      expect(extractConfig(moduleConfig, {})).to.deep.equal({
        resourceKey: undefined,
        onPremiseJSUrl: 'https://example.com/51Degrees.core.js',
      });
    });

    it('sets the onPremiseJSUrl to undefined if it was set to "0"', function() {
      const moduleConfig = {
        params: {
          resourceKey: 'TEST_RESOURCE_KEY',
          onPremiseJSUrl: '0',
        }
      };
      expect(extractConfig(moduleConfig, {})).to.deep.equal({
        resourceKey: 'TEST_RESOURCE_KEY',
        onPremiseJSUrl: undefined,
      });
    });

    it('throws an error if the onPremiseJSUrl is not a valid URL', function() {
      expect(() => extractConfig({
        params: { onPremiseJSUrl: 'invalid URL' }
      }, {})).to.throw();
      expect(() => extractConfig({
        params: { onPremiseJSUrl: 'www.example.com/51Degrees.core.js' }
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
          params: { onPremiseJSUrl: url }
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
      const config = { resourceKey: 'TEST_RESOURCE_KEY' };
      expect(get51DegreesJSURL(config, mockWindow)).to.equal(
        'https://cloud.51degrees.com/api/v4/TEST_RESOURCE_KEY.js?' +
        `51D_ScreenPixelsHeight=${mockWindow.screen.height}&` +
        `51D_ScreenPixelsWidth=${mockWindow.screen.width}&` +
        `51D_PixelRatio=${mockWindow.devicePixelRatio}`
      );
    });

    it('returns the on-premise URL if the onPremiseJSUrl is provided', function () {
      const config = { onPremiseJSUrl: 'https://example.com/51Degrees.core.js' };
      expect(get51DegreesJSURL(config, mockWindow)).to.equal(
        `https://example.com/51Degrees.core.js?` +
        `51D_ScreenPixelsHeight=${mockWindow.screen.height}&` +
        `51D_ScreenPixelsWidth=${mockWindow.screen.width}&` +
        `51D_PixelRatio=${mockWindow.devicePixelRatio}`
      );
    });

    it('doesn\'t override static query string parameters', function () {
      const config = { onPremiseJSUrl: 'https://example.com/51Degrees.core.js?test=1' };
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

      const config = { onPremiseJSUrl: 'https://example.com/51Degrees.core.js' };
      expect(get51DegreesJSURL(config, mockWindow)).to.equal('https://example.com/51Degrees.core.js');
      expect(get51DegreesJSURL(config, window)).to.not.equal('https://example.com/51Degrees.core.js');
    });

    it('appends id.usage when idUsage is provided', function () {
      // The previous test deletes screen/devicePixelRatio from the shared
      // mockWindow, so build a fresh one here.
      const freshWindow = {
        screen: { height: 1117, width: 1728 },
        devicePixelRatio: 2,
      };
      const config = {
        resourceKey: 'TEST_RESOURCE_KEY',
        idUsage: 'standard',
      };
      expect(get51DegreesJSURL(config, freshWindow)).to.include('id.usage=standard');
    });

    it('omits id.usage when idUsage is undefined', function () {
      const freshWindow = {
        screen: { height: 1117, width: 1728 },
        devicePixelRatio: 2,
      };
      const config = { resourceKey: 'TEST_RESOURCE_KEY' };
      expect(get51DegreesJSURL(config, freshWindow)).to.not.include('id.usage');
    });

    it('appends tcstring when tcString is provided', function () {
      const freshWindow = { screen: { height: 1117, width: 1728 }, devicePixelRatio: 2 };
      const config = { resourceKey: 'TEST_RESOURCE_KEY', tcString: 'CONSENTX' };
      expect(get51DegreesJSURL(config, freshWindow)).to.include('tcstring=CONSENTX');
    });

    it('keeps a realistic multi-segment TCF string intact', function () {
      const freshWindow = { screen: { height: 1117, width: 1728 }, devicePixelRatio: 2 };
      const tc = 'CPysuENPyveLkADACBENADCsAP_AAH_AAAAAAAAA.YAAAAAAAAA';
      const config = { resourceKey: 'TEST_RESOURCE_KEY', tcString: tc };
      expect(get51DegreesJSURL(config, freshWindow)).to.include('tcstring=' + tc);
    });

    it('omits tcstring when tcString is undefined', function () {
      const freshWindow = { screen: { height: 1117, width: 1728 }, devicePixelRatio: 2 };
      const config = { resourceKey: 'TEST_RESOURCE_KEY' };
      expect(get51DegreesJSURL(config, freshWindow)).to.not.include('tcstring');
    });

    it('appends gppstring when gpp is provided', function () {
      const freshWindow = { screen: { height: 1117, width: 1728 }, devicePixelRatio: 2 };
      const config = { resourceKey: 'TEST_RESOURCE_KEY', gpp: 'GPPX' };
      expect(get51DegreesJSURL(config, freshWindow)).to.include('gppstring=GPPX');
    });

    it('omits gppstring when gpp is undefined', function () {
      const freshWindow = { screen: { height: 1117, width: 1728 }, devicePixelRatio: 2 };
      const config = { resourceKey: 'TEST_RESOURCE_KEY' };
      expect(get51DegreesJSURL(config, freshWindow)).to.not.include('gppstring');
    });

    it('appends id.usage, tcstring and gppstring together', function () {
      const freshWindow = { screen: { height: 1117, width: 1728 }, devicePixelRatio: 2 };
      const config = {
        resourceKey: 'TEST_RESOURCE_KEY',
        idUsage: 'standard',
        tcString: 'CONSENTX',
        gpp: 'GPPX',
      };
      const url = get51DegreesJSURL(config, freshWindow);
      expect(url).to.include('id.usage=standard');
      expect(url).to.include('tcstring=CONSENTX');
      expect(url).to.include('gppstring=GPPX');
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
      expect(data).to.deep.equal({ TEST_ORTB2_KEY: 'TEST_ORTB2_VALUE' });
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

    it('merges ip data into the result when data51.ip is present', function () {
      const data51 = {
        device: fiftyOneDegreesDevice,
        ip: {
          ip: '1.2.3.4',
          locationconfidence: 'high',
          latitude: 51.5,
          longitude: -0.1,
          countrycode3: 'GBR',
        },
      };
      const result = convert51DegreesDataToOrtb2(data51);
      expect(result.device.ip).to.equal('1.2.3.4');
      expect(result.device.geo.lat).to.equal(51.5);
      expect(result.device.geo.ipservice).to.equal(511);
      expect(result.device.make).to.equal('Apple');
    });

    it('merges fodid data into user.eids when tdlUrl is supplied', function () {
      const data51 = {
        device: fiftyOneDegreesDevice,
        fodid: {
          idproblic: 'lic-uid',
          idprobglobal: 'global-uid',
        },
      };
      const result = convert51DegreesDataToOrtb2(data51, { tdlUrl: 'https://tdl.example/x' });
      expect(result.user.eids).to.have.lengthOf(1);
      expect(result.user.eids[0].uids).to.deep.equal([{ id: 'lic-uid', atype: 1 }, { id: 'global-uid', atype: 1 }]);
      expect(result.user.eids[0].ext.tdl).to.deep.equal(['https://tdl.example/x']);
    });

    it('returns only device mapping when ip and fodid are absent', function () {
      const data51 = { device: fiftyOneDegreesDevice };
      const result = convert51DegreesDataToOrtb2(data51, { tdlUrl: 'https://tdl.example/x' });
      expect(result.device.make).to.equal('Apple');
      expect(result.user).to.be.undefined;
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
      const device = { ...fiftyOneDegreesDevice };
      delete device.deviceid;
      expect(convert51DegreesDeviceToOrtb2(device).device.ext).to.not.have.any.keys('fiftyonedegrees_deviceId');
      expect(convert51DegreesDeviceToOrtb2(device).device.ext.fod).to.not.have.any.keys('deviceId');
    });

    it('sets the model to hardwarename if hardwaremodel is not provided', function() {
      const device = { ...fiftyOneDegreesDevice };
      delete device.hardwaremodel;
      expect(convert51DegreesDeviceToOrtb2(device).device).to.deep.include({ model: 'Macintosh' });
    });

    it('does not set the model if hardwarename is empty', function() {
      const device = { ...fiftyOneDegreesDevice };
      delete device.hardwaremodel;
      device.hardwarename = [];
      expect(convert51DegreesDeviceToOrtb2(device).device).to.not.have.any.keys('model');
    });

    it('prefers hardwarenameprefix over hardwaremodel for model field', function() {
      const device = { ...fiftyOneDegreesDevice, hardwarenameprefix: 'iPhone' };
      expect(convert51DegreesDeviceToOrtb2(device).device).to.deep.include({ model: 'iPhone' });
    });

    it('falls back to hardwaremodel when hardwarenameprefix is not provided', function() {
      const device = { ...fiftyOneDegreesDevice };
      delete device.hardwarenameprefix;
      expect(convert51DegreesDeviceToOrtb2(device).device).to.deep.include({ model: 'Macintosh' });
    });

    it('sets hwv from hardwarenameversion when provided', function() {
      const device = { ...fiftyOneDegreesDevice, hardwarenameversion: '12 Pro Max' };
      expect(convert51DegreesDeviceToOrtb2(device).device).to.deep.include({ hwv: '12 Pro Max' });
    });

    it('does not set hwv if hardwarenameversion is not provided', function() {
      const device = { ...fiftyOneDegreesDevice };
      delete device.hardwarenameversion;
      expect(convert51DegreesDeviceToOrtb2(device).device).to.not.have.any.keys('hwv');
    });

    it('sets model from hardwarenameprefix independently of hwv from hardwarenameversion', function() {
      const deviceWithPrefix = { ...fiftyOneDegreesDevice, hardwarenameprefix: 'iPhone' };
      delete deviceWithPrefix.hardwarenameversion;
      const resultWithPrefix = convert51DegreesDeviceToOrtb2(deviceWithPrefix).device;
      expect(resultWithPrefix).to.deep.include({ model: 'iPhone' });
      expect(resultWithPrefix).to.not.have.any.keys('hwv');

      const deviceWithVersion = { ...fiftyOneDegreesDevice, hardwarenameversion: '12 Pro Max' };
      delete deviceWithVersion.hardwarenameprefix;
      const resultWithVersion = convert51DegreesDeviceToOrtb2(deviceWithVersion).device;
      expect(resultWithVersion).to.deep.include({ hwv: '12 Pro Max' });
      expect(resultWithVersion).to.deep.include({ model: 'Macintosh' });
    });

    it('does not set the ppi if screeninchesheight is not provided', function() {
      const device = { ...fiftyOneDegreesDevice };
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

  describe('convert51DegreesIpToOrtb2', function() {
    const fullIp = {
      ip: '1.2.3.4',
      ipv6: '2001:db8::1',
      latitude: 51.5,
      longitude: -0.1,
      countrycode3: 'GBR',
      iso31662lvl4: 'GB-ENG',
      zipcode: 'SW1',
      timezoneoffset: 0,
      accuracyradiusmin: 1.5,
      locationconfidence: 'high',
    };

    it('returns an empty object when ip is undefined', function() {
      expect(convert51DegreesIpToOrtb2(undefined)).to.deep.equal({});
    });

    it('returns an empty object when ip is null', function() {
      expect(convert51DegreesIpToOrtb2(null)).to.deep.equal({});
    });

    it('maps ip and ipv6 unconditionally when locationconfidence is missing', function() {
      const result = convert51DegreesIpToOrtb2({ ip: '1.2.3.4', ipv6: '2001:db8::1' });
      expect(result).to.deep.equal({
        device: { ip: '1.2.3.4', ipv6: '2001:db8::1' },
      });
    });

    it('maps full ip data with locationconfidence=high → ipservice=511', function() {
      const result = convert51DegreesIpToOrtb2(fullIp);
      expect(result).to.deep.equal({
        device: {
          ip: '1.2.3.4',
          ipv6: '2001:db8::1',
          geo: {
            lat: 51.5,
            lon: -0.1,
            country: 'GBR',
            region: 'GB-ENG',
            zip: 'SW1',
            utcoffset: 0,
            accuracy: 1500,
            type: 2,
            ipservice: 511,
          },
        },
      });
    });

    it('uses ipservice=512 when locationconfidence=medium', function() {
      const result = convert51DegreesIpToOrtb2({ ...fullIp, locationconfidence: 'medium' });
      expect(result.device.geo.ipservice).to.equal(512);
    });

    it('compares locationconfidence case-insensitively', function() {
      const result = convert51DegreesIpToOrtb2({ ...fullIp, locationconfidence: 'HIGH' });
      expect(result.device.geo.ipservice).to.equal(511);
    });

    it('skips all geo fields when locationconfidence=low', function() {
      const result = convert51DegreesIpToOrtb2({ ...fullIp, locationconfidence: 'low' });
      expect(result.device.geo).to.be.undefined;
      expect(result.device.ip).to.equal('1.2.3.4');
      expect(result.device.ipv6).to.equal('2001:db8::1');
    });

    it('skips all geo fields when locationconfidence=unknown', function() {
      const result = convert51DegreesIpToOrtb2({ ...fullIp, locationconfidence: 'Unknown' });
      expect(result.device.geo).to.be.undefined;
      expect(result.device.ip).to.equal('1.2.3.4');
      expect(result.device.ipv6).to.equal('2001:db8::1');
    });

    it('skips all geo fields when locationconfidence is absent', function() {
      const { locationconfidence, ...withoutConfidence } = fullIp;
      const result = convert51DegreesIpToOrtb2(withoutConfidence);
      expect(result.device.geo).to.be.undefined;
    });

    it('multiplies accuracyradiusmin by 1000 for accuracy in meters', function() {
      const result = convert51DegreesIpToOrtb2({ ...fullIp, accuracyradiusmin: 2 });
      expect(result.device.geo.accuracy).to.equal(2000);
    });

    it('maps iso31662lvl4 to device.geo.region', function() {
      const result = convert51DegreesIpToOrtb2(fullIp);
      expect(result.device.geo.region).to.equal('GB-ENG');
    });

    it('omits device.geo.region when iso31662lvl4 is absent', function() {
      const { iso31662lvl4, ...withoutRegion } = fullIp;
      const result = convert51DegreesIpToOrtb2(withoutRegion);
      expect(result.device.geo.region).to.be.undefined;
    });

    it('preserves zero coordinates as valid values', function() {
      const result = convert51DegreesIpToOrtb2({
        ...fullIp,
        latitude: 0,
        longitude: 0,
      });
      expect(result.device.geo.lat).to.equal(0);
      expect(result.device.geo.lon).to.equal(0);
    });

    it('preserves zero accuracyradiusmin', function() {
      const result = convert51DegreesIpToOrtb2({ ...fullIp, accuracyradiusmin: 0 });
      expect(result.device.geo.accuracy).to.equal(0);
    });

    it('omits null/undefined source fields from output', function() {
      const result = convert51DegreesIpToOrtb2({
        ip: '1.2.3.4',
        locationconfidence: 'high',
        latitude: 51.5,
      });
      expect(result.device.geo).to.deep.equal({
        lat: 51.5,
        type: 2,
        ipservice: 511,
      });
    });
  });

  describe('convert51DegreesFoDiDToOrtb2', function() {
    const fullFodid = {
      idproblic: 'lic-uid-base64',
      idprobglobal: 'global-uid-base64',
    };
    const TDL_URL = 'https://tdl.example/x';

    it('returns an empty object when fodid is undefined', function() {
      expect(convert51DegreesFoDiDToOrtb2(undefined, TDL_URL)).to.deep.equal({});
    });

    it('returns an empty object when fodid is null', function() {
      expect(convert51DegreesFoDiDToOrtb2(null, TDL_URL)).to.deep.equal({});
    });

    it('emits an empty object when both uids are absent', function() {
      expect(convert51DegreesFoDiDToOrtb2({}, TDL_URL)).to.deep.equal({});
    });

    it('emits a full eids entry with tdlUrl', function() {
      const result = convert51DegreesFoDiDToOrtb2(fullFodid, TDL_URL);
      expect(result).to.deep.equal({
        user: {
          eids: [{
            inserter: '51degrees.com',
            source: '51d.es',
            mm: 5,
            uids: [{ id: 'lic-uid-base64', atype: 1 }, { id: 'global-uid-base64', atype: 1 }],
            ext: { tdl: [TDL_URL] },
          }],
        },
      });
    });

    it('omits ext.tdl when tdlUrl is falsy', function() {
      const result = convert51DegreesFoDiDToOrtb2(fullFodid, undefined);
      expect(result.user.eids[0].ext).to.be.undefined;
      expect(result.user.eids[0].uids).to.deep.equal([{ id: 'lic-uid-base64', atype: 1 }, { id: 'global-uid-base64', atype: 1 }]);
    });

    it('emits entry with only idproblic when idprobglobal is absent', function() {
      const result = convert51DegreesFoDiDToOrtb2({ idproblic: 'lic-only' }, TDL_URL);
      expect(result.user.eids[0].uids).to.deep.equal([{ id: 'lic-only', atype: 1 }]);
    });

    it('emits entry with only idprobglobal when idproblic is absent', function() {
      const result = convert51DegreesFoDiDToOrtb2({ idprobglobal: 'global-only' }, TDL_URL);
      expect(result.user.eids[0].uids).to.deep.equal([{ id: 'global-only', atype: 1 }]);
    });

    it('uses constant inserter, source, and mm', function() {
      const result = convert51DegreesFoDiDToOrtb2(fullFodid, TDL_URL);
      expect(result.user.eids[0].inserter).to.equal('51degrees.com');
      expect(result.user.eids[0].source).to.equal('51d.es');
      expect(result.user.eids[0].mm).to.equal(5);
    });

    it('omits matcher field', function() {
      const result = convert51DegreesFoDiDToOrtb2(fullFodid, TDL_URL);
      expect(result.user.eids[0]).to.not.have.property('matcher');
    });
  });

  describe('resolveIdUsage', function() {
    const PMP_STORAGE_KEY = '__51d_pmp_pref';

    afterEach(function() {
      localStorage.removeItem(PMP_STORAGE_KEY);
    });

    it('reads "standard" from PMP storage when params absent', function() {
      localStorage.setItem(
        PMP_STORAGE_KEY,
        JSON.stringify({ v: 1, p: 'standard', t: Date.now() }),
      );
      expect(resolveIdUsage({ params: {} })).to.equal('standard');
    });

    it('reads "personalized" from PMP storage when params absent', function() {
      localStorage.setItem(
        PMP_STORAGE_KEY,
        JSON.stringify({ v: 1, p: 'personalized', t: Date.now() }),
      );
      expect(resolveIdUsage({ params: {} })).to.equal('personalized');
    });

    it('returns undefined when PMP storage has unknown schema version', function() {
      localStorage.setItem(
        PMP_STORAGE_KEY,
        JSON.stringify({ v: 2, p: 'standard', t: Date.now() }),
      );
      expect(resolveIdUsage({ params: {} })).to.be.undefined;
    });

    it('returns undefined when PMP storage has unknown preference value', function() {
      localStorage.setItem(
        PMP_STORAGE_KEY,
        JSON.stringify({ v: 1, p: 'never-heard-of-it', t: Date.now() }),
      );
      expect(resolveIdUsage({ params: {} })).to.be.undefined;
    });

    it('returns undefined when PMP storage is malformed JSON', function() {
      localStorage.setItem(PMP_STORAGE_KEY, 'not-json{');
      expect(resolveIdUsage({ params: {} })).to.be.undefined;
    });

    it('returns undefined when both sources are absent', function() {
      expect(resolveIdUsage({ params: {} })).to.be.undefined;
    });

    it('returns undefined when moduleConfig has no params', function() {
      expect(resolveIdUsage({})).to.be.undefined;
    });
  });

  describe('resolveTcString', function() {
    it('returns the consent string from userConsent.gdpr.consentString', function() {
      expect(resolveTcString({ gdpr: { consentString: 'CONSENTX' } })).to.equal('CONSENTX');
    });

    it('returns the string regardless of gdprApplies', function() {
      expect(resolveTcString({ gdpr: { consentString: 'C', gdprApplies: false } })).to.equal('C');
      expect(resolveTcString({ gdpr: { consentString: 'C', gdprApplies: true } })).to.equal('C');
    });

    it('returns undefined when consentString is empty', function() {
      expect(resolveTcString({ gdpr: { consentString: '' } })).to.be.undefined;
    });

    it('returns undefined when consentString is not a string', function() {
      expect(resolveTcString({ gdpr: { consentString: 123 } })).to.be.undefined;
    });

    it('returns undefined when gdpr is absent', function() {
      expect(resolveTcString({})).to.be.undefined;
    });

    it('returns undefined when userConsent is undefined', function() {
      expect(resolveTcString(undefined)).to.be.undefined;
    });
  });

  describe('resolveGpp', function() {
    it('returns the gpp string from userConsent.gpp.gppString', function() {
      expect(resolveGpp({ gpp: { gppString: 'GPPX' } })).to.equal('GPPX');
    });

    it('returns undefined when gppString is empty', function() {
      expect(resolveGpp({ gpp: { gppString: '' } })).to.be.undefined;
    });

    it('returns undefined when gppString is not a string', function() {
      expect(resolveGpp({ gpp: { gppString: 123 } })).to.be.undefined;
    });

    it('returns undefined when gpp is absent', function() {
      expect(resolveGpp({})).to.be.undefined;
    });

    it('returns undefined when userConsent is undefined', function() {
      expect(resolveGpp(undefined)).to.be.undefined;
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
      const moduleConfig = { params: {} };
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(callback.calledOnce).to.be.true;
    });

    it('calls the callback even if submodule fails (on-premise, non-working URL)', async function() {
      const callback = sinon.spy();
      const moduleConfig = { params: { onPremiseJSUrl: 'http://localhost:12345/test/51Degrees.core.js' } };

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
    });

    it('calls the callback even if submodule fails (invalid resource key)', async function() {
      const callback = sinon.spy();
      const moduleConfig = { params: { resourceKey: 'INVALID_RESOURCE_KEY' } };

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
    });

    it('works with Delegate-CH meta tag', async function() {
      inject51DegreesMeta();
      const callback = sinon.spy();
      const moduleConfig = { params: { resourceKey: 'INVALID_RESOURCE_KEY' } };
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
    });

    it('has the correct ORTB2 data', async function() {
      const callback = sinon.spy();
      const moduleConfig = { params: { resourceKey: 'INVALID_RESOURCE_KEY' } };
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal(expectedORTB2Result);
    });

    it('enriches ortb2 with ip and user.eids when data51 contains them', async function() {
      // Override the global window.fod for this case only; restore after.
      const originalFod = window.fod;
      const data51 = {
        device: fiftyOneDegreesDevice,
        ip: { ip: '5.6.7.8', locationconfidence: 'high', countrycode3: 'USA' },
        fodid: { idproblic: 'lic-uid', idprobglobal: 'global-uid' },
      };
      window.fod = { complete: (cb) => cb(data51) };

      const callback = sinon.spy();
      const moduleConfig = {
        params: {
          resourceKey: 'INVALID_RESOURCE_KEY',
          idUsage: 'standard',
          tdlUrl: 'https://tdl.example/x',
        },
      };

      try {
        getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(callback.calledOnce).to.be.true;
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ip).to.equal('5.6.7.8');
        expect(reqBidsConfigObj.ortb2Fragments.global.device.geo.country).to.equal('USA');
        expect(reqBidsConfigObj.ortb2Fragments.global.user.eids).to.have.lengthOf(1);
        expect(reqBidsConfigObj.ortb2Fragments.global.user.eids[0].uids)
          .to.deep.equal([{ id: 'lic-uid', atype: 1 }, { id: 'global-uid', atype: 1 }]);
        expect(reqBidsConfigObj.ortb2Fragments.global.user.eids[0].ext.tdl)
          .to.deep.equal(['https://tdl.example/x']);
      } finally {
        window.fod = originalFod;
      }
    });

    it('does not overwrite a publisher-set device.ip / device.ipv6', async function() {
      const originalFod = window.fod;
      window.fod = {
        complete: (cb) => cb({ ip: { ip: '5.6.7.8', ipv6: 'fe80::51d', locationconfidence: 'high' } }),
      };
      reqBidsConfigObj.ortb2Fragments.global.device = { ip: '10.0.0.1', ipv6: 'fe80::pub' };
      const callback = sinon.spy();
      const moduleConfig = { params: { resourceKey: 'INVALID_RESOURCE_KEY' } };

      try {
        getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ip).to.equal('10.0.0.1');
        expect(reqBidsConfigObj.ortb2Fragments.global.device.ipv6).to.equal('fe80::pub');
      } finally {
        window.fod = originalFod;
      }
    });

    it('forwards tcstring and gppstring from userConsent to the script URL', async function() {
      const callback = sinon.spy();
      const moduleConfig = { params: { resourceKey: 'INVALID_RESOURCE_KEY' } };
      const userConsent = {
        gdpr: { consentString: 'TCSTRINGVAL', gdprApplies: true },
        gpp: { gppString: 'GPPSTRINGVAL' },
      };

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, userConsent);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(loadExternalScriptStub.called).to.be.true;
      const scriptUrl = loadExternalScriptStub.getCall(0).args[0];
      expect(scriptUrl).to.include('tcstring=TCSTRINGVAL');
      expect(scriptUrl).to.include('gppstring=GPPSTRINGVAL');
    });
  });

  describe('init', function() {
    it('initialises the 51Degrees RTD provider', function() {
      expect(fiftyOneDegreesSubmodule.init()).to.be.true;
    });
  });
});
