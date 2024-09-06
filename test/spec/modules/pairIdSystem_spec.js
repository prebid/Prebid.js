import { storage, pairIdSubmodule } from 'modules/pairIdSystem.js';
import * as utils from 'src/utils.js';

describe('pairId', function () {
  let sandbox;
  let logInfoStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    logInfoStub = sandbox.stub(utils, 'logInfo');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('should read pairId from specified clean room if configured with storageKey', function() {
    let pairIds = ['test-pair-id1', 'test-pair-id2', 'test-pair-id3'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('habu_pairId_custom').returns(btoa(JSON.stringify({'envelope': pairIds})));

    let id = pairIdSubmodule.getId({
      params: {
        habu: {
          storageKey: 'habu_pairId_custom'
        }
      }})

    expect(id).to.be.deep.equal({id: pairIds});
  })

  it('should read pairID from liveramp with default storageKey and additional clean room with configured storageKey', function() {
    let getDataStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    let liveRampPairIds = ['lr-test-pair-id1', 'lr-test-pair-id2', 'lr-test-pair-id3'];
    getDataStub.withArgs('_lr_pairId').returns(btoa(JSON.stringify({'envelope': liveRampPairIds})));

    let habuPairIds = ['habu-test-pair-id1', 'habu-test-pair-id2', 'habu-test-pair-id3'];
    getDataStub.withArgs('habu_pairId_custom').returns(btoa(JSON.stringify({'envelope': habuPairIds})));

    let id = pairIdSubmodule.getId({
      params: {
        habu: {
          storageKey: 'habu_pairId_custom'
        },
        liveramp: {}
      }})

    expect(id).to.be.deep.equal({id: habuPairIds.concat(liveRampPairIds)});
  });

  it('should log an error if no ID is found when getId', function() {
    pairIdSubmodule.getId({ params: {} });
    expect(logInfoStub.calledOnce).to.be.true;
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

  it('should not get data from storage if local storage and cookies are disabled', function () {
    sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
    sandbox.stub(storage, 'cookiesAreEnabled').returns(false);
    let id = pairIdSubmodule.getId({
      params: {
        liveramp: {
          storageKey: 'lr_pairId_custom'
        }
      }
    })
    expect(id).to.equal(undefined)
  })
});
