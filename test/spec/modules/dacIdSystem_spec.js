import {
  dacIdSystemSubmodule,
  storage,
  FUUID_COOKIE_NAME,
  AONEID_COOKIE_NAME
} from 'modules/dacIdSystem.js';
import { server } from 'test/mocks/xhr.js';

const FUUID_DUMMY_VALUE = 'dacIdTest';
const AONEID_DUMMY_VALUE = '12345'
const DACID_DUMMY_OBJ = {
  fuuid: FUUID_DUMMY_VALUE,
  uid: AONEID_DUMMY_VALUE
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

  const configParamTestCase = {
    params: {
      oid: [
        '637c1b6fc26bfad0', // valid
        'e8316b39c08029e1' // invalid
      ]
    }
  }

  describe('getId()', function () {
    it('should return undefined when oid & fuuid not exist', function () {
      // no oid, no fuuid
      const id = dacIdSystemSubmodule.getId();
      expect(id).to.equal(undefined);
    });

    it('should return fuuid when oid not exists but fuuid exists', function () {
      // no oid, fuuid
      getCookieStub.withArgs(FUUID_COOKIE_NAME).returns(FUUID_DUMMY_VALUE);
      const id = dacIdSystemSubmodule.getId();
      expect(id).to.be.deep.equal({
        id: {
          fuuid: FUUID_DUMMY_VALUE,
          uid: undefined
        }
      });
    });

    it('should return fuuid when oid is invalid but fuuid exists', function () {
      // invalid oid, fuuid, no AoneId
      getCookieStub.withArgs(FUUID_COOKIE_NAME).returns(FUUID_DUMMY_VALUE);
      const id = dacIdSystemSubmodule.getId(configParamTestCase.params.oid[1]);
      expect(id).to.be.deep.equal({
        id: {
          fuuid: FUUID_DUMMY_VALUE,
          uid: undefined
        }
      });
    });

    cookieTestCasesForEmpty.forEach(testCase => it('should return undefined when fuuid not exists', function () {
      // valid oid, no fuuid, no AoneId
      getCookieStub.withArgs(FUUID_COOKIE_NAME).returns(testCase);
      const id = dacIdSystemSubmodule.getId(configParamTestCase.params.oid[0]);
      expect(id).to.equal(undefined);
    }));

    it('should return AoneId when AoneId not exists', function () {
      // valid oid, fuuid, no AoneId
      getCookieStub.withArgs(FUUID_COOKIE_NAME).returns(FUUID_DUMMY_VALUE);
      const callbackSpy = sinon.spy();
      const callback = dacIdSystemSubmodule.getId({params: {oid: configParamTestCase.params.oid[0]}}).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({'uid': AONEID_DUMMY_VALUE}));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({fuuid: 'dacIdTest', uid: AONEID_DUMMY_VALUE});
    });

    cookieTestCasesForEmpty.forEach(testCase => it('should return undefined when AoneId not exists & API result is empty', function () {
      // valid oid, fuuid, no AoneId, API result empty
      getCookieStub.withArgs(FUUID_COOKIE_NAME).returns(FUUID_DUMMY_VALUE);
      const callbackSpy = sinon.spy();
      const callback = dacIdSystemSubmodule.getId({params: {oid: configParamTestCase.params.oid[0]}}).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({'uid': testCase}));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({fuuid: 'dacIdTest', uid: undefined});
    }));

    it('should return the fuuid & AoneId when they exist', function () {
      // valid oid, fuuid, AoneId
      getCookieStub.withArgs(FUUID_COOKIE_NAME).returns(FUUID_DUMMY_VALUE);
      getCookieStub.withArgs(AONEID_COOKIE_NAME).returns(AONEID_DUMMY_VALUE);
      const id = dacIdSystemSubmodule.getId(configParamTestCase.params.oid[0]);
      expect(id).to.be.deep.equal({
        id: {
          fuuid: FUUID_DUMMY_VALUE,
          uid: AONEID_DUMMY_VALUE
        }
      });
    });
  });

  describe('decode()', function () {
    it('should return fuuid & AoneId when they exist', function () {
      const decoded = dacIdSystemSubmodule.decode(DACID_DUMMY_OBJ);
      expect(decoded).to.be.deep.equal({
        dacId: {
          fuuid: FUUID_DUMMY_VALUE,
          id: AONEID_DUMMY_VALUE
        }
      });
    });

    it('should return the undefined when decode id is not "string"', function () {
      const decoded = dacIdSystemSubmodule.decode(1);
      expect(decoded).to.equal(undefined);
    });
  });
});
