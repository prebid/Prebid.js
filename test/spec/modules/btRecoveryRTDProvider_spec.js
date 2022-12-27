import * as btRTD from '../../../modules/btRecoveryRTDProvider';
import * as utils from '../../../src/utils';
import { loadExternalScript } from '../../../src/adloader.js';

describe('btRecovery - Blockthrough Realtime Data Provider', function () {
  let utilsLogErrorStub;

  beforeEach(function () {
    utilsLogErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    utilsLogErrorStub.restore();
  });

  it('should init, load BT script and return true, if the config is correct', function () {
    const RTD_CONFIG = {
      dataProviders: [
        {
          name: 'btRecovery',
          params: {
            pubID: '1234567890123456',
          },
        },
      ],
    };

    const result = btRTD.btRecoveryRtdModule.init(RTD_CONFIG.dataProviders[0]);

    expect(result).to.equal(true);
    expect(utilsLogErrorStub.called).to.equal(false);
    expect(loadExternalScript.calledWith(`https://btloader.com/tag?o=${RTD_CONFIG.dataProviders[0].params.pubID}&upapi=true`)).to.equal(true);
  });

  it('should not init and return false, if the config is incorrect', function () {
    const RTD_CONFIG = {
      dataProviders: [
        {
          name: 'btRecovery',
          params: {},
        },
      ],
    };

    const result = btRTD.btRecoveryRtdModule.init(RTD_CONFIG.dataProviders[0]);

    expect(result).to.equal(false);
    expect(utilsLogErrorStub.called).to.equal(true);
    expect(loadExternalScript.called).to.equal(false);
  });
});
