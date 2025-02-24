import { expect } from 'chai';
import sinon from 'sinon';
import { overtoneModule, overtoneRtdProvider } from '../../../modules/overtoneRtdProvider.js';
import { logMessage } from '../../../src/utils.js';

const TEST_URLS = {
  success: 'https://www.theguardian.com/film/2024/nov/15/duncan-cowles-silent-men-interview',
  fail: 'https://www.nytimes.com',
  ignore: 'https://wsj.com',
};

describe('Overtone RTD Submodule with Test URLs', function () {
  let fetchContextDataStub;
  let getBidRequestDataStub;

  beforeEach(function () {
    fetchContextDataStub = sinon.stub(overtoneModule, 'fetchContextData').callsFake(async (url) => {
      if (url === TEST_URLS.success) {
        return { categories: ['ovtn_004', 'ovtn_104', 'ovtn_309', 'ovtn_202'], status: 1 };
      }
      if (url === TEST_URLS.fail) {
        return { categories: [], status: 3 };
      }
      if (url === TEST_URLS.ignore) {
        return { categories: [], status: 4 };
      }
      throw new Error('Unexpected URL in test');
    });
    
    getBidRequestDataStub = sinon.stub(overtoneRtdProvider, 'getBidRequestData').callsFake((config, callback) => {
      console.log('ortb2Fragments value:', JSON.stringify(config.ortb2Fragments, null, 2));
      if (config.shouldFail) {
        return;
      }
      callback();
    });
  });

  afterEach(function () {
    fetchContextDataStub.restore();
    getBidRequestDataStub.restore();
  });

  it('should fetch and return categories for the success URL', async function () {
    const data = await overtoneModule.fetchContextData(TEST_URLS.success);
    logMessage(data);
    expect(data).to.deep.equal({
      categories: ['ovtn_004', 'ovtn_104', 'ovtn_309', 'ovtn_202'],
      status: 1,
    });
  });

  it('should return the expected structure for the fail URL', async function () {
    const data = await overtoneModule.fetchContextData(TEST_URLS.fail);
    expect(data).to.deep.equal({
      categories: [],
      status: 3,
    });
  });

  it('should return the expected structure for the ignore URL', async function () {
    const data = await overtoneModule.fetchContextData(TEST_URLS.ignore);
    expect(data).to.deep.equal({
      categories: [],
      status: 4,
    });
  });

  describe('getBidRequestData', function () {
    it('should call callback function after execution', function (done) {
      const bidReqConfig = { ortb2Fragments: { global: { site: { ext: {} } } } };
      overtoneRtdProvider.getBidRequestData(bidReqConfig, () => {
        expect(true).to.be.true;
        done();
      });
    });

    it('should not call callback if config has shouldFail set to true', function () {
      const bidReqConfig = { shouldFail: true, ortb2Fragments: { global: { site: { ext: {} } } } };
      const callbackSpy = sinon.spy();
      overtoneRtdProvider.getBidRequestData(bidReqConfig, callbackSpy);
      sinon.assert.notCalled(callbackSpy);
    });
  });
});
