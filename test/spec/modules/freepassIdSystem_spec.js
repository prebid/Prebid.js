import { freepassIdSubmodule, storage, FREEPASS_COOKIE_KEY } from 'modules/freepassIdSystem';
import sinon from 'sinon';
import * as utils from '../../../src/utils';

let expect = require('chai').expect;

describe('FreePass ID System', function () {
  const UUID = '15fde1dc-1861-4894-afdf-b757272f3568';
  let getCookieStub;

  before(function () {
    sinon.stub(utils, 'logMessage');
    getCookieStub = sinon.stub(storage, 'getCookie');
  });

  after(function () {
    utils.logMessage.restore();
    getCookieStub.restore();
  });

  describe('freepassIdSubmodule', function () {
    it('should expose submodule name', function () {
      expect(freepassIdSubmodule.name).to.equal('freepassId');
    });
  });

  describe('getId', function () {
    const config = {
      storage: {
        name: '_freepassId',
        type: 'cookie',
        expires: 30
      },
      params: {
        freepassData: {
          commonId: 'commonId',
          userIp: '127.0.0.1'
        }
      }
    };

    it('should return an IdObject with a UUID', function () {
      getCookieStub.withArgs(FREEPASS_COOKIE_KEY).returns(UUID);
      const objectId = freepassIdSubmodule.getId(config, undefined);
      expect(objectId).to.be.an('object');
      expect(objectId.id).to.be.an('object');
      expect(objectId.id.userId).to.equal(UUID);
    });

    it('should return an IdObject without UUID when absent in cookie', function () {
      getCookieStub.withArgs(FREEPASS_COOKIE_KEY).returns(null);
      const objectId = freepassIdSubmodule.getId(config, undefined);
      expect(objectId).to.be.an('object');
      expect(objectId.id).to.be.an('object');
      expect(objectId.id.userId).to.be.undefined;
    });
  });

  describe('decode', function () {
    it('should have module name as property', function () {
      const decodedId = freepassIdSubmodule.decode({}, {});
      expect(decodedId).to.be.an('object');
      expect(decodedId).to.have.property('freepassId');
    });
    it('should have IObject as property value', function () {
      const idObject = {
        commonId: 'commonId',
        userIp: '127.0.0.1',
        userId: UUID
      };
      const decodedId = freepassIdSubmodule.decode(idObject, {});
      expect(decodedId).to.be.an('object');
      expect(decodedId.freepassId).to.be.an('object');
      expect(decodedId.freepassId).to.equal(idObject);
    });
  });

  describe('extendId', function () {
    const config = {
      storage: {
        name: '_freepassId',
        type: 'cookie',
        expires: 30
      },
      params: {
        freepassData: {
          commonId: 'commonId',
          userIp: '127.0.0.1'
        }
      }
    };

    it('should return cachedIdObject if there are no changes', function () {
      getCookieStub.withArgs(FREEPASS_COOKIE_KEY).returns(UUID);
      const idObject = freepassIdSubmodule.getId(config, undefined);
      const cachedIdObject = Object.assign({}, idObject.id);
      const extendedIdObject = freepassIdSubmodule.extendId(config, undefined, cachedIdObject);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.userId).to.equal(UUID);
      expect(extendedIdObject.id.userIp).to.equal(config.params.freepassData.userIp);
      expect(extendedIdObject.id.commonId).to.equal(config.params.freepassData.commonId);
    });

    it('should return cachedIdObject if there are no new data', function () {
      const idObject = freepassIdSubmodule.getId(config, undefined);
      const cachedIdObject = Object.assign({}, idObject.id);
      const localConfig = JSON.parse(JSON.stringify(config));
      delete localConfig.params.freepassData;
      const extendedIdObject = freepassIdSubmodule.extendId(localConfig, undefined, cachedIdObject);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id).to.equal(cachedIdObject);
    });

    it('should return new commonId if there are changes', function () {
      const idObject = freepassIdSubmodule.getId(config, undefined);
      const cachedIdObject = Object.assign({}, idObject.id);
      const localConfig = JSON.parse(JSON.stringify(config));
      localConfig.params.freepassData.commonId = 'newCommonId';
      const extendedIdObject = freepassIdSubmodule.extendId(localConfig, undefined, cachedIdObject);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.commonId).to.equal('newCommonId');
    });

    it('should return new userIp if there are changes', function () {
      const idObject = freepassIdSubmodule.getId(config, undefined);
      const cachedIdObject = Object.assign({}, idObject.id);
      const localConfig = JSON.parse(JSON.stringify(config));
      localConfig.params.freepassData.userIp = '192.168.1.1';
      const extendedIdObject = freepassIdSubmodule.extendId(localConfig, undefined, cachedIdObject);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.userIp).to.equal('192.168.1.1');
    });

    it('should return new userId when changed from cache', function () {
      getCookieStub.withArgs(FREEPASS_COOKIE_KEY).returns(UUID);
      const idObject = freepassIdSubmodule.getId(config, undefined);
      const cachedIdObject = Object.assign({}, idObject.id);
      const localConfig = JSON.parse(JSON.stringify(config));
      localConfig.params.freepassData.userIp = '192.168.1.1';

      getCookieStub.withArgs(FREEPASS_COOKIE_KEY).returns('NEW_UUID');
      const extendedIdObject = freepassIdSubmodule.extendId(localConfig, undefined, cachedIdObject);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.userIp).to.equal('192.168.1.1');
      expect(extendedIdObject.id.userId).to.equal('NEW_UUID');
    });
  });
});
