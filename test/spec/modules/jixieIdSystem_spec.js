import { expect } from 'chai';
import { jixieIdSubmodule, storage } from 'modules/jixieIdSystem.js';
import { server } from '../../mocks/xhr.js';
import {parseUrl} from '../../../src/utils.js';

const COOKIE_EXPIRATION_FUTURE = (new Date(Date.now() + 60 * 60 * 24 * 1000)).toUTCString();
const COOKIE_EXPIRATION_PAST = (new Date(Date.now() - 60 * 60 * 24 * 1000)).toUTCString();

describe('JixieId  Submodule', () => {
  const SERVER_HOST = 'traid.jixie.io';
  const SERVER_PATH = '/api/usersyncpbjs';
  const CLIENTID1 = '822bc904-249b-11f0-9cd2-0242ac120002';
  const CLIENTID2 = '822bc904-249b-11f0-9cd2-0242ac120003';
  const IDLOG1 = '1745845981000_abc';
  const IDLOG_VALID = `${Date.now() + 60 * 60 * 24 * 1000}_abc`;
  const IDLOG_EXPIRED = `${Date.now() - 1000}_abc`;
  const ACCOUNTID = 'abcdefg';
  const STD_JXID_KEY = '_jxx';
  const PBJS_JXID_KEY = 'pbjx_jxx';
  const PBJS_IDLOGSTR_KEY = 'pbjx_idlog';
  const MOCK_CONSENT_STRING = 'myconsentstring';
  const EID_TYPE1_PARAMNAME = 'somesha1';
  const EID_TYPE2_PARAMNAME = 'somesha2';
  const EID_TYPE1_COOKIENAME = 'somesha1cookie';
  const EID_TYPE2_LSNAME = 'somesha2ls';
  const EID_TYPE1_SAMPLEVALUE = 'pppppppppp';
  const EID_TYPE2_SAMPLEVALUE = 'eeeeeeeeee';

  it('should have the correct module name declared', () => {
    expect(jixieIdSubmodule.name).to.equal('jixieId');
  });
  describe('decode', () => {
    it('should respond with an object with clientid key containing the value', () => {
      expect(jixieIdSubmodule.decode(CLIENTID1)).to.deep.equal({
        jixieId: CLIENTID1
      });
    });
    it('should respond with undefined if the value is not a string', () => {
      [1, null, undefined, NaN, [], {}].forEach((value) => {
        expect(jixieIdSubmodule.decode(value)).to.equal(undefined);
      });
    });
  });

  describe('getId()', () => {
    describe('getId', () => {
      context('when there is jixie_o in the window object (jx script on site)', () => {
        context('when there is _jxx in the cookie', () => {
          it('should return callback with the clientid in that cookie', () => {
            window.jixie_o = {};
            storage.setCookie(STD_JXID_KEY, CLIENTID1, COOKIE_EXPIRATION_FUTURE);
            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                stdjxidckname: STD_JXID_KEY,
                pubExtIds: [
                  {pname: EID_TYPE1_PARAMNAME, ckname: EID_TYPE1_COOKIENAME},
                  {pname: EID_TYPE2_PARAMNAME, lsname: EID_TYPE2_LSNAME}
                ]
              }
            });
            callback(completeCallback);
            const [request] = server.requests;

            expect(request).to.be.undefined;
            expect(completeCallback.calledOnceWithExactly(CLIENTID1)).to.be.true;
            storage.setCookie(STD_JXID_KEY, '', COOKIE_EXPIRATION_PAST);
            window.jixie_o = undefined;
          })
        })
        context('when there is no _jxx in the cookie', () => {
          it('should return callback with null', () => {
            window.jixie_o = {};
            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                stdjxidckname: STD_JXID_KEY,
                pubExtIds: [
                  {pname: EID_TYPE1_PARAMNAME, ckname: EID_TYPE1_COOKIENAME},
                  {pname: EID_TYPE2_PARAMNAME, lsname: EID_TYPE2_LSNAME}
                ]
              }
            });
            callback(completeCallback);
            const [request] = server.requests;
            expect(request).to.be.undefined;
            expect(completeCallback.calledOnceWithExactly(null)).to.be.true;
            window.jixie_o = undefined;
          })
        })
      })

      context('when there is no jixie_o in the window object', () => {
        context('when there is no pbjs jixie cookie', () => {
          it('should call the server and set the id', () => {
            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                stdjxidckname: STD_JXID_KEY,
                pubExtIds: [
                  {pname: EID_TYPE1_PARAMNAME, ckname: EID_TYPE1_COOKIENAME},
                  {pname: EID_TYPE2_PARAMNAME, lsname: EID_TYPE2_LSNAME}
                ]
              }
            });
            callback(completeCallback);
            const [request] = server.requests;
            request.respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              data: {
                success: true,
                client_id: CLIENTID1,
                idlog: IDLOG1
              }
            }));
            expect(completeCallback.calledOnceWithExactly(CLIENTID1)).to.be.true;
          });

          it('should call the server and set the id. HERE we check all params to server in detail as more parameters since more was found in cookie', () => {
            storage.setCookie(EID_TYPE1_COOKIENAME, EID_TYPE1_SAMPLEVALUE, COOKIE_EXPIRATION_FUTURE)
            storage.setDataInLocalStorage(EID_TYPE2_LSNAME, EID_TYPE2_SAMPLEVALUE);

            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                accountid: ACCOUNTID,
                pubExtIds: [
                  {pname: EID_TYPE1_PARAMNAME, ckname: EID_TYPE1_COOKIENAME},
                  {pname: EID_TYPE2_PARAMNAME, lsname: EID_TYPE2_LSNAME}
                ]
              }
            });
            callback(completeCallback);
            const [request] = server.requests;
            request.respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              data: {
                success: true,
                client_id: CLIENTID1,
                idlog: IDLOG1
              }
            }));
            const parsed = parseUrl(request.url);
            expect(parsed.hostname).to.equal(SERVER_HOST);
            expect(parsed.pathname).to.equal(SERVER_PATH);
            expect(parsed.search[EID_TYPE1_PARAMNAME]).to.equal(EID_TYPE1_SAMPLEVALUE);
            expect(parsed.search[EID_TYPE2_PARAMNAME]).to.equal(EID_TYPE2_SAMPLEVALUE);
            expect(request.method).to.equal('GET');
            expect(request.withCredentials).to.be.true;

            expect(completeCallback.calledOnceWithExactly(CLIENTID1)).to.be.true;
            storage.setCookie(EID_TYPE1_COOKIENAME, EID_TYPE1_SAMPLEVALUE, COOKIE_EXPIRATION_PAST)
            storage.setDataInLocalStorage(EID_TYPE2_LSNAME, '');
          });

          it('should call the server and set the id and when telcocp (fire-n-forget) is given then that should be called too', () => {
            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                stdjxidckname: STD_JXID_KEY,
                pubExtIds: [
                  {pname: EID_TYPE1_PARAMNAME, ckname: EID_TYPE1_COOKIENAME},
                  {pname: EID_TYPE2_PARAMNAME, lsname: EID_TYPE2_LSNAME}
                ]
              }
            });
            callback(completeCallback);
            const [request] = server.requests;
            request.respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              data: {
                success: true,
                client_id: CLIENTID1,
                idlog: IDLOG1,
                telcoep: 'https://www.telcoep.com/xxx'
              }
            }));
            expect(server.requests.length).to.equal(2);
            expect(server.requests[1].url).to.equal('https://www.telcoep.com/xxx');
            server.requests[1].respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              data: {
                success: true
              }
            }));
          });
        });
        context('when has rather fresh pbjs jixie cookie', () => {
          it('should not call the server ; just return the id', () => {
            storage.setCookie(PBJS_JXID_KEY, CLIENTID1, COOKIE_EXPIRATION_FUTURE)
            storage.setCookie(PBJS_IDLOGSTR_KEY, IDLOG_VALID, COOKIE_EXPIRATION_FUTURE)

            const setCookieStub = sinon.stub(storage, 'setCookie');
            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                stdjxidckname: STD_JXID_KEY,
                pubExtIds: [
                  {pname: EID_TYPE1_PARAMNAME, ckname: EID_TYPE1_COOKIENAME},
                  {pname: EID_TYPE2_PARAMNAME, lsname: EID_TYPE2_LSNAME}
                ]
              }
            });
            callback(completeCallback);
            const [request] = server.requests;
            expect(setCookieStub.neverCalledWith(PBJS_JXID_KEY)).to.be.true;
            expect(completeCallback.calledOnceWithExactly(CLIENTID1)).to.be.true;
            expect(request).to.be.undefined;
            setCookieStub.restore();
            storage.setCookie(PBJS_JXID_KEY, CLIENTID1, COOKIE_EXPIRATION_PAST)
            storage.setCookie(PBJS_IDLOGSTR_KEY, IDLOG_VALID, COOKIE_EXPIRATION_PAST)
          })
        });
        context('when has rather stale pbjs jixie cookie', () => {
          it('should call the server and set the id; send available extra info (e.g. esha,psha, consent if available)', () => {
            const consentData = {gdpr: {gdprApplies: 1, consentString: MOCK_CONSENT_STRING}};
            storage.setCookie(PBJS_JXID_KEY, CLIENTID1, COOKIE_EXPIRATION_FUTURE)
            storage.setCookie(PBJS_IDLOGSTR_KEY, IDLOG_EXPIRED, COOKIE_EXPIRATION_FUTURE)
            storage.setCookie(EID_TYPE1_COOKIENAME, EID_TYPE1_SAMPLEVALUE, COOKIE_EXPIRATION_FUTURE)
            storage.setDataInLocalStorage(EID_TYPE2_LSNAME, EID_TYPE2_SAMPLEVALUE);

            const setCookieStub = sinon.stub(storage, 'setCookie');
            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                stdjxidckname: STD_JXID_KEY,
                pubExtIds: [
                  {pname: EID_TYPE1_PARAMNAME, ckname: EID_TYPE1_COOKIENAME},
                  {pname: EID_TYPE2_PARAMNAME, lsname: EID_TYPE2_LSNAME}
                ]
              }
            }, consentData);
            callback(completeCallback);

            const [request] = server.requests;
            request.respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              data: {
                success: true,
                client_id: CLIENTID2,
                idlog: IDLOG1
              },
              expires: Date.now()
            }));

            const parsed = parseUrl(request.url);
            expect(parsed.hostname).to.equal(SERVER_HOST);
            expect(parsed.pathname).to.equal(SERVER_PATH);
            expect(parsed.search.client_id).to.equal(CLIENTID1);
            expect(parsed.search.idlog).to.equal(IDLOG_EXPIRED);
            expect(parsed.search[EID_TYPE1_PARAMNAME]).to.equal(EID_TYPE1_SAMPLEVALUE);
            expect(parsed.search[EID_TYPE2_PARAMNAME]).to.equal(EID_TYPE2_SAMPLEVALUE);
            expect(parsed.search.gdpr_consent).to.equal(MOCK_CONSENT_STRING);
            expect(request.method).to.equal('GET');
            expect(request.withCredentials).to.be.true;
            expect(setCookieStub.calledWith(PBJS_JXID_KEY, CLIENTID2, sinon.match.string)).to.be.true;
            expect(setCookieStub.calledWith(PBJS_IDLOGSTR_KEY, IDLOG1, sinon.match.string)).to.be.true;
            expect(completeCallback.calledOnceWithExactly(CLIENTID2)).to.be.true;

            setCookieStub.restore();
            storage.setCookie(PBJS_JXID_KEY, CLIENTID1, COOKIE_EXPIRATION_PAST);
            storage.setCookie(PBJS_IDLOGSTR_KEY, IDLOG_EXPIRED, COOKIE_EXPIRATION_PAST);
            storage.setCookie(EID_TYPE1_COOKIENAME, EID_TYPE1_SAMPLEVALUE, COOKIE_EXPIRATION_PAST)
            storage.setDataInLocalStorage(EID_TYPE2_LSNAME, '');
          });
        });

        context('when has corrupted idlog cookie', () => {
          it('should still call the server even though thre is a pbs jixie id', () => {
            storage.setCookie(PBJS_JXID_KEY, CLIENTID1, COOKIE_EXPIRATION_FUTURE)
            storage.setCookie(PBJS_IDLOGSTR_KEY, 'junk', COOKIE_EXPIRATION_FUTURE)
            const completeCallback = sinon.spy();
            const { callback } = jixieIdSubmodule.getId({
              params: {
                accountid: ACCOUNTID
              }
            });
            callback(completeCallback);

            const [request] = server.requests;
            request.respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              data: {
                success: true,
                client_id: CLIENTID1,
                idlog: IDLOG1
              },
              expires: Date.now()
            }));
            const parsed = parseUrl(request.url);
            expect(parsed.hostname).to.equal(SERVER_HOST);
          });
        });
      });
    });
  });
});
