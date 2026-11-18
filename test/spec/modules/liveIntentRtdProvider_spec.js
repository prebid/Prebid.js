import { liveIntentRtdSubmodule } from 'modules/liveIntentRtdProvider.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { expect } from 'chai';

describe('LiveIntent Rtd Provider', function () {
  const SUBMODULE_NAME = 'liveintent';
  const SEGMENTS = ['asa_1231', 'lalo_4311', 'liurl_99123'];
  const EXPECTED_USER_DATA = [{
    name: 'liveintent.com',
    segment: SEGMENTS.map(id => ({ id }))
  }];

  let sandbox;
  let getUserIdsStub;

  function makeReqBidsConfig(globalOrtb2 = {}) {
    return {
      ortb2Fragments: {
        global: globalOrtb2,
        bidder: {}
      }
    };
  }

  function stubUserIds(userIds) {
    getUserIdsStub = sandbox.stub().returns(userIds);
    sandbox.stub(prebidGlobal, 'getGlobal').returns({
      getUserIds: getUserIdsStub
    });
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

    it('calls callback and leaves ortb2 unchanged when getUserIds is missing', function () {
      sandbox.stub(prebidGlobal, 'getGlobal').returns({});
      const reqBidsConfigObj = makeReqBidsConfig();
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({});
    });

    it('calls callback and leaves ortb2 unchanged when segments are missing', function () {
      stubUserIds({ lipb: { lipbid: 'abc' } });
      const reqBidsConfigObj = makeReqBidsConfig();
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({});
    });

    it('calls callback and leaves ortb2 unchanged when segments are empty', function () {
      stubUserIds({ lipb: { segments: [] } });
      const reqBidsConfigObj = makeReqBidsConfig();
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({});
    });

    it('writes liveintent.com user.data from getUserIds().lipb.segments', function () {
      stubUserIds({ lipb: { lipbid: 'abc', segments: SEGMENTS } });
      const reqBidsConfigObj = makeReqBidsConfig();
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(getUserIdsStub.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({
        user: { data: EXPECTED_USER_DATA }
      });
    });

    it('still writes segments when lipbid is absent', function () {
      stubUserIds({ lipb: { segments: SEGMENTS } });
      const reqBidsConfigObj = makeReqBidsConfig();
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.deep.equal(EXPECTED_USER_DATA);
    });

    it('appends to existing global user.data', function () {
      stubUserIds({ lipb: { segments: SEGMENTS } });
      const existing = {
        name: 'example.com',
        segment: [{ id: 'a_1231' }, { id: 'b_4311' }]
      };
      const reqBidsConfigObj = makeReqBidsConfig({
        source: {},
        user: { data: [existing] }
      });
      const callback = sandbox.spy();

      liveIntentRtdSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      expect(callback.calledOnce).to.equal(true);
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.equal({
        source: {},
        user: { data: [existing, ...EXPECTED_USER_DATA] }
      });
    });
  });
});
