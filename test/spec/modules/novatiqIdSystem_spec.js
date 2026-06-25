import { novatiqIdSubmodule, novatiqStorage } from 'modules/novatiqIdSystem.js';
import { server } from 'test/mocks/xhr.js';

describe('novatiqIdSystem', function () {
  const urlParams = {
    novatiqId: 'snowflake',
    useStandardUuid: false,
    useSspId: true,
    useSspHost: true
  };

  describe('getSrcId', function() {
    it('getSrcId should set srcId value to 000 due to undefined parameter in config section', function() {
      const config = { params: { } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set srcId value to 000 due to missing value in config section', function() {
      const config = { params: { sourceid: '' } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set value to 000 due to null value in config section', function() {
      const config = { params: { sourceid: null } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('000');
    });

    it('getSrcId should set value to 001 due to wrong length in config section max 3 chars', function() {
      const config = { params: { sourceid: '1234' } };
      const configParams = config.params || {};
      const response = novatiqIdSubmodule.getSrcId(configParams, urlParams);
      expect(response).to.eq('001');
    });
  });

  describe('getId', function() {
    it('should log message if novatiqId has wrong format', function() {
      const config = { params: { sourceid: '123' } };
      const response = novatiqIdSubmodule.getId(config);
      expect(response.id).to.have.length(40);
    });

    it('should log message if novatiqId not provided', function() {
      const config = { params: { sourceid: '123' } };
      const response = novatiqIdSubmodule.getId(config);
      expect(response.id).should.be.not.empty;
    });

    it('should set sharedStatus if sharedID is configured but returned null', function() {
      const config = { params: { sourceid: '123', useSharedId: true } };
      const response = novatiqIdSubmodule.getId(config);
      expect(response.sharedStatus).to.equal('Not Found');
    });

    it('should set sharedStatus if sharedID is configured and is valid', function() {
      const config = { params: { sourceid: '123', useSharedId: true } };

      const stub = sinon.stub(novatiqIdSubmodule, 'getSharedId').returns('fakeId');

      const response = novatiqIdSubmodule.getId(config);

      stub.restore();

      expect(response.sharedStatus).to.equal('Found');
    });

    it('should set sharedStatus if sharedID is configured and is valid when making an async call', function() {
      const config = { params: { sourceid: '123', useSharedId: true, useCallbacks: true } };

      const stub = sinon.stub(novatiqIdSubmodule, 'getSharedId').returns('fakeId');

      const response = novatiqIdSubmodule.getId(config);

      stub.restore();

      expect(response.sharedStatus).to.equal('Found');
    });
  });

  describe('getUrlParams', function() {
    it('should return default url parameters when none set', function() {
      const defaultUrlParams = {
        novatiqId: 'snowflake',
        useStandardUuid: false,
        useSspId: true,
        useSspHost: true
      };

      const config = { params: { sourceid: '123' } };
      const response = novatiqIdSubmodule.getUrlParams(config);

      expect(response).to.deep.equal(defaultUrlParams);
    });

    it('should return custom url parameters when set', function() {
      const customUrlParams = {
        novatiqId: 'hyperid',
        useStandardUuid: true,
        useSspId: false,
        useSspHost: false
      };

      const config = {
        sourceid: '123',
        urlParams: {
          novatiqId: 'hyperid',
          useStandardUuid: true,
          useSspId: false,
          useSspHost: false
        }
      };
      const response = novatiqIdSubmodule.getUrlParams(config);

      expect(response).to.deep.equal(customUrlParams);
    });
  });

  describe('sendAsyncSyncRequest', function() {
    it('should return an async function when called asynchronously', function() {
      const defaultUrlParams = {
        novatiqId: 'snowflake',
        useStandardUuid: false,
        useSspId: true,
        useSspHost: true
      };

      const sync = novatiqIdSubmodule.getSyncUrl(false, '', defaultUrlParams);
      const response = novatiqIdSubmodule.sendAsyncSyncRequest('testuuid', sync.url);
      expect(response.callback).should.not.be.empty;
    });

    it('persists nvq_hid only after async sync accepts the id (200)', function (done) {
      const persistStub = sinon.stub(novatiqIdSubmodule, 'persistEphemeralHyperId');
      const config = { params: { sourceid: '123', useCallbacks: true } };
      const response = novatiqIdSubmodule.getId(config);

      expect(persistStub.called).to.equal(false);
      response.callback(function (idObj) {
        expect(idObj.id).to.have.length(40);
        expect(persistStub.calledOnce).to.equal(true);
        expect(persistStub.firstCall.args[0]).to.equal(idObj.id);
        persistStub.restore();
        done();
      });
      server.requests[0].respond(200);
    });

    it('does not persist nvq_hid when async sync does not accept the id', function (done) {
      const persistStub = sinon.stub(novatiqIdSubmodule, 'persistEphemeralHyperId');
      const config = { params: { sourceid: '123', useCallbacks: true } };
      const response = novatiqIdSubmodule.getId(config);

      response.callback(function (idObj) {
        expect(idObj.id).to.be.undefined;
        expect(persistStub.called).to.equal(false);
        persistStub.restore();
        done();
      });
      server.requests[0].respond(201);
    });
  });

  describe('persistEphemeralHyperId', function () {
    it('stores nvq_hid as cookie with ~60s expiry when cookies are enabled', function () {
      const cookiesEnabled = sinon.stub(novatiqStorage, 'cookiesAreEnabled').returns(true);
      const hasLocalStorage = sinon.stub(novatiqStorage, 'hasLocalStorage').returns(true);
      const removeLs = sinon.stub(novatiqStorage, 'removeDataFromLocalStorage');
      const setCookie = sinon.stub(novatiqStorage, 'setCookie');
      novatiqIdSubmodule.persistEphemeralHyperId('test-hyper-id');
      expect(removeLs.calledWith('nvq_hid')).to.equal(true);
      expect(setCookie.firstCall.args[0]).to.equal('nvq_hid');
      expect(setCookie.firstCall.args[1]).to.equal('test-hyper-id');
      expect(setCookie.firstCall.args[3]).to.equal('Lax');
      const expMs = new Date(setCookie.firstCall.args[2]).getTime();
      expect(expMs).to.be.closeTo(Date.now() + 60000, 3000);
      cookiesEnabled.restore();
      hasLocalStorage.restore();
      removeLs.restore();
      setCookie.restore();
    });

    it('stores nvq_hid in localStorage when cookies are not enabled', function () {
      const cookiesEnabled = sinon.stub(novatiqStorage, 'cookiesAreEnabled').returns(false);
      const hasLocalStorage = sinon.stub(novatiqStorage, 'hasLocalStorage').returns(true);
      const setLs = sinon.stub(novatiqStorage, 'setDataInLocalStorage');
      novatiqIdSubmodule.persistEphemeralHyperId('hid-local');
      expect(setLs.firstCall.args[0]).to.equal('nvq_hid');
      const payload = JSON.parse(setLs.firstCall.args[1]);
      expect(payload.hyperId).to.equal('hid-local');
      expect(payload.expiresAt).to.be.closeTo(Date.now() + 60000, 3000);
      cookiesEnabled.restore();
      hasLocalStorage.restore();
      setLs.restore();
    });
  });

  describe('getId nvq_hid', function () {
    it('persists ephemeral hyper id when simple sync runs', function () {
      const stub = sinon.stub(novatiqIdSubmodule, 'persistEphemeralHyperId');
      const config = { params: { sourceid: '123' } };
      novatiqIdSubmodule.getId(config);
      expect(stub.calledOnce).to.equal(true);
      expect(stub.firstCall.args[0]).to.have.length(40);
      stub.restore();
    });
  });

  describe('decode', function() {
    it('should return the same novatiqId as passed in if not async', function() {
      const novatiqId = '81b001ec-8914-488c-a96e-8c220d4ee08895ef';
      const response = novatiqIdSubmodule.decode(novatiqId);
      expect(response.novatiq.snowflake).to.have.length(40);
    });

    it('should change the result format if async', function() {
      const novatiqId = {};
      novatiqId.id = '81b001ec-8914-488c-a96e-8c220d4ee08895ef';
      novatiqId.syncResponse = 2;
      const response = novatiqIdSubmodule.decode(novatiqId);
      expect(response.novatiq.ext.syncResponse).should.be.not.empty;
      expect(response.novatiq.snowflake.id).should.be.not.empty;
      expect(response.novatiq.snowflake.syncResponse).should.be.not.empty;
    });

    it('should remove syncResponse if removeAdditionalInfo true', function() {
      const novatiqId = {};
      novatiqId.id = '81b001ec-8914-488c-a96e-8c220d4ee08895ef';
      novatiqId.syncResponse = 2;
      var config = { params: { removeAdditionalInfo: true } };
      const response = novatiqIdSubmodule.decode(novatiqId, config);
      expect(response.novatiq.ext.syncResponse).should.be.not.empty;
      expect(response.novatiq.snowflake.id).should.be.not.empty;
      should.equal(response.novatiq.snowflake.syncResponse, undefined);
    });
  });
});
