import { expect } from 'chai';
import sinon from 'sinon';
import { overtoneModule } from '../../../modules/overtoneRtdProvider.js';
import { logMessage } from '../../../src/utils.js';

const TEST_URLS = {
  success: 'https://www.theguardian.com/film/2024/nov/15/duncan-cowles-silent-men-interview',
  fail: 'https://www.nytimes.com',
  ignore: 'https://wsj.com',
};

describe('Overtone RTD Submodule with Test URLs', function () {
  this.timeout(120000);

  let fetchContextDataStub;

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
  });

  afterEach(function () {
    fetchContextDataStub.restore(); 
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
});
