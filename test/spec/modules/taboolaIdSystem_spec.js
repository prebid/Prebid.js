import {expect} from 'chai';
import {server} from 'test/mocks/xhr'; // Or '../../mocks/xhr' depending on your repo structure
import sinon from 'sinon';

import {taboolaIdSubmodule, sm, decode} from 'modules/taboolaIdSystem.js';

let getCookieStub;
let setDataInLocalStorageStub;
let getDataFromLocalStorageStub;
let hasLocalStorageStub;
let localStorageIsEnabledStub;
let cookiesAreEnabledStub;

describe('TaboolaIdSystem', function () {
  beforeEach(function () {
    getCookieStub = sinon.stub(sm, 'getCookie');
    setDataInLocalStorageStub = sinon.stub(sm, 'setDataInLocalStorage');
    getDataFromLocalStorageStub = sinon.stub(sm, 'getDataFromLocalStorage');
    hasLocalStorageStub = sinon.stub(sm, 'hasLocalStorage');
    localStorageIsEnabledStub = sinon.stub(sm, 'localStorageIsEnabled');
    cookiesAreEnabledStub = sinon.stub(sm, 'cookiesAreEnabled');

    // By default, let’s assume localStorage/cookies exist
    hasLocalStorageStub.returns(true);
    localStorageIsEnabledStub.returns(true);
    cookiesAreEnabledStub.returns(true);
  });

  afterEach(function () {
    getCookieStub.restore();
    setDataInLocalStorageStub.restore();
    getDataFromLocalStorageStub.restore();
    hasLocalStorageStub.restore();
    localStorageIsEnabledStub.restore();
    cookiesAreEnabledStub.restore();
  });

  describe('decode', function () {
    it('should return an object with taboolaId if value is valid', function () {
      const decoded = taboolaIdSubmodule.decode({ taboolaId: 'abc123' });
      expect(decoded).to.deep.equal({ taboolaId: 'abc123' });
    });

    it('should return undefined if value is "0" or not a string', function () {
      expect(taboolaIdSubmodule.decode('0')).to.be.undefined;
      expect(taboolaIdSubmodule.decode(undefined)).to.be.undefined;
      expect(taboolaIdSubmodule.decode({})).to.be.undefined;
    });
  });

  describe('getId', function () {
    it('should retrieve user ID from localStorage if present', function () {
      getDataFromLocalStorageStub.returns('LS_USER_ID');

      const result = taboolaIdSubmodule.getId({});
      // The synchronous portion:
      expect(result.id).to.equal('LS_USER_ID');

      // The callback portion:
      expect(result.callback).to.be.a('function');
    });

    it('should fallback to cookie-based ID if localStorage is absent', function () {
      hasLocalStorageStub.returns(false);
      localStorageIsEnabledStub.returns(false);

      getCookieStub.returns('COOKIE_ID');

      const result = taboolaIdSubmodule.getId({});
      expect(result.id).to.equal('COOKIE_ID');
      expect(result.callback).to.be.a('function');
    });

    it('should fallback to TRC user_id if neither localStorage nor cookies have an ID', function () {
      getDataFromLocalStorageStub.returns(undefined);
      getCookieStub.returns(undefined);
      window.TRC = {user_id: 'TRC_ID'};

      const result = taboolaIdSubmodule.getId({});
      expect(result.id).to.equal('TRC_ID');
      delete window.TRC;
    });

    it('should return "undefined" if userId is "0" or not found anywhere', function () {
      getDataFromLocalStorageStub.returns('0');
      // Pretend no other sources
      const result = taboolaIdSubmodule.getId({});
      expect(result.id).to.be.undefined;
    });
  });

  describe('async callback from getId', function () {
    it('should call Taboola’s user-sync endpoint and parse the JSON user.id', function () {
      // Here, we simulate the scenario:
      // 1) getId() is called => returns { id: existingId, callback: function }
      // 2) We run the callback => triggers ajax request
      // 3) Server responds with JSON => we store user.id in localStorage

      // Assume localStorage had some old ID
      getDataFromLocalStorageStub.returns('OLD_ID');
      const result = taboolaIdSubmodule.getId({params: {
        shouldSkipSync: false
      }});
      expect(result.id).to.equal('OLD_ID');

      const callback = sinon.spy();

      result.callback(callback);

      expect(server.requests).to.have.lengthOf(1);

      // Prepare a fake server response
      const jsonResponse = JSON.stringify({
        user: {
          id: 'NEW_ID',
          isNewUser: false
        }
      });

      // Respond with 200 OK
      server.requests[0].respond(
        200,
        {'Content-Type': 'application/json'},
        jsonResponse
      );

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args[0]).to.deep.equal({taboolaId: 'NEW_ID'});

      // Also, we expect localStorage to be updated with "NEW_ID"
      expect(setDataInLocalStorageStub.calledWith('taboola global:user-id', 'NEW_ID')).to.be.true;
    });

    it('should fallback to the existing ID if the server response is invalid', function () {
      getDataFromLocalStorageStub.returns('OLD_ID');
      const result = taboolaIdSubmodule.getId({params: {
        shouldSkipSync: false
      }});
      const cb = sinon.spy();
      result.callback(cb);

      server.requests[0].respond(
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify({foo: 'bar'})
      );

      expect(cb.calledOnce).to.be.true;
      // Should fallback to the old local ID
      expect(cb.firstCall.args[0]).to.deep.equal({taboolaId: 'OLD_ID'});
      // No new ID saved
      expect(setDataInLocalStorageStub.called).to.be.false;
    });

    it('should fallback to the existing ID if the server returns 500 or network error', function () {
      getDataFromLocalStorageStub.returns('OLD_ID');
      const result = taboolaIdSubmodule.getId({params: {
        shouldSkipSync: false
      }});
      const cb = sinon.spy();
      result.callback(cb);

      // Return 500 error
      server.requests[0].respond(
        500,
        {'Content-Type': 'text/plain'},
        'Internal Server Error'
      );

      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.deep.equal({taboolaId: 'OLD_ID'});
    });

    it('should default skipSync to true if params is undefined', function () {
      getDataFromLocalStorageStub.returns('LOCAL_ID');
      const result = taboolaIdSubmodule.getId();
      const cb = sinon.spy();
      result.callback(cb);

      // Should not call server, just return existing ID
      expect(server.requests.length).to.equal(0);
      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.deep.equal({taboolaId: 'LOCAL_ID'});
    });

    it('should fallback if response is not valid JSON', function () {
      getDataFromLocalStorageStub.returns('LOCAL_ID');
      const result = taboolaIdSubmodule.getId({params: {shouldSkipSync: false}});
      const cb = sinon.spy();
      result.callback(cb);

      server.requests[0].respond(
        200,
        {'Content-Type': 'application/json'},
        'not-json'
      );

      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.deep.equal({taboolaId: 'LOCAL_ID'});
    });

    it('should return t_gid if present when main cookie is missing', function () {
      getDataFromLocalStorageStub.returns(undefined);
      getCookieStub.withArgs('trc_cookie_storage').returns(undefined);
      getCookieStub.withArgs('t_gid').returns('TID_123');

      const result = taboolaIdSubmodule.getId({});
      expect(result.id).to.equal('TID_123');
    });
  });

  describe('eids field', function () {
    it('should specify source=taboola.com and atype=1 for taboolaId', function () {
      const eidsConfig = taboolaIdSubmodule.eids.taboolaId;
      expect(eidsConfig).to.deep.equal({
        source: 'taboola.com',
        atype: 1
      });
    });
  });

  describe('userData cookie parsing', function() {
    it('should read "user-id" from multi-key cookie', function() {
      // e.g. "user-id=ABC123&foo=bar"
      getCookieStub.returns('user-id=ABC123&foo=bar');
      const result = taboolaIdSubmodule.getId({});
      expect(result.id).to.equal('ABC123');
    });

    it('should skip cookie if cookiesAreEnabled is false', function() {
      cookiesAreEnabledStub.returns(false);
      getCookieStub.returns('user-id=XYZ');
      const result = taboolaIdSubmodule.getId({});
      expect(result.id).to.be.undefined;
    });

    it('should handle no cookie data at all', function() {
      getCookieStub.returns(undefined);
      const result = taboolaIdSubmodule.getId({});
      expect(result.id).to.be.undefined;
    });
  });

  describe('handle response edge cases', function() {
    it('should do nothing if no existing ID and server returns invalid JSON (missing user.id)', function() {
      getDataFromLocalStorageStub.returns(undefined);
      const result = taboolaIdSubmodule.getId({params: {
        shouldSkipSync: false
      }});
      expect(result.id).to.be.undefined;

      const cb = sinon.spy();
      result.callback(cb);

      // 200 OK with no valid user data
      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ foo: 'bar' })
      );
      expect(cb.calledOnce).to.be.true;
      // Callback should receive undefined (no fallback ID)
      expect(cb.firstCall.args[0]).to.be.undefined;
      expect(setDataInLocalStorageStub.called).to.be.false;
    });

    it('should skip both read and write when local storage is disabled', function() {
      // Pretend local storage is present physically, but "disabled" for usage
      hasLocalStorageStub.returns(true);
      localStorageIsEnabledStub.returns(false);

      getDataFromLocalStorageStub.returns('WOULD_BE_IGNORED');

      // No cookies, no TRC
      getCookieStub.returns(undefined);

      const result = taboolaIdSubmodule.getId({params: {
        shouldSkipSync: false
      }});

      expect(result.id).to.be.undefined;
      expect(getDataFromLocalStorageStub.called).to.be.false;

      // trigger the user sync callback
      const cb = sinon.spy();
      result.callback(cb);

      // Simulate a server response with a new ID
      const jsonResponse = JSON.stringify({ user: { id: 'ANY_NEW_ID' } });
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, jsonResponse);

      // The callback still returns the new ID
      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.deep.equal({ taboolaId: 'ANY_NEW_ID' });

      // But we do not save it to local storage
      expect(setDataInLocalStorageStub.called).to.be.false;
    });

    it('should pick an ID from cookie or TRC if local storage is disabled', function() {
      hasLocalStorageStub.returns(true);
      localStorageIsEnabledStub.returns(false);
      getCookieStub.returns('COOKIE_ID');

      const result = taboolaIdSubmodule.getId({params: {
        shouldSkipSync: false
      }});
      expect(result.id).to.equal('COOKIE_ID');
      expect(getDataFromLocalStorageStub.called).to.be.false;

      const cb = sinon.spy();
      result.callback(cb);

      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify({ user: { id: 'NEW_ID' } })
      );

      // The callback returns the new ID from the server
      expect(cb.calledOnce).to.be.true;
      expect(cb.firstCall.args[0]).to.deep.equal({ taboolaId: 'NEW_ID' });
      // Still no local storage writes
      expect(setDataInLocalStorageStub.called).to.be.false;
    });

    it('should ignore empty string from the server as a new ID', function() {
      getDataFromLocalStorageStub.returns('OLD_ID');
      const result = taboolaIdSubmodule.getId({params: {
        shouldSkipSync: false
      }});
      expect(result.id).to.equal('OLD_ID');

      const cb = sinon.spy();
      result.callback(cb);

      const jsonResponse = JSON.stringify({ user: { id: '' } });
      server.requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        jsonResponse
      );

      expect(cb.calledOnce).to.be.true;
      // Falls back to the old ID
      expect(cb.firstCall.args[0]).to.deep.equal({ taboolaId: 'OLD_ID' });
      expect(setDataInLocalStorageStub.called).to.be.false;
    });
  });
});
