import { config } from 'src/config.js';
import { growthCodeRtdProvider, storage } from '../../../modules/growthCodeRtdProvider.js';
import sinon from 'sinon';

const sampleConfig = {
  name: 'growthCodeRtd',
  waitForIt: true,
  params: {
    pid: 'TEST01',
  }
};

const sampleEids = [
  {
    source: 'growthcode.io',
    inserter: 'growthcode.io',
    uids: [{ id: 'gc-test-id-123', atype: 1 }]
  },
  {
    source: 'uidapi.com',
    inserter: 'growthcode.io',
    uids: [{ id: 'uid2-test-id-456', atype: 3 }]
  },
  {
    source: 'id5-sync.com',
    inserter: 'growthcode.io',
    uids: [{ id: 'id5-test-id-789', atype: 1 }]
  }
];

describe('growthCodeRtdProvider', function() {
  let getDataStub;

  beforeEach(function() {
    config.resetConfig();
    getDataStub = sinon.stub(storage, 'getDataFromLocalStorage');
  });

  afterEach(function () {
    getDataStub.restore();
  });

  describe('init', function() {
    it('returns false when config is null', function () {
      expect(growthCodeRtdProvider.init(null, null)).to.equal(false);
    });

    it('returns true with valid config', function () {
      expect(growthCodeRtdProvider.init(sampleConfig, null)).to.equal(true);
    });
  });

  describe('getBidRequestData', function() {
    it('reads gceb from localStorage and injects EIDs into ortb2.user.ext.eids', function (done) {
      growthCodeRtdProvider.init(sampleConfig, null);
      getDataStub.withArgs('gceb', null).returns(JSON.stringify(sampleEids));

      const bidConfig = {
        ortb2Fragments: {
          global: {
            user: {}
          }
        }
      };

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        const userEids = bidConfig.ortb2Fragments.global.user.ext.eids;
        expect(userEids).to.have.length(3);
        expect(userEids[0].source).to.equal('growthcode.io');
        expect(userEids[0].uids[0].id).to.equal('gc-test-id-123');
        expect(userEids[1].source).to.equal('uidapi.com');
        expect(userEids[2].source).to.equal('id5-sync.com');
        done();
      }, sampleConfig, null);
    });

    it('does not duplicate existing EIDs', function (done) {
      growthCodeRtdProvider.init(sampleConfig, null);
      getDataStub.withArgs('gceb', null).returns(JSON.stringify(sampleEids));

      const existingEid = {
        source: 'growthcode.io',
        inserter: 'growthcode.io',
        uids: [{ id: 'gc-test-id-123', atype: 1 }]
      };

      const bidConfig = {
        ortb2Fragments: {
          global: {
            user: {
              ext: {
                eids: [existingEid]
              }
            }
          }
        }
      };

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        const userEids = bidConfig.ortb2Fragments.global.user.ext.eids;
        expect(userEids).to.have.length(3);
        expect(userEids[0].source).to.equal('growthcode.io');
        expect(userEids[0].uids[0].id).to.equal('gc-test-id-123');
        done();
      }, sampleConfig, null);
    });

    it('calls callback when gceb is invalid JSON', function (done) {
      growthCodeRtdProvider.init(sampleConfig, null);
      getDataStub.withArgs('gceb', null).returns('not-valid-json');

      const bidConfig = { ortb2Fragments: { global: {} } };

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
        done();
      }, sampleConfig, null);
    });

    it('filters out EIDs without source or uids', function (done) {
      growthCodeRtdProvider.init(sampleConfig, null);
      const mixedEids = [
        { source: 'growthcode.io', uids: [{ id: 'valid', atype: 1 }] },
        { source: '', uids: [{ id: 'no-source', atype: 1 }] },
        { source: 'missing-uids.com' },
      ];
      getDataStub.withArgs('gceb', null).returns(JSON.stringify(mixedEids));

      const bidConfig = { ortb2Fragments: { global: {} } };

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        const userEids = bidConfig.ortb2Fragments.global.user.ext.eids;
        expect(userEids).to.have.length(1);
        expect(userEids[0].source).to.equal('growthcode.io');
        done();
      }, sampleConfig, null);
    });
  });

  describe('getBidRequestData - cold start (gceb not yet written)', function() {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it('waits and injects when growthCodeEIDArrayPresentEvent fires', function (done) {
      getDataStub.withArgs('gceb', null).returns(null); // absent at auction time

      const bidConfig = { ortb2Fragments: { global: {} } };

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        const userEids = bidConfig.ortb2Fragments.global.user.ext.eids;
        expect(userEids).to.have.length(3);
        expect(userEids[0].source).to.equal('growthcode.io');
        done();
      }, sampleConfig, null);

      // gc_superscript finishes /v4/sync, writes the blob and fires the event.
      getDataStub.withArgs('gceb', null).returns(JSON.stringify(sampleEids));
      window.dispatchEvent(new Event('growthCodeEIDArrayPresentEvent'));
    });

    it('does not release the auction before the blob is ready', function (done) {
      config.setConfig({ realTimeData: { auctionDelay: 2000 } });
      getDataStub.withArgs('gceb', null).returns(null); // absent
      const cfg = { name: 'growthCodeRtd', waitForIt: true, params: { pid: 'TEST01', eidWaitMs: 2000 } };

      const bidConfig = { ortb2Fragments: { global: {} } };
      let called = false;

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        called = true;
        done();
      }, cfg, null);

      clock.tick(500);
      expect(called).to.equal(false); // still waiting (timeout is 2000ms)

      // event arrives before the timeout
      getDataStub.withArgs('gceb', null).returns(JSON.stringify(sampleEids));
      window.dispatchEvent(new Event('growthCodeEIDArrayPresentEvent'));
    });

    it('injects on timeout if the blob appeared without an event', function (done) {
      getDataStub.withArgs('gceb', null).returns(null);

      const bidConfig = { ortb2Fragments: { global: {} } };

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        // finish() re-reads localStorage, so a blob written without an event
        // is still injected when the timeout fires.
        const userEids = bidConfig.ortb2Fragments.global.user.ext.eids;
        expect(userEids).to.have.length(3);
        done();
      }, sampleConfig, null);

      getDataStub.withArgs('gceb', null).returns(JSON.stringify(sampleEids));
      clock.tick(900); // timeout path re-reads and injects
    });

    it('releases the auction without eids after the wait times out', function (done) {
      getDataStub.withArgs('gceb', null).returns(null); // never written

      const bidConfig = { ortb2Fragments: { global: {} } };

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
        done();
      }, sampleConfig, null);

      clock.tick(900); // DEFAULT_WAIT_MS
    });

    it('falls back to auctionDelay when eidWaitMs is not set', function (done) {
      config.setConfig({ realTimeData: { auctionDelay: 2000 } });
      getDataStub.withArgs('gceb', null).returns(null);
      const cfg = { name: 'growthCodeRtd', waitForIt: true, params: { pid: 'TEST01' } }; // no eidWaitMs

      const bidConfig = { ortb2Fragments: { global: {} } };
      let called = false;

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        called = true;
        done();
      }, cfg, null);

      clock.tick(900);
      expect(called).to.equal(false); // does not stop at the 900ms default — follows auctionDelay
      clock.tick(1100); // total 2000ms = auctionDelay
      expect(called).to.equal(true);
    });

    it('caps the wait at 900ms when eidWaitMs is large and no auctionDelay is set', function (done) {
      getDataStub.withArgs('gceb', null).returns(null);
      const cfg = { name: 'growthCodeRtd', waitForIt: true, params: { pid: 'TEST01', eidWaitMs: 15000 } };

      const bidConfig = { ortb2Fragments: { global: {} } };
      let called = false;

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        called = true;
        done();
      }, cfg, null);

      clock.tick(899);
      expect(called).to.equal(false); // not yet
      clock.tick(1); // 900ms cap reached despite eidWaitMs: 15000
      expect(called).to.equal(true);
    });

    it('honors a custom params.eidWaitMs timeout', function (done) {
      getDataStub.withArgs('gceb', null).returns(null);
      const cfg = { name: 'growthCodeRtd', waitForIt: true, params: { pid: 'TEST01', eidWaitMs: 300 } };

      const bidConfig = { ortb2Fragments: { global: {} } };
      let called = false;

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        called = true;
        done();
      }, cfg, null);

      clock.tick(299);
      expect(called).to.equal(false); // not yet
      clock.tick(1);
    });

    it('clamps eidWaitMs to realTimeData.auctionDelay', function (done) {
      config.setConfig({ realTimeData: { auctionDelay: 1000 } });
      getDataStub.withArgs('gceb', null).returns(null);
      const cfg = { name: 'growthCodeRtd', waitForIt: true, params: { pid: 'TEST01', eidWaitMs: 15000 } };

      const bidConfig = { ortb2Fragments: { global: {} } };
      let called = false;

      growthCodeRtdProvider.getBidRequestData(bidConfig, function () {
        called = true;
        done();
      }, cfg, null);

      // Without clamping the timer would be 15000ms; clamped to auctionDelay it
      // releases at 1000ms.
      clock.tick(1000);
      expect(called).to.equal(true);
    });
  });
});
