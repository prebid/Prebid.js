import {czechAdIdSubmodule, storage} from 'modules/czechAdIdSystem.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

describe('czechAdId module', function () {
  let getCookieStub;

  beforeEach(function (done) {
    getCookieStub = sinon.stub(storage, 'getCookie');
    done();
  });

  afterEach(function () {
    getCookieStub.restore();
  });

  const cookieTestCasesForEmpty = [undefined, null, ''];

  describe('getId()', function () {
    it('should return the uid when it exists in cookie', function () {
      getCookieStub.withArgs('czaid').returns('czechAdIdTest');
      const id = czechAdIdSubmodule.getId();
      expect(id).to.be.deep.equal({id: 'czechAdIdTest'});
    });

    cookieTestCasesForEmpty.forEach(testCase => it('should not return the uid when it doesnt exist in cookie', function () {
      getCookieStub.withArgs('czaid').returns(testCase);
      const id = czechAdIdSubmodule.getId();
      expect(id).to.be.undefined;
    }));
  });

  describe('decode()', function () {
    it('should return the uid when it exists in cookie', function () {
      getCookieStub.withArgs('czaid').returns('czechAdIdTest');
      const decoded = czechAdIdSubmodule.decode();
      expect(decoded).to.be.deep.equal({czechAdId: 'czechAdIdTest'});
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(czechAdIdSubmodule);
    });

    it('czechAdId', () => {
      const id = 'some-random-id-value';
      const userId = {czechAdId: id};
      const [eid] = createEidsArray(userId);
      expect(eid).to.deep.equal({
        source: 'czechadid.cz',
        uids: [{id: 'some-random-id-value', atype: 1}]
      });
    });
  });
});
