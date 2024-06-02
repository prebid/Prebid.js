import { expect } from 'chai';
import { deepintentDpesSubmodule } from 'modules/deepintentDpesIdSystem.js';

const DI_COOKIE_OBJECT = {id: '2cf40748c4f7f60d343336e08f80dc99'};
const DI_UPDATED_STORAGE = '2cf40748c4f7f60d343336e08f80dc99';

const cookieConfig = {
  name: 'deepintentId',
  storage: {
    type: 'cookie',
    name: '_dpes_id',
    expires: 28
  }
};

const html5Config = {
  name: 'deepintentId',
  storage: {
    type: 'html5',
    name: '_dpes_id',
    expires: 28
  }
}

describe('Deepintent DPES System', () => {
  describe('Deepintent Dpes Sytsem: test "getId" method', () => {
    it('If nothing is found in cache, return undefined', () => {
      let diId = deepintentDpesSubmodule.getId({}, undefined, undefined);
      expect(diId).to.be.eq(undefined);
    });

    it('Get value stored in cookie for getId', () => {
      let diId = deepintentDpesSubmodule.getId(cookieConfig, undefined, DI_COOKIE_OBJECT);
      expect(diId).to.deep.equal(DI_COOKIE_OBJECT);
    });

    it('provides the stored deepintentId if cookie is absent but present in local storage', () => {
      let idx = deepintentDpesSubmodule.getId(html5Config, undefined, DI_UPDATED_STORAGE);
      expect(idx).to.be.eq(DI_UPDATED_STORAGE);
    });
  });

  describe('Deepintent Dpes System : test "decode" method', () => {
    it('Get the correct decoded value for dpes id, if an object is set return object', () => {
      expect(deepintentDpesSubmodule.decode(DI_COOKIE_OBJECT, cookieConfig)).to.deep.equal({'deepintentId': DI_COOKIE_OBJECT});
    });

    it('Get the correct decoded value for dpes id, if a string is set return string', () => {
      expect(deepintentDpesSubmodule.decode(DI_UPDATED_STORAGE, {})).to.deep.equal({'deepintentId': DI_UPDATED_STORAGE});
    });
  });

  describe('Deepintent Dpes System : test "getValue" method in eids', () => {
    it('Get the correct string value for dpes id, if an object is set in local storage', () => {
      expect(deepintentDpesSubmodule.eids.deepintentId.getValue(DI_COOKIE_OBJECT)).to.be.equal(DI_UPDATED_STORAGE);
    });

    it('Get the correct string value for dpes id, if a string is set in local storage', () => {
      expect(deepintentDpesSubmodule.eids.deepintentId.getValue(DI_UPDATED_STORAGE)).to.be.eq(DI_UPDATED_STORAGE);
    });
  });
});
