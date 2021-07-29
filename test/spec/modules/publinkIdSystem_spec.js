import {publinkIdSubmodule} from 'modules/publinkIdSystem.js';
import {getStorageManager} from '../../../src/storageManager';
import {server} from 'test/mocks/xhr.js';
import sinon from 'sinon';
import {uspDataHandler} from '../../../src/adapterManager';

export const storage = getStorageManager(24);
const TEST_COOKIE_VALUE = 'cookievalue';
describe('PublinkIdSystem', () => {
  describe('decode', () => {
    it('decode', () => {
      const result = publinkIdSubmodule.decode(TEST_COOKIE_VALUE);
      expect(result).deep.equals({publink: TEST_COOKIE_VALUE});
    });
  });

  describe('getId', () => {
    const serverResponse = {publink: 'ec0xHT3yfAOnykP64Qf0ORSi7LjNT1wju04ZSCsoPBekOJdBwK-0Zl_lXKDNnzhauC4iszBc-PvA1Be6IMlh1QocA'};
    it('no config', () => {
      const result = publinkIdSubmodule.getId();
      expect(result).to.exist;
      expect(result.callback).to.be.a('function');
    });
    it('Use local id', () => {
      const result = publinkIdSubmodule.getId({}, undefined, TEST_COOKIE_VALUE);
      expect(result).to.exist;
      expect(result.id).to.equal(TEST_COOKIE_VALUE);
      expect(result.callback).to.be.a('function');
    });

    describe('callout for id', () => {
      let callbackSpy = sinon.spy();

      beforeEach(() => {
        callbackSpy.resetHistory();
      });

      it('Fetch with consent data', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'hashedemailvalue'}};
        const consentData = {gdprApplies: 1, consentString: 'myconsentstring'};
        let submoduleCallback = publinkIdSubmodule.getId(config, consentData).callback;
        submoduleCallback(callbackSpy);

        let request = server.requests[0];
        expect(request.url).to.equal('https://proc.ad.cpe.dotomi.com/cvx/client/sync/publink?deh=hashedemailvalue&mpn=Prebid.js&mpv=$prebid.version$&gdpr=1&gdpr_consent=myconsentstring');

        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });

      it('server doesnt respond', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'hashedemailvalue'}};
        let submoduleCallback = publinkIdSubmodule.getId(config).callback;
        submoduleCallback(callbackSpy);

        let request = server.requests[0];
        expect(request.url).to.equal('https://proc.ad.cpe.dotomi.com/cvx/client/sync/publink?deh=hashedemailvalue&mpn=Prebid.js&mpv=$prebid.version$');

        request.respond(204, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.false;
      });
    });

    describe('usPrivacy', () => {
      let callbackSpy = sinon.spy();
      const oldPrivacy = uspDataHandler.getConsentData();
      before(() => {
        uspDataHandler.setConsentData('1YNN');
      });
      after(() => {
        uspDataHandler.setConsentData(oldPrivacy);
        callbackSpy.resetHistory();
      });

      it('Fetch with usprivacy data', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'hashedemailvalue'}};
        let submoduleCallback = publinkIdSubmodule.getId(config).callback;
        submoduleCallback(callbackSpy);

        let request = server.requests[0];
        expect(request.url).to.equal('https://proc.ad.cpe.dotomi.com/cvx/client/sync/publink?deh=hashedemailvalue&mpn=Prebid.js&mpv=$prebid.version$&us_privacy=1YNN');

        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });
    });
    describe('fetch from coreid', () => {
      let callbackSpy = sinon.spy();
      afterEach(() => {
        callbackSpy.resetHistory();
        delete window.coreid;
      });
      it('get id', () => {
        window.coreid = {};
        window.coreid.getPublinkId = (cb) => { cb(TEST_COOKIE_VALUE) };
        const submoduleCallback = publinkIdSubmodule.getId({}).callback;
        submoduleCallback(callbackSpy);
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(TEST_COOKIE_VALUE);
      });
      it('coreid fails', () => {
        window.coreid = {};
        window.coreid.getPublinkId = (cb) => { cb() };
        const submoduleCallback = publinkIdSubmodule.getId({params: {e: 'hashedemailvalue'}}).callback;
        submoduleCallback(callbackSpy);
        let request = server.requests[0];
        expect(request.url).to.equal('https://proc.ad.cpe.dotomi.com/cvx/client/sync/publink?deh=hashedemailvalue&mpn=Prebid.js&mpv=$prebid.version$');
        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });
      it('no hashed email param', () => {
        window.coreid = {};
        window.coreid.getPublinkId = (cb) => { cb() };
        const submoduleCallback = publinkIdSubmodule.getId({params: {}}).callback;
        submoduleCallback(callbackSpy);
        let request = server.requests[0];
        expect(request).to.be.undefined;
        expect(callbackSpy.calledOnce).to.be.false;
      });
    });
  });
});
