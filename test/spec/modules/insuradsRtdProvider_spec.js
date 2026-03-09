import { insurAdsRtdProvider } from 'modules/insuradsRtdProvider.js';
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
      expect(fetchOptions.credentials).to.equal('include');
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
            bids: [
              {
                bidder: 'insurads',
                params: { existing: 'keep' }
              },
              {
                bidder: 'someOtherBidder',
                params: {}
              }
            ]
          }]
        };

        insurAdsRtdProvider.getBidRequestData(reqBidsConfigObj, () => {
          expect(reqBidsConfigObj.adUnits[0].bids[0].params.rtdData).to.deep.equal(sampleKeyValues);
          expect(reqBidsConfigObj.adUnits[0].bids[0].params.existing).to.equal('keep');
          expect(reqBidsConfigObj.adUnits[0].bids[1].params.rtdData).to.equal(undefined);
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
  });
});
