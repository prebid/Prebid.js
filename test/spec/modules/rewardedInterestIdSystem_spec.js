import sinon from 'sinon';
import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {attachIdSystem} from 'modules/userId';
import {createEidsArray} from 'modules/userId/eids';
import {
  MODULE_NAME,
  SOURCE,
  getRewardedInterestApi,
  watchRewardedInterestApi,
  getRewardedInterestId,
  apiNotAvailable,
  rewardedInterestIdSubmodule
} from 'modules/rewardedInterestIdSystem.js';

describe('rewardedInterestIdSystem', () => {
  const mockUserId = 'rewarded_interest_id';
  const mockApi = {
    getApiVersion: () => '1.0',
    getIdentityToken: () => Promise.resolve(mockUserId)
  };
  const errorApiNotFound = `${MODULE_NAME} module: Rewarded Interest API not found`;
  const errorIdFetch = `${MODULE_NAME} module: ID fetch encountered an error`;
  let mockReadySate = 'complete';
  let logErrorSpy;
  let callbackSpy;

  before(() => {
    Object.defineProperty(document, 'readyState', {
      get() {
        return mockReadySate;
      },
    });
  });

  beforeEach(() => {
    logErrorSpy = sinon.spy(utils, 'logError');
    callbackSpy = sinon.spy();
  });

  afterEach(() => {
    mockReadySate = 'complete';
    delete window.__riApi;
    logErrorSpy.restore();
  });

  describe('getRewardedInterestApi', () => {
    it('should return Rewarded Interest Api if exists', () => {
      expect(getRewardedInterestApi()).to.be.undefined;
      window.__riApi = {};
      expect(getRewardedInterestApi()).to.be.undefined;
      window.__riApi.getIdentityToken = mockApi.getIdentityToken;
      expect(getRewardedInterestApi()).to.deep.equal(window.__riApi);
    });
  });

  describe('watchRewardedInterestApi', () => {
    it('should execute callback when __riApi is set', () => {
      watchRewardedInterestApi(callbackSpy);
      expect(window.__riApi).to.be.undefined;
      window.__riApi = mockApi;
      expect(callbackSpy.calledOnceWithExactly(mockApi)).to.be.true;
      expect(getRewardedInterestApi()).to.deep.equal(mockApi);
    });
  });

  describe('getRewardedInterestId', () => {
    it('should get id from API and pass it to callback', async () => {
      await getRewardedInterestId(mockApi, callbackSpy);
      expect(callbackSpy.calledOnceWithExactly(mockUserId)).to.be.true;
    });
  });

  describe('apiNotAvailable', () => {
    it('should call callback without ID and log error', () => {
      apiNotAvailable(callbackSpy);
      expect(callbackSpy.calledOnceWithExactly()).to.be.true;
      expect(logErrorSpy.calledOnceWithExactly(errorApiNotFound)).to.be.true;
    });
  });

  describe('rewardedInterestIdSubmodule.name', () => {
    it('should expose the name of the submodule', () => {
      expect(rewardedInterestIdSubmodule).to.be.an.instanceof(Object);
      expect(rewardedInterestIdSubmodule.name).to.equal(MODULE_NAME);
    });
  });

  describe('rewardedInterestIdSubmodule.decode', () => {
    it('should wrap the given value inside an object literal', () => {
      expect(rewardedInterestIdSubmodule.decode(mockUserId)).to.deep.equal({ [MODULE_NAME]: mockUserId });
      expect(rewardedInterestIdSubmodule.decode('')).to.be.undefined;
      expect(rewardedInterestIdSubmodule.decode(null)).to.be.undefined;
    });
  });

  describe('rewardedInterestIdSubmodule.getId', () => {
    it('should return object with callback property', () => {
      const idResponse = rewardedInterestIdSubmodule.getId();
      expect(idResponse).to.be.an.instanceof(Object);
      expect(idResponse).to.have.property('callback');
      expect(idResponse.callback).to.be.a('function');
    });

    it('API not found, window loaded', async () => {
      const idResponse = rewardedInterestIdSubmodule.getId();
      idResponse.callback(callbackSpy);
      await Promise.resolve();
      expect(callbackSpy.calledOnceWithExactly()).to.be.true;
      expect(logErrorSpy.calledOnceWithExactly(errorApiNotFound)).to.be.true;
    });

    it('API not found, window not loaded', async () => {
      mockReadySate = 'loading';
      const idResponse = rewardedInterestIdSubmodule.getId();
      idResponse.callback(callbackSpy);
      window.dispatchEvent(new Event('load'));
      expect(callbackSpy.calledOnceWithExactly()).to.be.true;
      expect(logErrorSpy.calledOnceWithExactly(errorApiNotFound)).to.be.true;
    });

    it('API is set before getId, getIdentityToken return error', async () => {
      const error = Error();
      window.__riApi = {getIdentityToken: () => Promise.reject(error)};
      const idResponse = rewardedInterestIdSubmodule.getId();
      idResponse.callback(callbackSpy);
      await window.__riApi.getIdentityToken().catch(() => {});
      expect(callbackSpy.calledOnceWithExactly()).to.be.true;
      expect(logErrorSpy.calledOnceWithExactly(errorIdFetch, error)).to.be.true;
    });

    it('API is set after getId, getIdentityToken return error', async () => {
      const error = Error();
      mockReadySate = 'loading';
      const idResponse = rewardedInterestIdSubmodule.getId();
      idResponse.callback(callbackSpy);
      window.__riApi = {getIdentityToken: () => Promise.reject(error)};
      await window.__riApi.getIdentityToken().catch(() => {});
      expect(callbackSpy.calledOnceWithExactly()).to.be.true;
      expect(logErrorSpy.calledOnceWithExactly(errorIdFetch, error)).to.be.true;
    });

    it('API is set before getId, getIdentityToken return user ID', async () => {
      window.__riApi = mockApi;
      const idResponse = rewardedInterestIdSubmodule.getId();
      idResponse.callback(callbackSpy);
      await mockApi.getIdentityToken();
      expect(callbackSpy.calledOnceWithExactly(mockUserId)).to.be.true;
    });

    it('API is set after getId, getIdentityToken return user ID', async () => {
      mockReadySate = 'loading';
      const idResponse = rewardedInterestIdSubmodule.getId();
      idResponse.callback(callbackSpy);
      window.__riApi = mockApi;
      window.dispatchEvent(new Event('load'));
      await window.__riApi.getIdentityToken().catch(() => {});
      expect(callbackSpy.calledOnceWithExactly(mockUserId)).to.be.true;
    });
  });

  describe('rewardedInterestIdSubmodule.eids', () => {
    it('should expose the eids of the submodule', () => {
      expect(rewardedInterestIdSubmodule).to.have.property('eids');
      expect(rewardedInterestIdSubmodule.eids).to.be.a('object');
      expect(rewardedInterestIdSubmodule.eids).to.deep.equal({
        [MODULE_NAME]: {
          source: SOURCE,
          atype: 3,
        },
      });
    });

    it('createEidsArray', () => {
      attachIdSystem(rewardedInterestIdSubmodule);
      const eids = createEidsArray({
        [MODULE_NAME]: mockUserId
      });
      expect(eids).to.be.a('array');
      expect(eids.length).to.equal(1);
      expect(eids[0]).to.deep.equal({
        source: SOURCE,
        uids: [{
          id: mockUserId,
          atype: 3,
        }]
      });
    });
  });
});
