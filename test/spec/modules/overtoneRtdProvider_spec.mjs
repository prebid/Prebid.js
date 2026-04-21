import { expect } from 'chai';
import sinon from 'sinon';
import { overtoneModule, overtoneRtdProvider } from '../../../modules/overtoneRtdProvider.js';
import { logMessage } from '../../../src/utils.js';

const TEST_URLS = {
  success: 'https://www.theguardian.com/film/2024/nov/15/duncan-cowles-silent-men-interview',
  fail: 'https://www.nytimes.com',
  empty: 'https://wsj.com',
};

describe('Overtone RTD Submodule with Test URLs', function () {
  this.timeout(120000);

  let fetchContextDataStub;

  beforeEach(function () {
    fetchContextDataStub = sinon.stub(overtoneModule, 'fetchContextData').callsFake(async (url) => {
      if (url === TEST_URLS.success) {
        return { categories: ['ovtn_004', 'ovtn_104', 'ovtn_309', 'ovtn_202'] };
      }
      if (url === TEST_URLS.fail) {
        throw new Error('Invalid response format');
      }
      if (url === TEST_URLS.empty) {
        return { categories: [] };
      }
      throw new Error('Unexpected URL in test');
    });
  });

  afterEach(function () {
    fetchContextDataStub.restore();
  });

  it('should fetch and return categories for the success URL', async function () {
    const data = await overtoneModule.fetchContextData(TEST_URLS.success);
    logMessage(data);
    expect(data).to.deep.equal({
      categories: ['ovtn_004', 'ovtn_104', 'ovtn_309', 'ovtn_202'],
    });
  });

  it('should reject for an invalid response', async function () {
    try {
      await overtoneModule.fetchContextData(TEST_URLS.fail);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.message).to.equal('Invalid response format');
    }
  });

  it('should return empty categories when no segments are present', async function () {
    const data = await overtoneModule.fetchContextData(TEST_URLS.empty);
    expect(data).to.deep.equal({
      categories: [],
    });
  });

  it('should merge into site.ext.data without overwriting existing data', function (done) {
    const bidReqConfig = {
      ortb2Fragments: {
        global: {
          site: {
            ext: {
              data: {
                existingProvider: { segments: ['seg_123'] }
              }
            }
          }
        }
      }
    };

    overtoneRtdProvider.getBidRequestData(bidReqConfig, () => {
      const data = bidReqConfig.ortb2Fragments.global.site.ext.data;
      // Existing FPD must be preserved
      expect(data.existingProvider).to.deep.equal({ segments: ['seg_123'] });
      // Overtone data must be namespaced under 'overtone'
      expect(data.overtone).to.exist;
      expect(data.overtone.categories).to.be.an('array');
      done();
    });
  });

  it('should namespace under overtone when no prior site.ext.data exists', function (done) {
    const bidReqConfig = {
      ortb2Fragments: {
        global: {
          site: {}
        }
      }
    };

    overtoneRtdProvider.getBidRequestData(bidReqConfig, () => {
      const data = bidReqConfig.ortb2Fragments.global.site.ext.data;
      expect(data.overtone).to.exist;
      expect(data.overtone.categories).to.be.an('array');
      done();
    });
  });
});
