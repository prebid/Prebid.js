import { insurAdsRtdProvider } from 'modules/insurAdsRtdProvider.js';
import * as ajax from 'src/ajax.js';
import { config } from 'src/config.js';

const responseHeader = { 'Content-Type': 'application/json' };

const sampleConfig = {
  name: 'insuradsRtd',
  waitForIt: true,
  params: {
    publicId: 'ALIYJZJD'
  }
};

const sampleKeyValues = {
  'iat-imp': ['1'],
  'iat-imp-app': ['1'],
  'iat-app': ['2954']
};

describe('insurAdsRtdProvider', function () {
  let fetchStub;

  beforeEach(function () {
    config.resetConfig();
    fetchStub = sinon.stub(ajax, 'fetch');
  });

  afterEach(function () {
    fetchStub.restore();
  });

  describe('insurAdsRtdProvider submodule', function () {
    it('should have correct module name', function () {
      expect(insurAdsRtdProvider.name).to.equal('insuradsRtd');
    });

    it('should have correct GVLID', function () {
      expect(insurAdsRtdProvider.gvlid).to.equal(596);
    });
  });

  describe('init', function () {
    it('should return false when publicId is missing', function () {
      const config = {
        params: {}
      };
      expect(insurAdsRtdProvider.init(config)).to.be.false;
    });

    it('should return false when params is missing', function () {
      const config = {};
      expect(insurAdsRtdProvider.init(config)).to.be.false;
    });

    it('should return true when publicId is provided', function () {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      expect(insurAdsRtdProvider.init(sampleConfig)).to.be.true;
    });

    it('should make API call with correct URL', function () {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      insurAdsRtdProvider.init(sampleConfig);

      expect(fetchStub.called).to.be.true;
      const fetchUrl = fetchStub.getCall(0).args[0];
      expect(fetchUrl).to.include(`https://services.insurads.com/core/init/prebid/${sampleConfig.params.publicId}`);
      expect(fetchUrl).to.include('url=');
    });

    it('should make API call with correct options', function () {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      insurAdsRtdProvider.init(sampleConfig);

      const fetchOptions = fetchStub.getCall(0).args[1];
      expect(fetchOptions.keepalive).to.be.true;
      expect(fetchOptions.withCredentials).to.be.true;
      expect(fetchOptions.method).to.equal('GET');
      expect(fetchOptions.headers['Content-Type']).to.equal('application/json');
    });

    it('should handle successful API response with keyValues', function (done) {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: sampleKeyValues })
      });

      insurAdsRtdProvider.init(sampleConfig);

      // Give the promise time to resolve and then verify bid request enrichment
      setTimeout(() => {
        const reqBidsConfigObj = {
          adUnits: [{
            code: 'ad-unit-1',
            ortb2Imp: {
              ext: {}
            }
          }]
        };

        insurAdsRtdProvider.getBidRequestData(reqBidsConfigObj, () => {
          expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.insurads).to.deep.equal(sampleKeyValues);
          done();
        }, sampleConfig);
      }, 50);
    });

    it('should handle API error gracefully', function () {
      fetchStub.rejects(new Error('Network error'));

      expect(insurAdsRtdProvider.init(sampleConfig)).to.be.true;
    });

    it('should handle non-ok response gracefully', function () {
      fetchStub.resolves({
        ok: false,
        status: 404
      });

      expect(insurAdsRtdProvider.init(sampleConfig)).to.be.true;
    });

    it('should handle 204 No Content response for invalid publicId', function (done) {
      // First clear state with empty keyValues
      fetchStub.reset();
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      const clearConfig = {
        params: {
          publicId: 'clear-state-204'
        }
      };

      insurAdsRtdProvider.init(clearConfig);

      setTimeout(() => {
        // Now test with 204 response
        fetchStub.reset();
        fetchStub.resolves({
          ok: false,
          status: 204
        });

        const invalidConfig = {
          params: {
            publicId: 'INVALID_ID'
          }
        };

        const initResult = insurAdsRtdProvider.init(invalidConfig);
        expect(initResult).to.be.true;

        // Wait and verify no keyValues are set
        setTimeout(() => {
          const targetingData = insurAdsRtdProvider.getTargetingData(['ad-unit-1']);
          expect(targetingData).to.deep.equal({});
          done();
        }, 50);
      }, 50);
    });
  });

  describe('getTargetingData', function () {
    it('should return empty object when no keyValues are available', function (done) {
      const config = {
        params: {
          publicId: 'reset'
        }
      };

      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      insurAdsRtdProvider.init(config);

      // Wait for promise to resolve and reset state
      setTimeout(() => {
        const adUnitCodes = ['ad-unit-1', 'ad-unit-2'];
        const result = insurAdsRtdProvider.getTargetingData(adUnitCodes, config);

        // When keyValues is empty, getTargetingData returns empty object (not populated with ad unit keys)
        expect(result).to.be.an('object');
        expect(Object.keys(result)).to.have.lengthOf(0);
        done();
      }, 50);
    });

    it('should return keyValues for all ad units', function (done) {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: sampleKeyValues })
      });

      insurAdsRtdProvider.init(sampleConfig);

      setTimeout(() => {
        const adUnitCodes = ['ad-unit-1', 'ad-unit-2', 'ad-unit-3'];
        const result = insurAdsRtdProvider.getTargetingData(adUnitCodes, sampleConfig);

        expect(result).to.be.an('object');
        expect(result['ad-unit-1']).to.deep.equal(sampleKeyValues);
        expect(result['ad-unit-2']).to.deep.equal(sampleKeyValues);
        expect(result['ad-unit-3']).to.deep.equal(sampleKeyValues);
        done();
      }, 50);
    });

    it('should handle empty ad unit codes array', function () {
      const adUnitCodes = [];
      const config = {};

      const result = insurAdsRtdProvider.getTargetingData(adUnitCodes, config);

      expect(result).to.be.an('object');
      expect(Object.keys(result)).to.have.lengthOf(0);
    });

    it('should apply same keyValues to different ad units', function (done) {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: sampleKeyValues })
      });

      insurAdsRtdProvider.init(sampleConfig);

      setTimeout(() => {
        const adUnitCodes = ['div-1', 'div-2'];
        const result = insurAdsRtdProvider.getTargetingData(adUnitCodes, sampleConfig);

        expect(result['div-1']).to.deep.equal(sampleKeyValues);
        expect(result['div-2']).to.deep.equal(sampleKeyValues);
        expect(result['div-1']).to.equal(result['div-2']);
        done();
      }, 50);
    });
  });

  describe('integration scenarios', function () {
    it('should handle complete flow: init -> API call -> getTargetingData', function (done) {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: sampleKeyValues })
      });

      // Step 1: Initialize
      const initResult = insurAdsRtdProvider.init(sampleConfig);
      expect(initResult).to.be.true;

      // Step 2: Wait for API call to complete
      setTimeout(() => {
        // Step 3: Get targeting data
        const adUnitCodes = ['banner-ad', 'video-ad'];
        const targetingData = insurAdsRtdProvider.getTargetingData(adUnitCodes, sampleConfig);

        expect(targetingData['banner-ad']).to.deep.equal(sampleKeyValues);
        expect(targetingData['video-ad']).to.deep.equal(sampleKeyValues);
        done();
      }, 50);
    });

    it('should handle API response without keyValues property', function (done) {
      // First, clear state by setting empty keyValues
      fetchStub.reset();
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      const clearConfig = {
        params: {
          publicId: 'clear-state'
        }
      };

      insurAdsRtdProvider.init(clearConfig);

      // Wait for state to clear
      setTimeout(() => {
        // Now test with no keyValues property
        fetchStub.reset();
        fetchStub.resolves({
          ok: true,
          json: () => Promise.resolve({})
        });

        const config = {
          params: {
            publicId: 'test-no-keyvalues'
          }
        };

        insurAdsRtdProvider.init(config);

        setTimeout(() => {
          const targetingData = insurAdsRtdProvider.getTargetingData(['ad-unit-1']);
          // When no keyValues in response, should return empty object
          expect(targetingData).to.deep.equal({});
          done();
        }, 50);
      }, 50);
    });

    it('should handle empty keyValues from API', function (done) {
      const config = {
        params: {
          publicId: 'test-empty-keyvalues'
        }
      };

      // Reset stub behavior for this test
      fetchStub.reset();
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      insurAdsRtdProvider.init(config);

      setTimeout(() => {
        const targetingData = insurAdsRtdProvider.getTargetingData(['ad-unit-1']);
        // When keyValues is empty object, should return empty object
        expect(targetingData).to.deep.equal({});
        done();
      }, 50);
    });
  });
});
