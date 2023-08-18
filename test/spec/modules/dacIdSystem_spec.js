import { dacIdSystemSubmodule, storage, cookieKey } from 'modules/dacIdSystem.js';

const DACID_DUMMY_VALUE = 'dacIdTest';
const DACID_DUMMY_OBJ = {
  dacId: DACID_DUMMY_VALUE
};

describe('dacId module', function () {
  let getCookieStub;

  beforeEach(function (done) {
    getCookieStub = sinon.stub(storage, 'getCookie');
    done();
  });

  afterEach(function () {
    getCookieStub.restore();
  });

  const cookieTestCasesForEmpty = [
    undefined,
    null,
    ''
  ]

  describe('getId()', function () {
    it('should return the uid when it exists in cookie', function () {
      getCookieStub.withArgs(cookieKey).returns(DACID_DUMMY_VALUE);
      const id = dacIdSystemSubmodule.getId();
      expect(id).to.be.deep.equal({id: {dacId: DACID_DUMMY_VALUE}});
    });

    cookieTestCasesForEmpty.forEach(testCase => it('should return the uid when it not exists in cookie', function () {
      getCookieStub.withArgs(cookieKey).returns(testCase);
      const id = dacIdSystemSubmodule.getId();
      expect(id).to.be.deep.equal(undefined);
    }));
  });

  describe('decode()', function () {
    it('should return the uid when it exists in cookie', function () {
      const decoded = dacIdSystemSubmodule.decode(DACID_DUMMY_OBJ);
      expect(decoded).to.be.deep.equal({dacId: {id: DACID_DUMMY_VALUE}});
    });

    it('should return the undefined when decode id is not "string"', function () {
      const decoded = dacIdSystemSubmodule.decode(1);
      expect(decoded).to.equal(undefined);
    });
  });
});
