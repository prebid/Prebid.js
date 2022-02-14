import { ftrackIdSubmodule } from 'modules/ftrackIdSystem.js';
import * as utils from 'src/utils.js';
import { uspDataHandler } from 'src/adapterManager.js';
let expect = require('chai').expect;

let server;

let configMock = {
  name: 'ftrack',
  storage: {
    name: 'ftrackId',
    type: 'html5',
    expires: 90,
    refreshInSeconds: 8 * 3600
  },
  debug: true
};

let consentDataMock = {
  gdprApplies: 0,
  consentString: '<CONSENT_STRING>'
};

describe('FTRACK ID System', () => {
  describe(`Global Module Rules`, () => {
    it(`should not use the "PREBID_GLOBAL" variable nor otherwise obtain a pointer to the global PBJS object`, () => {
      expect((/PREBID_GLOBAL/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
    });
  });

  describe('Publisher config:', () => {
    let logWarnStub;
    let logErrorStub;
    beforeEach(() => {
      logWarnStub = sinon.stub(utils, 'logWarn');
      logErrorStub = sinon.stub(utils, 'logError');
    });
    afterEach(() => {
      logWarnStub.restore();
      logErrorStub.restore();
    });

    it(`should be rejected if 'storage' property is missing`, () => {
      expect(ftrackIdSubmodule.getId({name: 'ftrack'})).to.be.undefined;
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - storage required to be set`);
    });

    it(`should be rejected if 'storage.type' property is missing`, () => {
      expect(ftrackIdSubmodule.getId({
        name: 'ftrack',
        storage: {
          type: 'html5',
          expires: 90,
          refreshInSeconds: 8 * 3600
        }
      }, null, null)).to.be.undefined;
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - storage required to be set`);
    });

    it(`should be rejected if 'storage.name' property is missing`, () => {
      expect(ftrackIdSubmodule.getId({
        name: 'ftrack',
        storage: {
          name: 'ftrackId',
          expires: 90,
          refreshInSeconds: 8 * 3600
        }
      }, null, null)).to.be.undefined;
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - storage required to be set`);
    });

    it(`should be rejected if 'storage.name' is not 'ftrackId'`, () => {
      expect(ftrackIdSubmodule.getId({
        name: 'ftrack',
        storage: {
          name: 'lorem ipsum',
          type: 'html5',
          expires: 90,
          refreshInSeconds: 8 * 3600
        }
      }, null, null).callback()).to.equal(undefined);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - storage name recommended to be 'ftrackId'.`);
    });

    it(`should be rejected if 'storage.type' is not 'html5'`, () => {
      expect(ftrackIdSubmodule.getId({
        name: 'ftrack',
        storage: {
          name: 'ftrackId',
          type: 'cookies',
          expires: 90,
          refreshInSeconds: 8 * 3600
        }
      }, null, null).callback()).to.equal(undefined);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - storage type recommended to be 'html5'.`);
    });
  });

  describe('getId() method', () => {
    it(`should be using the StorageManager to set cookies or localstorage, as opposed to doing it directly`, () => {
      expect((/localStorage/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
      expect((/cookie/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
    });

    describe(`endpoint tests - `, () => {
      let cacheUrlRegExp = /https:\/\/e\.flashtalking\.com\/cache/;
      beforeEach(() => {
        server = sinon.createFakeServer();
      });

      afterEach(() => {
        server.restore();
      });

      it(`should request the cacheId from the '/cache' endpoint`, () => {
        ftrackIdSubmodule.getId(configMock, null, null).callback();
        expect((cacheUrlRegExp).test(server.requests[0].url)).to.be.ok;
      });

      it(`should be the only method that gets a new ID aka hits the D9 endpoint`, () => {
        ftrackIdSubmodule.getId(configMock, null, null).callback();
        expect(server.requests).to.have.length(1);
        server.resetHistory();

        ftrackIdSubmodule.decode('value', configMock);
        expect(server.requests).to.have.length(0);
        server.resetHistory();

        ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}});
        expect(server.requests).to.have.length(0);
      });

      it(`should populate localstorage (end-to-end test)`, () => {
        let lgcResponseMock = {
          'DeviceID': ['<DEVICE_ID>'],
          'SingleDeviceID': ['<SINGLE_DEVICE_ID>']
        };
        ftrackIdSubmodule.getId(configMock, consentDataMock, null).callback();
        expect((cacheUrlRegExp).test(server.requests[0].url)).to.be.ok;
        server.requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"cache_id":"<CACHE ID>"}');
        expect((/lgc/).test(server.requests[1].url)).to.be.ok;
        server.requests[1].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(lgcResponseMock));

        expect(localStorage.getItem('ftrackId')).to.equal(JSON.stringify(lgcResponseMock));
        expect(localStorage.getItem('ftrackId_exp')).to.be.ok;
        expect(localStorage.getItem('ftrackId_privacy')).to.equal(JSON.stringify({'gdpr': {'applies': 0, 'consentString': '<CONSENT_STRING>', 'pd': null}, 'usPrivacy': {'value': null}}));
        expect(localStorage.getItem('ftrackId_privacy_exp')).to.be.ok;
      });
    });

    describe(`consent options - `, () => {
      let uspDataHandlerStub;
      beforeEach(() => {
        uspDataHandlerStub = sinon.stub(uspDataHandler, 'getConsentData');
      });

      afterEach(() => {
        uspDataHandlerStub.restore();
      });

      describe(`getId() should return undefined`, () => {
        it(`GDPR: if gdprApplies is truthy`, () => {
          expect(ftrackIdSubmodule.getId(configMock, {gdprApplies: 1}, null)).to.not.be.ok;
          expect(ftrackIdSubmodule.getId(configMock, {gdprApplies: true}, null)).to.not.be.ok;
        });

        it(`US_PRIVACY version 1: if 'Opt Out Sale' is 'Y'`, () => {
          uspDataHandlerStub.returns('1YYY');
          expect(ftrackIdSubmodule.getId(configMock, {}, null)).to.not.be.ok;
        });
      });

      describe(`getId() should run`, () => {
        it(`GDPR: if gdprApplies is undefined, false or 0`, () => {
          expect(ftrackIdSubmodule.getId(configMock, {gdprApplies: 0}, null)).to.be.ok;
          expect(ftrackIdSubmodule.getId(configMock, {gdprApplies: false}, null)).to.be.ok;
          expect(ftrackIdSubmodule.getId(configMock, {gdprApplies: null}, null)).to.be.ok;
          expect(ftrackIdSubmodule.getId(configMock, {}, null)).to.be.ok;
        });

        it(`US_PRIVACY version 1: if 'Opt Out Sale' is not 'Y' ('N','-')`, () => {
          uspDataHandlerStub.returns('1NNN');
          expect(ftrackIdSubmodule.getId(configMock, null, null)).to.be.ok;

          uspDataHandlerStub.returns('1---');
          expect(ftrackIdSubmodule.getId(configMock, null, null)).to.be.ok;
        });
      });
    });
  });

  describe(`decode() method`, () => {
    it(`should respond with an object with the key 'ftrackId'`, () => {
      expect(ftrackIdSubmodule.decode('value', configMock)).to.deep.equal({ftrackId: 'value'});
    });

    it(`should not be making requests to retrieve a new ID, it should just be decoding a response`, () => {
      server = sinon.createFakeServer();
      ftrackIdSubmodule.decode('value', configMock);

      expect(server.requests).to.have.length(0);

      server.restore();
    })
  });

  describe(`extendId() method`, () => {
    it(`should not be making requests to retrieve a new ID, it should just be adding additional data to the id object`, () => {
      server = sinon.createFakeServer();
      ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}});

      expect(server.requests).to.have.length(0);

      server.restore();
    });

    it(`should return cacheIdObj`, () => {
      expect(ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}})).to.deep.equal({cache: {id: ''}});
    });
  });
});
