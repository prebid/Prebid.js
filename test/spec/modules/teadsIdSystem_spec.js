import { teadsIdSubmodule } from 'modules/teadsIdSystem.js';
import * as utils from 'src/utils.js';

describe('TeadsIdSystem (removed, no-op stub)', function () {
  let logWarnStub;

  beforeEach(function () {
    logWarnStub = sinon.stub(utils, 'logWarn');
  });

  afterEach(function () {
    logWarnStub.restore();
  });

  it('should still be registered under the teadsId name', function () {
    expect(teadsIdSubmodule.name).to.equal('teadsId');
  });

  it('should not provide an id and should warn', function () {
    expect(teadsIdSubmodule.getId({ params: { pubId: 1234 } })).to.be.undefined;
    expect(logWarnStub.calledOnce).to.be.true;
  });

  it('should not decode any value', function () {
    expect(teadsIdSubmodule.decode('teads-id')).to.be.undefined;
  });
});
