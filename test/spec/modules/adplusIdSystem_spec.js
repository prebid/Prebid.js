import {
  adplusIdSystemSubmodule,
  storage,
  ADPLUS_UID_NAME,
  ROTATION_INTERVAL,
} from 'modules/adplusIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import { createEidsArray } from '../../../modules/userId/eids.js';

const expiresIn = 90 * 24 * 60 * 60 // 90 Days (seconds);
const RESPONSE_VALUE = { uid: "v2|n_vl-BK185ZwF5Egm5UafsRms9mF6LTWpfWkTHmoRsz0Bh5hTWvfiJWD6nq_9g05OwNVG2pSTTTfwg", atype: 2, expiresIn, }
const STORAGE_VALUE = { uid: "v2|n_vl-BK185ZwF5Egm5UafsRms9mF6LTWpfWkTHmoRsz0Bh5hTWvfiJWD6nq_9g05OwNVG2pSTTTfwg", atype: 2, }
const DECODED_VALUE = {
  adplusId: { id: "v2|n_vl-BK185ZwF5Egm5UafsRms9mF6LTWpfWkTHmoRsz0Bh5hTWvfiJWD6nq_9g05OwNVG2pSTTTfwg", atype: 2, }
};
const EID_VALUE = {
  source: "ad-plus.com.tr",
  uids: [
    DECODED_VALUE.adplusId,
  ]
};

describe('adplusId module', function () {
  let getCookieStub;
  let clock;

  function getStorageValue() {
    const now = Date.now();
    const expiresAt = now + (expiresIn * 1000);
    const rotateAt = now + ROTATION_INTERVAL; // 4 Hours
    const storageValue = { ...STORAGE_VALUE, expiresAt, rotateAt };
    return storageValue;
  }

  beforeEach(function (done) {
    getCookieStub = sinon.stub(storage, 'getCookie');
    const fakeNow = new Date('2025-11-06T10:00:00Z').getTime();
    clock = sinon.useFakeTimers(fakeNow);
    done();
  });

  afterEach(function () {
    getCookieStub.restore();
    clock.restore();
  });

  describe('getId()', function () {
    it('should return from cookie', function () {
      const expected = getStorageValue();
      getCookieStub.withArgs(ADPLUS_UID_NAME).returns(JSON.stringify(expected));
      const id = adplusIdSystemSubmodule.getId();
      expect(id).to.deep.equal({
        id: expected,
      });
    });

    it('should return from fetch', function () {
      const callbackSpy = sinon.spy();
      const callback = adplusIdSystemSubmodule.getId().callback;
      callback(callbackSpy);
      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(RESPONSE_VALUE));
      const decoded = adplusIdSystemSubmodule.decode(callbackSpy.lastCall.lastArg);
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(RESPONSE_VALUE);
      expect(decoded).to.deep.equal(DECODED_VALUE);
    });
  });

  describe('decode()', function () {
    it('should decode AdPlus ID correctly', function () {
      const decoded = adplusIdSystemSubmodule.decode(RESPONSE_VALUE);
      expect(decoded).to.be.deep.equal(DECODED_VALUE);
    });

    it('should return the undefined when decode id is not "object" or null', function () {
      let decoded = adplusIdSystemSubmodule.decode(1);
      expect(decoded).to.equal(undefined);
      decoded = adplusIdSystemSubmodule.decode(null);
      expect(decoded).to.equal(undefined);
    });
  });

  it('should generate correct EID', () => {
    const eids = createEidsArray(adplusIdSystemSubmodule.decode(RESPONSE_VALUE), new Map(Object.entries(adplusIdSystemSubmodule.eids)));
    expect(eids).to.eql([
      EID_VALUE,
    ]);
  });
});
