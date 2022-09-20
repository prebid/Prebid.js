import { config } from 'src/config';
import { pubxaiSubmodule } from 'modules/pubxaiRtdProvider';

describe('pubxaiRtdProvider', () => {
  before(() => {
    config.resetConfig();
  });

  after(() => { });

  beforeEach(() => { });

  describe('pubxai submodule', () => {
    it('has the submodule name as `pubxai`', () => {
      const expectedName = 'pubxai';
      expect(pubxaiSubmodule.NAME).toBe(expectedName);
    });

    describe('init call', () => {
      it('will return true when `useRtd` is true in the provider config', () => {
        const providerConfig = { params: { useRtd: true } };
        const initResult = pubxaiSubmodule.init(providerConfig);
        expect(initResult).to.be.true;
      });

      it('will return true without any provider config', () => {
        const initResult = pubxaiSubmodule.init();
        expect(initResult).to.be.true;
      });

      it('will return true when `useRtd` is false in the provider config', () => {
        const providerConfig = { params: { useRtd: false } };
        const initResult = pubxaiSubmodule.init(providerConfig);
        expect(initResult).to.be.false;
      });
    });

    describe('getBidRequestData call', () => {
      it('will set floors and buckets to window object', () => {
        const endpoint = 'https://qvyrma0fd5.execute-api.ap-south-1.amazonaws.com/default/floors-test';
        const providerConfig = { params: { useRtd: false, endpoint } };
        pubxaiSubmodule.getBidRequestData(null, null, providerConfig);
        expect(window.__PBXCNFG__.prb).toBeDefined()
        expect(window.__PBXCNFG__.flrs).toBeDefined()
      });
    });
  });
});
