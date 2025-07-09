import { storage, openPairIdSubmodule } from 'modules/openPairIdSystem.js';
import * as utils from 'src/utils.js';

import {
  attachIdSystem,
  coreStorage,
  getConsentHash,
  init,
  startAuctionHook,
  setSubmoduleRegistry
} from '../../../modules/userId/index.js';

import {createEidsArray, getEids} from '../../../modules/userId/eids.js';

describe('openPairId', function () {
  let sandbox;
  let logInfoStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    logInfoStub = sandbox.stub(utils, 'logInfo');
  });
  afterEach(() => {
    sandbox.restore();
  });

  it('should read publisher id from specified clean room if configured with storageKey', function() {
    let publisherIds = ['dGVzdC1wYWlyLWlkMQ==', 'test-pair-id2', 'test-pair-id3'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('habu_pairId_custom').returns(btoa(JSON.stringify({'envelope': publisherIds})));

    let id = openPairIdSubmodule.getId({
      params: {
        habu: {
          storageKey: 'habu_pairId_custom'
        }
      }})

    expect(id).to.be.deep.equal({id: publisherIds});
  });

  it('should read publisher id from liveramp with default storageKey and additional clean room with configured storageKey', function() {
    let getDataStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    let liveRampPublisherIds = ['lr-test-pair-id1', 'lr-test-pair-id2', 'lr-test-pair-id3'];
    getDataStub.withArgs('_lr_pairId').returns(btoa(JSON.stringify({'envelope': liveRampPublisherIds})));

    let habuPublisherIds = ['habu-test-pair-id1', 'habu-test-pair-id2', 'habu-test-pair-id3'];
    getDataStub.withArgs('habu_pairId_custom').returns(btoa(JSON.stringify({'envelope': habuPublisherIds})));

    let id = openPairIdSubmodule.getId({
      params: {
        habu: {
          storageKey: 'habu_pairId_custom'
        },
        liveramp: {}
      }})

    expect(id).to.be.deep.equal({id: habuPublisherIds.concat(liveRampPublisherIds)});
  });

  it('should log an error if no ID is found when getId', function() {
    openPairIdSubmodule.getId({ params: {} });
    expect(logInfoStub.calledOnce).to.be.true;
  });

  it('should read publisher id from local storage if exists', function() {
    let publisherIds = ['test-pair-id1', 'test-pair-id2', 'test-pair-id3'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('pairId').returns(btoa(JSON.stringify(publisherIds)));

    let id = openPairIdSubmodule.getId({ params: {} });
    expect(id).to.be.deep.equal({id: publisherIds});
  });

  it('should read publisher id from cookie if exists', function() {
    let publisherIds = ['test-pair-id4', 'test-pair-id5', 'test-pair-id6'];
    sandbox.stub(storage, 'getCookie').withArgs('pairId').returns(btoa(JSON.stringify(publisherIds)));

    let id = openPairIdSubmodule.getId({ params: {} });
    expect(id).to.be.deep.equal({id: publisherIds});
  });

  it('should read publisher id from default liveramp envelope local storage key if configured', function() {
    let publisherIds = ['test-pair-id1', 'test-pair-id2', 'test-pair-id3'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('_lr_pairId').returns(btoa(JSON.stringify({'envelope': publisherIds})));
    let id = openPairIdSubmodule.getId({
      params: {
        liveramp: {}
      }})
    expect(id).to.be.deep.equal({id: publisherIds})
  });

  it('should read publisher id from default liveramp envelope cookie entry if configured', function() {
    let publisherIds = ['test-pair-id4', 'test-pair-id5', 'test-pair-id6'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('_lr_pairId').returns(btoa(JSON.stringify({'envelope': publisherIds})));
    let id = openPairIdSubmodule.getId({
      params: {
        liveramp: {}
      }})
    expect(id).to.be.deep.equal({id: publisherIds})
  });

  it('should read publisher id from specified liveramp envelope cookie entry if configured with storageKey', function() {
    let publisherIds = ['test-pair-id7', 'test-pair-id8', 'test-pair-id9'];
    sandbox.stub(storage, 'getDataFromLocalStorage').withArgs('lr_pairId_custom').returns(btoa(JSON.stringify({'envelope': publisherIds})));
    let id = openPairIdSubmodule.getId({
      params: {
        liveramp: {
          storageKey: 'lr_pairId_custom'
        }
      }})
    expect(id).to.be.deep.equal({id: publisherIds})
  });

  it('should not get data from storage if local storage and cookies are disabled', function () {
    sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
    sandbox.stub(storage, 'cookiesAreEnabled').returns(false);
    let id = openPairIdSubmodule.getId({
      params: {
        liveramp: {
          storageKey: 'lr_pairId_custom'
        }
      }
    })
    expect(id).to.equal(undefined)
  });

  it('honors inserter, matcher', () => {
    const config = {
      inserter: 'some-domain.com',
      matcher: 'another-domain.com'
    };

    const result = openPairIdSubmodule.eids.openPairId(['some-random-id-value'], config);

    expect(result.length).to.equal(1);

    expect(result[0]).to.deep.equal(
      {
        source: 'pair-protocol.com',
        mm: 3,
        inserter: 'some-domain.com',
        matcher: 'another-domain.com',
        uids: [
          {
            atype: 3,
            id: 'some-random-id-value'
          }
        ]
      }
    );
  });

  describe('encoding', () => {
    it('encodes and decodes the original value with atob/btoa', function () {
      const value = 'dGVzdC1wYWlyLWlkMQ==';

      let publisherIds = [value];

      const stored = btoa(JSON.stringify({'envelope': publisherIds}));

      const read = JSON.parse(atob(stored));

      expect(value).to.eq(read.envelope[0]);
    });
  });

  describe('eid', () => {
    before(() => {
      attachIdSystem(openPairIdSubmodule);
    });

    it('generates the minimal eids', function() {
      const userId = {
        openPairId: 'some-random-id-value'
      };

      const newEids = createEidsArray(userId);

      expect(newEids.length).to.equal(1);

      expect(newEids[0]).to.deep.include({
        source: 'pair-protocol.com',
        mm: 3,
        uids: [{ id: 'some-random-id-value', atype: 3 }]
      });
    });
  });
});
