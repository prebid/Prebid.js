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

  it('should read pairId from local storage if exists', function() {
    let pairIds = ['test-pair-id1', 'test-pair-id2', 'test-pair-id3'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('pairId').returns(btoa(JSON.stringify(pairIds)));

    let id = pairIdSubmodule.getId({ params: {} });
    expect(id).to.be.deep.equal({id: pairIds});
  });

  it('should read pairId from cookie if exists', function() {
    let pairIds = ['test-pair-id4', 'test-pair-id5', 'test-pair-id6'];
    sandbox.stub(storage, 'getCookie').withArgs('pairId').returns(btoa(JSON.stringify(pairIds)));

    let id = pairIdSubmodule.getId({ params: {} });
    expect(id).to.be.deep.equal({id: pairIds});
  });

  it('should read pairId from default liveramp envelope local storage key if configured', function() {
    let pairIds = ['test-pair-id1', 'test-pair-id2', 'test-pair-id3'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('_lr_pairId').returns(btoa(JSON.stringify({'envelope': pairIds})));
    let id = pairIdSubmodule.getId({
      params: {
        liveramp: {}
      }})
    expect(id).to.be.deep.equal({id: pairIds})
  })

  it('should read pairId from default liveramp envelope cookie entry if configured', function() {
    let pairIds = ['test-pair-id4', 'test-pair-id5', 'test-pair-id6'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('_lr_pairId').returns(btoa(JSON.stringify({'envelope': pairIds})));
    let id = pairIdSubmodule.getId({
      params: {
        liveramp: {}
      }})
    expect(id).to.be.deep.equal({id: pairIds})
  })

  it('should read pairId from specified liveramp envelope cookie entry if configured with storageKey', function() {
    let pairIds = ['test-pair-id7', 'test-pair-id8', 'test-pair-id9'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('lr_pairId_custom').returns(btoa(JSON.stringify({'envelope': pairIds})));
    let id = pairIdSubmodule.getId({
      params: {
        liveramp: {
          storageKey: 'lr_pairId_custom'
        }
      }})
    expect(id).to.be.deep.equal({id: pairIds})
  })
});
