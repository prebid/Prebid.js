import { pubxaiSubmodule } from 'modules/pubxaiRtdProvider';

describe('pubxaiRtdProvider', () => {
  describe('pubxai submodule', () => {
    describe('init call', () => {
      it('will return true when `useRtd` is true in the provider config', () => {
        const providerConfig = { params: { useRtd: true } };
        const initResult = pubxaiSubmodule.init(providerConfig);
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
        setTimeout(() => {
          expect(window.__PBXCNFG__.prb).to.be.equal('')
          expect(window.__PBXCNFG__.flrs).to.be.equal('')
        }, 1000);
      });
    });
  });
});
