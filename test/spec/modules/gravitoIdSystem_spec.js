import { gravitoIdSystemSubmodule, storage, cookieKey } from 'modules/gravitoIdSystem.js';

const GRAVITOID_TEST_VALUE = 'gravitompIdTest';
const GRAVITOID_TEST_OBJ = {
  gravitompId: GRAVITOID_TEST_VALUE
};

describe('gravitompId module', function () {
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
    it('should return the gravitompId when it exists in cookie', function () {
      getCookieStub.withArgs(cookieKey).returns(GRAVITOID_TEST_VALUE);
      const id = gravitoIdSystemSubmodule.getId();
      expect(id).to.be.deep.equal({id: {gravitompId: GRAVITOID_TEST_VALUE}});
    });

    cookieTestCasesForEmpty.forEach(testCase => it('should return the gravitompId when it not exists in cookie', function () {
      getCookieStub.withArgs(cookieKey).returns(testCase);
      const id = gravitoIdSystemSubmodule.getId();
      expect(id).to.be.deep.equal(undefined);
    }));
  });

  describe('decode()', function () {
    it('should return the gravitompId when it exists in cookie', function () {
      const decoded = gravitoIdSystemSubmodule.decode(GRAVITOID_TEST_OBJ);
      expect(decoded).to.be.deep.equal({gravitompId: {id: GRAVITOID_TEST_VALUE}});
    });

    it('should return the undefined when decode id is not "string"', function () {
      const decoded = gravitoIdSystemSubmodule.decode(1);
      expect(decoded).to.equal(undefined);
    });
  });
});
