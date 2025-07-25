import {publinkIdSubmodule} from 'modules/publinkIdSystem.js';
import {getCoreStorageManager, getStorageManager} from '../../../src/storageManager.js';
import {server} from 'test/mocks/xhr.js';
import sinon from 'sinon';
import {parseUrl} from '../../../src/utils.js';

const storage = getCoreStorageManager();

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

    describe('callout for id', () => {
      const callbackSpy = sinon.spy();

      beforeEach(() => {
        callbackSpy.resetHistory();
      });

      it('Has cached id', () => {
        const config = {storage: {type: 'cookie'}};
        const submoduleCallback = publinkIdSubmodule.getId(config, undefined, TEST_COOKIE_VALUE).callback;
        submoduleCallback(callbackSpy);

        const request = server.requests[0];
        const parsed = parseUrl(request.url);

        expect(parsed.hostname).to.equal('proc.ad.cpe.dotomi.com');
        expect(parsed.pathname).to.equal('/cvx/client/sync/publink/refresh');
        expect(parsed.search.mpn).to.equal('Prebid.js');
        expect(parsed.search.mpv).to.equal('$prebid.version$');
        expect(parsed.search.publink).to.equal(TEST_COOKIE_VALUE);

        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });

      it('Request path has priority', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'ca11c0ca7', site_id: '102030'}};
        const submoduleCallback = publinkIdSubmodule.getId(config, undefined, TEST_COOKIE_VALUE).callback;
        submoduleCallback(callbackSpy);

        const request = server.requests[0];
        const parsed = parseUrl(request.url);

        expect(parsed.hostname).to.equal('proc.ad.cpe.dotomi.com');
        expect(parsed.pathname).to.equal('/cvx/client/sync/publink');
        expect(parsed.search.mpn).to.equal('Prebid.js');
        expect(parsed.search.mpv).to.equal('$prebid.version$');
        expect(parsed.search.publink).to.equal(TEST_COOKIE_VALUE);

        request.respond(200, {}, JSON.stringify(serverResponse));
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.lastArg).to.equal(serverResponse.publink);
      });

      it('Fetch with GDPR consent data', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'ca11c0ca7', site_id: '102030'}};
        const consentData = {gdpr: {gdprApplies: 1, consentString: 'myconsentstring'}};
        const submoduleCallback = publinkIdSubmodule.getId(config, consentData).callback;
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
        const submoduleCallback = publinkIdSubmodule.getId(config).callback;
        submoduleCallback(callbackSpy);

        const request = server.requests[0];
        const parsed = parseUrl(request.url);

        expect(parsed.hostname).to.equal('proc.ad.cpe.dotomi.com');
        expect(parsed.pathname).to.equal('/cvx/client/sync/publink');
        expect(parsed.search.mpn).to.equal('Prebid.js');
        expect(parsed.search.mpv).to.equal('$prebid.version$');

        request.respond(204);
        expect(callbackSpy.called).to.be.false;
      });

      it('reject plain email address', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'tester@test.com'}};
        const consentData = {gdprApplies: 1, consentString: 'myconsentstring'};
        const submoduleCallback = publinkIdSubmodule.getId(config, consentData).callback;
        submoduleCallback(callbackSpy);

        expect(server.requests).to.have.lengthOf(0);
        expect(callbackSpy.called).to.be.false;
      });
    });

    describe('usPrivacy', () => {
      const callbackSpy = sinon.spy();

      it('Fetch with usprivacy data', () => {
        const config = {storage: {type: 'cookie'}, params: {e: 'ca11c0ca7', api_key: 'abcdefg'}};
        const submoduleCallback = publinkIdSubmodule.getId(config, {usp: '1YNN'}).callback;
        submoduleCallback(callbackSpy);

        const request = server.requests[0];
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
