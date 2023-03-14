import { storage, pairIdSubmodule } from 'modules/pairIdSystem.js';
import * as utils from 'src/utils.js';

describe('pairId', function () {
  let sandbox;
  let logErrorStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    logErrorStub = sandbox.stub(utils, 'logError');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('should log an error if no ID is found when getId', function() {
    pairIdSubmodule.getId({ params: {} });
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should return pairId from local stroage if exists', function() {
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('pairId').returns('test-pair-id');

    let id = pairIdSubmodule.getId({ params: {} });
    expect(id).to.be.deep.equal({id: 'test-pair-id'});
  });

  it('should return pairId from cookie if exists', function() {
    sandbox.stub(storage, 'getCookie').withArgs('pairId').returns('test-pair-id');

    let id = pairIdSubmodule.getId({ params: {} });
    expect(id).to.be.deep.equal({id: 'test-pair-id'});
  });
});
