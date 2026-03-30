import { insuradsRtdProvider } from 'modules/insuradsRtdProvider.js';
import * as ajax from 'src/ajax.js';
import { config } from 'src/config.js';

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

describe('insuradsRtdProvider', function () {
  let fetchStub;

  beforeEach(function () {
    config.resetConfig();
    fetchStub = sinon.stub(ajax, 'fetch');
  });

  afterEach(function () {
    fetchStub.restore();
  });

  describe('insuradsRtdProvider submodule', function () {
    it('should have correct module name', function () {
      expect(insuradsRtdProvider.name).to.equal('insuradsRtd');
    });

    it('should have correct GVLID', function () {
      expect(insuradsRtdProvider.gvlid).to.equal(596);
    });
  });

  describe('init', function () {
    it('should return false when publicId is missing', function () {
      const config = {
        params: {}
      };
      expect(insuradsRtdProvider.init(config)).to.be.false;
    });

    it('should return false when publicId is not a string', function () {
      const config = {
        params: {
          publicId: 123
        }
      };
      expect(insuradsRtdProvider.init(config)).to.be.false;
    });

    it('should return false when publicId is an object', function () {
      const config = {
        params: {
          publicId: {}
        }
      };
      expect(insuradsRtdProvider.init(config)).to.be.false;
    });

    it('should return false when publicId is an empty string', function () {
      const config = {
        params: {
          publicId: ''
        }
      };
      expect(insuradsRtdProvider.init(config)).to.be.false;
    });

    it('should return false when publicId is only whitespace', function () {
      const config = {
        params: {
          publicId: '   '
        }
      };
      expect(insuradsRtdProvider.init(config)).to.be.false;
    });

    it('should return false when params is missing', function () {
      const config = {};
      expect(insuradsRtdProvider.init(config)).to.be.false;
    });

    it('should return true when publicId is provided', function () {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      expect(insuradsRtdProvider.init(sampleConfig)).to.be.true;
    });

    it('should make API call with correct URL', function () {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: {} })
      });

      insuradsRtdProvider.init(sampleConfig);

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

      insuradsRtdProvider.init(sampleConfig);

      const fetchOptions = fetchStub.getCall(0).args[1];
      expect(fetchOptions.method).to.equal('GET');
      expect(fetchOptions.headers['Content-Type']).to.equal('application/json');
    });

    it('should handle successful API response with keyValues', function (done) {
      fetchStub.resolves({
        ok: true,
        json: () => Promise.resolve({ keyValues: sampleKeyValues })
      });

      insuradsRtdProvider.init(sampleConfig);

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

      insuradsRtdProvider.getBidRequestData(reqBidsConfigObj, () => {
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.rtdData).to.deep.equal(sampleKeyValues);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.existing).to.equal('keep');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.rtdData).to.equal(undefined);
        done();
      }, sampleConfig);
    });

    it('should handle API error gracefully', function () {
      fetchStub.rejects(new Error('Network error'));

      expect(insuradsRtdProvider.init(sampleConfig)).to.be.true;
    });

    it('should handle non-ok response gracefully', function () {
      fetchStub.resolves({
        ok: false,
        status: 404
      });

      expect(insuradsRtdProvider.init(sampleConfig)).to.be.true;
    });
  });
});
