import {publinkIdSubmodule} from 'modules/publinkIdSystem.js';
import {getStorageManager} from '../../../src/storageManager';
import {server} from 'test/mocks/xhr.js';
import sinon from 'sinon';
import {uspDataHandler} from '../../../src/adapterManager';
import {parseUrl} from '../../../src/utils';

export const storage = getStorageManager({gvlid: 24});
const TEST_COOKIE_VALUE = 'cookievalue';
describe('PublinkIdSystem', () => {
  describe('decode', () => {
    it('decode', () => {
      const result = publinkIdSubmodule.decode(TEST_COOKIE_VALUE);
      expect(result).deep.equals({publinkId: TEST_COOKIE_VALUE});
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
    it('priority goes to publink_srv cookie', () => {
      storage.setCookie(PUBLINK_SRV_COOKIE, JSON.stringify(COOKIE_VALUE), COOKIE_EXPIRATION);
      storage.setDataInLocalStorage(PUBLINK_COOKIE, JSON.stringify(LOCAL_VALUE));
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.equal(COOKIE_VALUE.publink);
      storage.setCookie(PUBLINK_SRV_COOKIE, '', DELETE_COOKIE);
      storage.removeDataFromLocalStorage(PUBLINK_COOKIE);
    });
    it('publink non-json cookie', () => {
      storage.setCookie(PUBLINK_COOKIE, COOKIE_VALUE.publink, COOKIE_EXPIRATION);
      const result = publinkIdSubmodule.getId();
      expect(result.id).to.equal(COOKIE_VALUE.publink);
      storage.setCookie(PUBLINK_COOKIE, '', DELETE_COOKIE);
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
        const config = {storage: {type: 'cookie'}, params: {e: 'ca11c0ca7', site_id: '102030'}};
        const consentData = {gdprApplies: 1, consentString: 'myconsentstring'};
        let submoduleCallback = publinkIdSubmodule.getId(config, consentData).callback;
        submoduleCallback(callbackSpy);

        const request = server.requests[0];
        const parsed = parseUrl(request.url);

        expect(parsed.hostname).to.equal('proc.ad.cpe.dotomi.com');
        expect(parsed.pathname).to.equal('/cvx/client/sync/publink');
        expect(parsed.search.mpn).to.equal('Prebid.js');
        expect(parsed.search.mpv).to.equal('$prebid.version$');
        expect(parsed.search.gdpr).to.equal('1');
        expect(parsed.search.gdpr_consent).to.equal('myconsentstring');
        expect(parsed.search.sid).to.equal('102030');
        expect(parsed.search.apikey).to.be.undefined;

        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });

      it('server doesnt respond', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'ca11c0ca7'}};
        let submoduleCallback = publinkIdSubmodule.getId(config).callback;
        submoduleCallback(callbackSpy);

        let request = server.requests[0];
        const parsed = parseUrl(request.url);

        expect(parsed.hostname).to.equal('proc.ad.cpe.dotomi.com');
        expect(parsed.pathname).to.equal('/cvx/client/sync/publink');
        expect(parsed.search.mpn).to.equal('Prebid.js');
        expect(parsed.search.mpv).to.equal('$prebid.version$');

        request.respond(204, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.called).to.be.false;
      });

      it('reject plain email address', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'tester@test.com'}};
        const consentData = {gdprApplies: 1, consentString: 'myconsentstring'};
        let submoduleCallback = publinkIdSubmodule.getId(config, consentData).callback;
        submoduleCallback(callbackSpy);

        expect(server.requests).to.have.lengthOf(0);
        expect(callbackSpy.called).to.be.false;
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
        const config = {storage: {type: 'cookie'}, params: {e: 'ca11c0ca7', api_key: 'abcdefg'}};
        let submoduleCallback = publinkIdSubmodule.getId(config).callback;
        submoduleCallback(callbackSpy);

        let request = server.requests[0];
        const parsed = parseUrl(request.url);

        expect(parsed.hostname).to.equal('proc.ad.cpe.dotomi.com');
        expect(parsed.pathname).to.equal('/cvx/client/sync/publink');
        expect(parsed.search.mpn).to.equal('Prebid.js');
        expect(parsed.search.mpv).to.equal('$prebid.version$');
        expect(parsed.search.us_privacy).to.equal('1YNN');
        expect(parsed.search.apikey).to.equal('abcdefg');

        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });
    });
  });
});
