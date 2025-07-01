import { freepassIdSubmodule } from 'modules/freepassIdSystem';
import sinon from 'sinon';
import * as utils from '../../../src/utils';

let expect = require('chai').expect;

describe('FreePass ID System', function () {
  const UUID = '15fde1dc-1861-4894-afdf-b757272f3568';
  let generateUUIDStub;

  before(function () {
    sinon.stub(utils, 'logMessage');
    generateUUIDStub = sinon.stub(utils, 'generateUUID').returns(UUID);
  });

  after(function () {
    utils.logMessage.restore();
    generateUUIDStub.restore();
  });

  describe('freepassIdSubmodule', function () {
    it('should expose submodule name', function () {
      expect(freepassIdSubmodule.name).to.equal('freepassId');
    });

    it('should have eids configuration', function () {
      expect(freepassIdSubmodule.eids).to.be.an('object');
      expect(freepassIdSubmodule.eids.freepassId).to.be.an('object');
      expect(freepassIdSubmodule.eids.freepassId.source).to.equal('freepass.jp');
      expect(freepassIdSubmodule.eids.freepassId.atype).to.equal(1);
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

    it('should return an IdObject with generated UUID and freepass data', function () {
      const objectId = freepassIdSubmodule.getId(config, undefined);
      expect(objectId).to.be.an('object');
      expect(objectId.id).to.be.an('object');
      expect(objectId.id.userId).to.equal(UUID);
      expect(objectId.id.freepassId).to.equal('commonId');
      expect(objectId.id.ip).to.equal('127.0.0.1');
    });

    it('should return an IdObject with only generated UUID when no freepass data', function () {
      const configWithoutData = {
        storage: {
          name: '_freepassId',
          type: 'cookie',
          expires: 30
        }
      };
      const objectId = freepassIdSubmodule.getId(configWithoutData, undefined);
      expect(objectId).to.be.an('object');
      expect(objectId.id).to.be.an('object');
      expect(objectId.id.userId).to.equal(UUID);
      expect(objectId.id.freepassId).to.be.undefined;
      expect(objectId.id.ip).to.be.undefined;
    });

    it('should use stored userId when available', function () {
      const storedId = { userId: 'stored-uuid-123', ip: '192.168.1.1' };
      const objectId = freepassIdSubmodule.getId(config, undefined, storedId);
      expect(objectId).to.be.an('object');
      expect(objectId.id).to.be.an('object');
      expect(objectId.id.userId).to.equal('stored-uuid-123');
      expect(objectId.id.freepassId).to.equal('commonId');
      expect(objectId.id.ip).to.equal('127.0.0.1');
    });
  });

  describe('decode', function () {
    it('should have module name as property', function () {
      const decodedId = freepassIdSubmodule.decode({}, {});
      expect(decodedId).to.be.an('object');
      expect(decodedId).to.have.property('freepassId');
    });

    it('should return the value as-is without stringifying', function () {
      const idObject = {
        freepassId: 'commonId',
        ip: '127.0.0.1',
        userId: UUID
      };
      const decodedId = freepassIdSubmodule.decode(idObject, {});
      expect(decodedId).to.be.an('object');
      expect(decodedId.freepassId).to.equal(idObject);
      expect(decodedId.freepassId).to.not.be.a('string');
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

    it('should extend stored ID with new freepass data', function () {
      const storedId = { userId: 'stored-uuid-123' };
      const extendedIdObject = freepassIdSubmodule.extendId(config, undefined, storedId);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.userId).to.equal('stored-uuid-123');
      expect(extendedIdObject.id.ip).to.equal('127.0.0.1');
      expect(extendedIdObject.id.freepassId).to.equal('commonId');
    });

    it('should return stored ID if no freepass data provided', function () {
      const storedId = { userId: 'stored-uuid-123', freepassId: 'oldId' };
      const configWithoutData = {
        storage: {
          name: '_freepassId',
          type: 'cookie',
          expires: 30
        }
      };
      const extendedIdObject = freepassIdSubmodule.extendId(configWithoutData, undefined, storedId);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.equal(storedId);
    });

    it('should generate new UUID if no stored userId', function () {
      const storedId = { freepassId: 'oldId' };
      const extendedIdObject = freepassIdSubmodule.extendId(config, undefined, storedId);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.userId).to.equal(UUID);
      expect(extendedIdObject.id.freepassId).to.equal('commonId');
    });

    it('should update freepassId when changed', function () {
      const storedId = { userId: 'stored-uuid-123', freepassId: 'oldId' };
      const localConfig = JSON.parse(JSON.stringify(config));
      localConfig.params.freepassData.commonId = 'newCommonId';
      const extendedIdObject = freepassIdSubmodule.extendId(localConfig, undefined, storedId);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.freepassId).to.equal('newCommonId');
      expect(extendedIdObject.id.userId).to.equal('stored-uuid-123');
    });

    it('should update userIp when changed', function () {
      const storedId = { userId: 'stored-uuid-123', ip: '127.0.0.1' };
      const localConfig = JSON.parse(JSON.stringify(config));
      localConfig.params.freepassData.userIp = '192.168.1.1';
      const extendedIdObject = freepassIdSubmodule.extendId(localConfig, undefined, storedId);
      expect(extendedIdObject).to.be.an('object');
      expect(extendedIdObject.id).to.be.an('object');
      expect(extendedIdObject.id.ip).to.equal('192.168.1.1');
      expect(extendedIdObject.id.userId).to.equal('stored-uuid-123');
    });
  });

  describe('EID configuration', function () {
    const eidConfig = freepassIdSubmodule.eids.freepassId;

    it('should have correct source and atype', function () {
      expect(eidConfig.source).to.equal('freepass.jp');
      expect(eidConfig.atype).to.equal(1);
    });

    describe('getValue', function () {
      it('should return freepassId when available', function () {
        const data = { userId: 'user123', freepassId: 'freepass456' };
        const value = eidConfig.getValue(data);
        expect(value).to.equal('freepass456');
      });
    });

    describe('getUidExt', function () {
      it('should return extension with ip when available', function () {
        const data = { userId: 'user123', ip: '127.0.0.1' };
        const ext = eidConfig.getUidExt(data);
        expect(ext).to.be.an('object');
        expect(ext.ip).to.equal('127.0.0.1');
      });

      it('should return extension with userId when both freepassId and userId available', function () {
        const data = { userId: 'user123', freepassId: 'freepass456', ip: '127.0.0.1' };
        const ext = eidConfig.getUidExt(data);
        expect(ext).to.be.an('object');
        expect(ext.ip).to.equal('127.0.0.1');
        expect(ext.userId).to.equal('user123');
      });

      it('should return undefined when no extensions available', function () {
        const data = { userId: 'user123' };
        const ext = eidConfig.getUidExt(data);
        expect(ext).to.be.undefined;
      });

      it('should not include userId in extension when no freepassId', function () {
        const data = { userId: 'user123', ip: '127.0.0.1' };
        const ext = eidConfig.getUidExt(data);
        expect(ext).to.be.an('object');
        expect(ext.ip).to.equal('127.0.0.1');
        expect(ext.userId).to.be.undefined;
      });
    });
  });
});
