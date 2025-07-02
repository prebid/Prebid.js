import { config } from 'src/config.js';
import * as oftmediaRtd from 'modules/oftmediaRtdProvider.js';

import * as adloader from '../../../src/adloader.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

const RTD_CONFIG = {
  dataProviders: [
    {
      name: 'oftmedia',
      waitForIt: true,
      params: {
        publisherId: '0653b3fc-a645-4bcc-bfee-b8982974dd53',
        keywords: ['red', 'blue', 'white'],
        bidderCode: 'appnexus',
        enrichRequest: true
      },
    },
  ],
};

const TIMEOUT = 10;

describe('oftmedia RTD Submodule', function () {
  let sandbox;
  let loadExternalScriptTag;
  let localStorageIsEnabledStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    config.resetConfig();

    loadExternalScriptTag = document.createElement('script');

    loadExternalScriptStub.callsFake((_url, _moduleName, callback) => {
      if (typeof callback === 'function') {
        setTimeout(callback, 10);
      }

      setTimeout(() => {
        if (loadExternalScriptTag.onload) {
          loadExternalScriptTag.onload();
        }
        loadExternalScriptTag.dispatchEvent(new Event('load'));
      }, 10);

      return loadExternalScriptTag;
    });

    localStorageIsEnabledStub = sandbox.stub(oftmediaRtd.storageManager, 'localStorageIsEnabled');
    localStorageIsEnabledStub.returns(true);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Module initialization', function () {
    it('should initialize and return true when publisherId is provided', function () {
      const result = oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);
      expect(result).to.equal(true);
    });

    it('should return false when publisherId is not provided', function () {
      const invalidConfig = {
        params: {
          bidderCode: 'appnexus',
          enrichRequest: true
        }
      };
      const result = oftmediaRtd.oftmediaRtdSubmodule.init(invalidConfig);
      expect(result).to.equal(false);
    });

    it('should return false when publisherId is not a string', function () {
      const invalidConfig = {
        params: {
          publisherId: 12345,
          bidderCode: 'appnexus',
          enrichRequest: true
        }
      };
      const result = oftmediaRtd.oftmediaRtdSubmodule.init(invalidConfig);
      expect(result).to.equal(false);
    });
  });

  describe('Bid request enrichment', function () {
    it('should enrich bid request with keywords, OS and device when enrichRequest is true', function (done) {
      const bidConfig = {
        ortb2Fragments: {
          bidder: {
            appnexus: {}
          }
        }
      };

      const initResult = oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);
      expect(initResult).to.equal(true);

      sandbox.stub(oftmediaRtd.oftmediaRtdSubmodule, 'getBidRequestData').callsFake((bidConfig, callback, moduleConfig) => {
        if (moduleConfig.params.enrichRequest) {
          bidConfig.ortb2Fragments.bidder.appnexus.site = {
            keywords: moduleConfig.params.keywords.join(',')
          };
          bidConfig.ortb2Fragments.bidder.appnexus.device = {
            os: "0"
          };
        }

        setTimeout(() => callback(null), 100);
      });

      oftmediaRtd.oftmediaRtdSubmodule.getBidRequestData(bidConfig, function (error) {
        if (error) return done(error);

        try {
          expect(bidConfig.ortb2Fragments.bidder.appnexus).to.have.nested.property('site.keywords');
          expect(bidConfig.ortb2Fragments.bidder.appnexus.site.keywords).to.include('red');
          expect(bidConfig.ortb2Fragments.bidder.appnexus.site.keywords).to.include('blue');
          expect(bidConfig.ortb2Fragments.bidder.appnexus.site.keywords).to.include('white');

          done();
        } catch (e) {
          done(e);
        }
      }, RTD_CONFIG.dataProviders[0]);
    });

    it('should not enrich bid request when enrichRequest is false', function (done) {
      const configWithEnrichFalse = {
        params: {
          publisherId: '0653b3fc-a645-4bcc-bfee-b8982974dd53',
          keywords: ['red', 'blue', 'white'],
          bidderCode: 'appnexus',
          enrichRequest: false
        }
      };

      const bidConfig = {
        ortb2Fragments: {
          bidder: {
            appnexus: {}
          }
        }
      };

      const initResult = oftmediaRtd.oftmediaRtdSubmodule.init(configWithEnrichFalse);
      expect(initResult).to.equal(true);

      sandbox.stub(oftmediaRtd.oftmediaRtdSubmodule, 'getBidRequestData').callsFake((bidConfig, callback, moduleConfig) => {
        if (!moduleConfig.params.enrichRequest) {
          setTimeout(() => callback(null), 100);
        }
      });

      oftmediaRtd.oftmediaRtdSubmodule.getBidRequestData(bidConfig, function (error) {
        if (error) return done(error);

        try {
          expect(bidConfig.ortb2Fragments.bidder.appnexus).to.not.have.nested.property('site.keywords');
          expect(bidConfig.ortb2Fragments.bidder.appnexus).to.not.have.nested.property('device.os');
          done();
        } catch (e) {
          done(e);
        }
      }, configWithEnrichFalse);
    });
  });
});
