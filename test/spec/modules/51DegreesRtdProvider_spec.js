import {
  extractConfig,
  get51DegreesJSURL,
  inject51DegreesScript,
  is51DegreesMetaPresent,
  setOrtb2KeyIfNotEmpty,
  convert51DegreesDeviceToOrtb2,
  getBidRequestData,
  fiftyOneDegreesSubmodule,
} from 'modules/51DegreesRtdProvider';

describe('51DegreesRtdProvider', function() {
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
  });

  describe('get51DegreesJSURL', function() {
    it('returns the cloud URL if the resourceKey is provided', function() {
      const config = {resourceKey: 'TEST_RESOURCE_KEY'};
      expect(get51DegreesJSURL(config)).to.equal(
        'https://cloud.51degrees.com/api/v4/TEST_RESOURCE_KEY.js'
      );
    });

    it('returns the on-premise URL if the onPremiseJSUrl is provided', function() {
      const config = {onPremiseJSUrl: 'https://example.com/51Degrees.core.js'};
      expect(get51DegreesJSURL(config)).to.equal('https://example.com/51Degrees.core.js');
    });
  });

  describe('inject51DegreesScript', function() {
    let initialHeadInnerHTML;

    before(function() {
      initialHeadInnerHTML = document.head.innerHTML;
    });

    afterEach(function() {
      document.head.innerHTML = initialHeadInnerHTML;
    });

    it('injects the 51Degrees script into the document head', function(done) {
      inject51DegreesScript('https://localhost/51Degrees.core.js')
        .catch(() => {
          // Ignore the error, since the script is not available
        })
        .finally(() => {
          const script = document.head.querySelector('script[src="https://localhost/51Degrees.core.js"]');
          expect(script).to.not.be.null;
          done();
        });
    });
  });

  describe('is51DegreesMetaPresent', function() {
    let initialHeadInnerHTML;
    const inject51DegreesMeta = () => {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Delegate-CH';
      meta.content = 'sec-ch-ua-full-version-list https://cloud.51degrees.com; sec-ch-ua-model https://cloud.51degrees.com; sec-ch-ua-platform https://cloud.51degrees.com; sec-ch-ua-platform-version https://cloud.51degrees.com';
      document.head.appendChild(meta);
    };

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
  });

  describe('setOrtb2KeyIfNotEmpty', function() {
    it('sets value of ORTB2 key if it is not empty', function() {
      const data = {};
      setOrtb2KeyIfNotEmpty(data, 'TEST_ORTB2_KEY', 'TEST_ORTB2_VALUE');
      expect(data).to.deep.equal({TEST_ORTB2_KEY: 'TEST_ORTB2_VALUE'});
    });

    it('throws an error if the key is empty', function() {
      const data = {};
      expect(() => setOrtb2KeyIfNotEmpty(data, '', 'TEST_ORTB2_VALUE')).to.throw();
    });

    it('does not set value of ORTB2 key if it is empty', function() {
      const data = {};
      setOrtb2KeyIfNotEmpty(data, 'TEST_ORTB2_KEY', '');
      setOrtb2KeyIfNotEmpty(data, 'TEST_ORTB2_KEY', 0);
      setOrtb2KeyIfNotEmpty(data, 'TEST_ORTB2_KEY', null);
      setOrtb2KeyIfNotEmpty(data, 'TEST_ORTB2_KEY', undefined);
      expect(data).to.deep.equal({});
    });
  });

  describe('convert51DegreesDeviceToOrtb2', function() {
    const fiftyOneDegreesDevice = {
      'screenpixelswidth': 5120,
      'screenpixelsheight': 1440,
      'hardwarevendor': 'Apple',
      'hardwaremodel': 'Macintosh',
      'hardwarename': [
        'Macintosh',
      ],
      'platformname': 'macOS',
      'platformversion': '14.1.2',
      'screeninchesheight': 13.27,
      'screenincheswidth': 47.17,
      'devicetype': 'Desktop',
      'pixelratio': 1,
      'deviceid': '17595-131215-132535-18092',
    };

    it('converts 51Degrees device data to ORTB2 format', function() {
      expect(convert51DegreesDeviceToOrtb2(fiftyOneDegreesDevice)).to.deep.equal({
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
        },
      });
    });

    it('returns an empty object if the device data is not provided', function() {
      expect(convert51DegreesDeviceToOrtb2()).to.deep.equal({});
    });

    it('does not set the deviceid if it is not provided', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.deviceid;
      expect(convert51DegreesDeviceToOrtb2(device)).to.not.have.any.keys('ext');
    });

    it('sets the model to hardwarename if hardwaremodel is not provided', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.hardwaremodel;
      expect(convert51DegreesDeviceToOrtb2(device)).to.deep.include({model: 'Macintosh'});
    });

    it('does not set the model if hardwarename is empty', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.hardwaremodel;
      device.hardwarename = [];
      expect(convert51DegreesDeviceToOrtb2(device)).to.not.have.any.keys('model');
    });

    it('does not set the ppi if screeninchesheight is not provided', function() {
      const device = {...fiftyOneDegreesDevice};
      delete device.screeninchesheight;
      expect(convert51DegreesDeviceToOrtb2(device)).to.not.have.any.keys('ppi');
    });
  });

  describe('getBidRequestData', function() {
    it('calls the callback even if submodule fails (wrong config)', function() {
      const callback = sinon.spy();
      const moduleConfig = {params: {}};
      getBidRequestData({}, callback, moduleConfig, {});
      expect(callback.calledOnce).to.be.true;
    });

    it('calls the callback even if submodule fails (on-premise, non-working URL)', async function() {
      const callback = sinon.spy();
      const moduleConfig = {params: {onPremiseJSUrl: 'http://localhost:12345/test/51Degrees.core.js'}};

      getBidRequestData({}, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(() => getBidRequestData(
        {}, callback, moduleConfig, {}
      )).to.not.throw();
    });

    it('calls the callback even if submodule fails (invalid resource key)', async function() {
      const callback = sinon.spy();
      const moduleConfig = {params: {resourceKey: 'INVALID_RESOURCE_KEY'}};

      getBidRequestData({}, callback, moduleConfig, {});
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(() => getBidRequestData(
        {}, callback, moduleConfig, {}
      )).to.not.throw();
    });
  });

  describe('init', function() {
    it('initialises the 51Degrees RTD provider', function() {
      expect(fiftyOneDegreesSubmodule.init()).to.be.true;
    });
  });
});
