import { liveIntentRtdSubmodule } from 'modules/liveIntentRtdProvider.js';
import { expect } from 'chai';

describe('LiveIntent Rtd Provider', function () {
  const SUBMODULE_NAME = 'liveintent';
  const SEGMENTS = ['asa_1231', 'lalo_4311', 'liurl_99123'];
  const EXPECTED_USER_DATA = [{
    name: 'liveintent.com',
    segment: SEGMENTS.map(id => ({ id }))
  }];

  let sandbox;

  function liveIntentEid(segments = SEGMENTS) {
    return {
      source: 'liveintent.com',
      uids: [{ id: 'abc', atype: 3 }],
      ext: segments == null ? undefined : { segments }
    };
  }

  function makeReqBidsConfig({ global = {}, bidder = {} } = {}) {
    return {
      ortb2Fragments: {
        global,
        bidder
      }
    };
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('submodule `init`', function () {
    it('returns true', function () {
      expect(liveIntentRtdSubmodule.init({ name: SUBMODULE_NAME })).to.equal(true);
    });
  });

  describe('submodule `getBidRequestData`', function () {
    it('exists', function () {
      expect(liveIntentRtdSubmodule.getBidRequestData).to.be.a('function');
    });

    it('calls callback and leaves ortb2 unchanged when there is no liveintent EID', function () {
      const reqBidsConfigObj = makeReqBidsConfig();
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({});
      expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.equal({});
    });

    it('calls callback and leaves ortb2 unchanged when ext.segments is missing', function () {
      const existing = {
        name: 'example.com',
        segment: [{ id: 'a_1231' }, { id: 'b_4311' }]
      };
      const reqBidsConfigObj = makeReqBidsConfig({
        global: {
          source: {},
          user: {
            data: [existing],
            ext: { eids: [liveIntentEid(null)] }
          }
        }
      });
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.deep.equal([existing]);
    });

    it('calls callback and leaves ortb2 unchanged when ext.segments is empty', function () {
      const reqBidsConfigObj = makeReqBidsConfig({
        global: {
          user: {
            ext: { eids: [liveIntentEid([])] }
          }
        }
      });
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.equal(undefined);
    });

    it('writes liveintent.com user.data from the global liveintent EID ext.segments', function () {
      const reqBidsConfigObj = makeReqBidsConfig({
        global: {
          user: {
            ext: { eids: [liveIntentEid()] }
          }
        }
      });
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.deep.equal(EXPECTED_USER_DATA);
    });

    it('appends to existing global user.data', function () {
      const existing = {
        name: 'example.com',
        segment: [{ id: 'a_1231' }, { id: 'b_4311' }]
      };
      const reqBidsConfigObj = makeReqBidsConfig({
        global: {
          source: {},
          user: {
            data: [existing],
            ext: { eids: [liveIntentEid()] }
          }
        }
      });
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({
        source: {},
        user: {
          data: [existing, ...EXPECTED_USER_DATA],
          ext: { eids: [liveIntentEid()] }
        }
      });
    });

    it('writes user.data only onto bidder fragments that already have the liveintent EID', function () {
      const reqBidsConfigObj = makeReqBidsConfig({
        global: {},
        bidder: {
          allowedBidder: {
            user: {
              ext: { eids: [liveIntentEid()] }
            }
          },
          otherBidder: {
            user: {
              ext: { eids: [{ source: 'other.com', uids: [{ id: 'xyz', atype: 1 }] }] }
            }
          }
        }
      });
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({});
      expect(reqBidsConfigObj.ortb2Fragments.bidder.allowedBidder.user.data).to.deep.equal(EXPECTED_USER_DATA);
      expect(reqBidsConfigObj.ortb2Fragments.bidder.otherBidder.user.data).to.equal(undefined);
    });
  });
});
