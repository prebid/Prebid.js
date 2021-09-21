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

  describe('Fetch Local Cookies', () => {
    const PUBLINK_COOKIE = '_publink';
    const PUBLINK_SRV_COOKIE = '_publink_srv';
    const EXP = Date.now() + 60 * 60 * 24 * 7 * 1000;
    const COOKIE_VALUE = {publink: 'publinkCookieValue', exp: EXP};
    const LOCAL_VALUE = {publink: 'publinkLocalStorageValue', exp: EXP};
    const COOKIE_EXPIRATION = (new Date(Date.now() + 60 * 60 * 24 * 1000)).toUTCString();
    const DELETE_COOKIE = 'Thu, 01 Jan 1970 00:00:01 GMT';
    it('publink srv cookie', () => {
      storage.setCookie(PUBLINK_SRV_COOKIE, JSON.stringify(COOKIE_VALUE), COOKIE_EXPIRATION);
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.equal(COOKIE_VALUE.publink);
      storage.setCookie(PUBLINK_SRV_COOKIE, '', DELETE_COOKIE);
    });
    it('publink srv local storage', () => {
      storage.setDataInLocalStorage(PUBLINK_SRV_COOKIE, JSON.stringify(LOCAL_VALUE));
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.equal(LOCAL_VALUE.publink);
      storage.removeDataFromLocalStorage(PUBLINK_SRV_COOKIE);
    });
    it('publink cookie', () => {
      storage.setCookie(PUBLINK_COOKIE, JSON.stringify(COOKIE_VALUE), COOKIE_EXPIRATION);
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.equal(COOKIE_VALUE.publink);
      storage.setCookie(PUBLINK_COOKIE, '', DELETE_COOKIE);
    });
    it('publink local storage', () => {
      storage.setDataInLocalStorage(PUBLINK_COOKIE, JSON.stringify(LOCAL_VALUE));
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.equal(LOCAL_VALUE.publink);
      storage.removeDataFromLocalStorage(PUBLINK_COOKIE);
    });
    it('ignore expired cookie', () => {
      storage.setDataInLocalStorage(PUBLINK_COOKIE, JSON.stringify({publink: 'value', exp: Date.now() - 60 * 60 * 24 * 1000}));
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.be.undefined;
      storage.removeDataFromLocalStorage(PUBLINK_COOKIE);
    });
    it('priority goes to publink_srv cookie', () => {
      storage.setCookie(PUBLINK_SRV_COOKIE, JSON.stringify(COOKIE_VALUE), COOKIE_EXPIRATION);
      storage.setDataInLocalStorage(PUBLINK_COOKIE, JSON.stringify(LOCAL_VALUE));
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.equal(COOKIE_VALUE.publink);
      storage.setCookie(PUBLINK_SRV_COOKIE, '', DELETE_COOKIE);
      storage.removeDataFromLocalStorage(PUBLINK_COOKIE);
    });
  });

  describe('getId', () => {
    const serverResponse = {publink: 'ec0xHT3yfAOnykP64Qf0ORSi7LjNT1wju04ZSCsoPBekOJdBwK-0Zl_lXKDNnzhauC4iszBc-PvA1Be6IMlh1QocA'};
    it('no config', () => {
      const result = publinkIdSubmodule.getId();
      expect(result).to.exist;
      expect(result.callback).to.be.a('function');
    });
    it('Use local copy', () => {
      const result = publinkIdSubmodule.getId({}, undefined, TEST_COOKIE_VALUE);
      expect(result).to.be.undefined;
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
        request.url = request.url.replace(':443', '');
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
        request.url = request.url.replace(':443', '');
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
        request.url = request.url.replace(':443', '');
        expect(request.url).to.equal('https://proc.ad.cpe.dotomi.com/cvx/client/sync/publink?deh=hashedemailvalue&mpn=Prebid.js&mpv=$prebid.version$&us_privacy=1YNN');

        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });
    });
  });
});
