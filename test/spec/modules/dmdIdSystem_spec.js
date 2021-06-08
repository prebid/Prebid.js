import * as utils from '../../../src/utils.js';

import {dmdIdSubmodule} from 'modules/dmdIdSystem.js';

describe('Dmd ID System', function() {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  it('should log an error if no configParams were passed into getId', function () {
    dmdIdSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if configParams doesnot have api_key passed to getId', function () {
    dmdIdSubmodule.getId({params: {}});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if configParams has invalid api_key passed into getId', function () {
    dmdIdSubmodule.getId({params: {api_key: 123}});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should not log an error if configParams has valid api_key passed into getId', function () {
    dmdIdSubmodule.getId({params: {api_key: '3fdbe297-3690-4f5c-9e11-ee9186a6d77c'}});
    expect(logErrorStub.calledOnce).to.be.false;
  });

  it('should return undefined if empty value passed into decode', function () {
    expect(dmdIdSubmodule.decode()).to.be.undefined;
  });

  it('should return undefined if invalid dmd-dgid passed into decode', function () {
    expect(dmdIdSubmodule.decode(123)).to.be.undefined;
  });

  it('should return dmdId if valid dmd-dgid passed into decode', function () {
    let data = { 'dmdId': 'U12345' };
    expect(dmdIdSubmodule.decode('U12345')).to.deep.equal(data);
  });
});
