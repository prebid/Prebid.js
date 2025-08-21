import {
  adplusIdSystemSubmodule,
  storage,
  ADPLUS_COOKIE_NAME,
} from 'modules/adplusIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import {createEidsArray} from '../../../modules/userId/eids.js';

const UID_VALUE = '191223.3413767593';

describe('adplusId module', function () {
  let getCookieStub;

  beforeEach(function (done) {
    getCookieStub = sinon.stub(storage, 'getCookie');
    done();
  });

  afterEach(function () {
    getCookieStub.restore();
  });

  describe('getId()', function () {
    it('should return stored', function () {
      const id = adplusIdSystemSubmodule.getId(undefined, undefined, UID_VALUE);
      expect(id).to.deep.equal({ id: UID_VALUE });
    });

    it('should return from cookie', function () {
      getCookieStub.withArgs(ADPLUS_COOKIE_NAME).returns(UID_VALUE);
      const id = adplusIdSystemSubmodule.getId();
      expect(id).to.deep.equal({ id: UID_VALUE });
    });

    it('should return from fetch', function () {
      const callbackSpy = sinon.spy();
      const callback = adplusIdSystemSubmodule.getId().callback;
      callback(callbackSpy);
      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ 'uid': UID_VALUE }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(UID_VALUE);
    });
  });

  describe('decode()', function () {
    it('should return AdPlus ID when they exist', function () {
      const decoded = adplusIdSystemSubmodule.decode(UID_VALUE);
      expect(decoded).to.be.deep.equal({
        adplusId: UID_VALUE
      });
    });

    it('should return the undefined when decode id is not "string" or "object"', function () {
      const decoded = adplusIdSystemSubmodule.decode(1);
      expect(decoded).to.equal(undefined);
    });
  });

  it('should generate correct EID', () => {
    const TEST_UID = 'test-uid-value';
    const eids = createEidsArray(adplusIdSystemSubmodule.decode(TEST_UID), new Map(Object.entries(adplusIdSystemSubmodule.eids)));
    expect(eids).to.eql([
      {
        source: "ad-plus.com.tr",
        uids: [
          {
            atype: 1,
            id: TEST_UID
          }
        ]
      }
    ]);
  });
});
