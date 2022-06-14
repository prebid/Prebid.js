import { cpexIdSubmodule, storage } from 'modules/cpexIdSystem.js';

describe('cpexId module', function () {
  let getCookieStub;

  beforeEach(function (done) {
    getCookieStub = sinon.stub(storage, 'getCookie');
    done();
  });

  afterEach(function () {
    getCookieStub.restore();
  });

  const cookieTestCasesForEmpty = [undefined, null, '']

  describe('getId()', function () {
    it('should return the uid when it exists in cookie', function () {
      getCookieStub.withArgs('czaid').returns('cpexIdTest');
      const id = cpexIdSubmodule.getId();
      expect(id).to.be.deep.equal({ id: 'cpexIdTest' });
    });

    cookieTestCasesForEmpty.forEach(testCase => it('should not return the uid when it doesnt exist in cookie', function () {
      getCookieStub.withArgs('czaid').returns(testCase);
      const id = cpexIdSubmodule.getId();
      expect(id).to.be.undefined;
    }));
  });

  describe('decode()', function () {
    it('should return the uid when it exists in cookie', function () {
      getCookieStub.withArgs('czaid').returns('cpexIdTest');
      const decoded = cpexIdSubmodule.decode();
      expect(decoded).to.be.deep.equal({ cpexId: 'cpexIdTest' });
    });
  });
});
