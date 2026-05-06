import { expect } from 'chai';
import { createMgidSessionStorage, SESSION_BOUNDARY_MS } from 'libraries/mgidUtils/mgidSessionStorage';

describe('mgidUtils: mgidSessionStorage', function () {
  let ls;
  let setLocal;
  let setSession;
  let mgidSession;
  const writeCall = (key) => setLocal.getCalls().find((c) => c.args[0] === key);

  const fakeStorage = {
    getDataFromLocalStorage: (k) => (ls && (k in ls) ? ls[k] : null),
    setDataInLocalStorage: (k, v) => setLocal(k, v),
    getDataFromSessionStorage: () => null,
    setDataInSessionStorage: (k, v) => setSession(k, v),
  };

  beforeEach(function () {
    ls = {};
    setLocal = sinon.spy((k, v) => { ls[k] = v; });
    setSession = sinon.spy();
    delete window._mgPvid;
    delete window._mgPvidList;
    delete window._mgPbSessionPages;
    mgidSession = createMgidSessionStorage(fakeStorage);
  });

  describe('calculatePageSession', function () {
    it('should create a new session when no prior state exists', function () {
      mgidSession.calculatePageSession();

      expect(writeCall('_mgPbSessionId').args[1]).to.match(/^[0-9a-f]+-[0-9a-f]{5}$/);
      expect(writeCall('_mgPbSessionPagesNumber').args[1]).to.equal('1');
      const list = JSON.parse(writeCall('_mgPbSessionsTimeList').args[1]);
      expect(list).to.have.lengthOf(1);
      expect(list[0]).to.be.closeTo(Date.now(), 1000);
    });

    it('should keep sessionId and tail-refresh list when within 30 min', function () {
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      ls._mgPbSessionId = 'sid-existing';
      ls._mgPbSessionPagesNumber = '5';
      ls._mgPbSessionsTimeList = JSON.stringify([tenMinAgo]);
      window._mgPbSessionPages = [window.location.pathname];

      mgidSession.calculatePageSession();

      expect(writeCall('_mgPbSessionId').args[1]).to.equal('sid-existing');
      expect(writeCall('_mgPbSessionPagesNumber').args[1]).to.equal('5');
      const list = JSON.parse(writeCall('_mgPbSessionsTimeList').args[1]);
      expect(list).to.have.lengthOf(1);
      expect(list[0]).to.be.closeTo(Date.now(), 1000);
    });

    it('should start a new session when last activity was > 30 min ago', function () {
      const oldTime = Date.now() - (SESSION_BOUNDARY_MS + 60 * 1000);
      ls._mgPbSessionId = 'sid-old';
      ls._mgPbSessionPagesNumber = '10';
      ls._mgPbSessionsTimeList = JSON.stringify([oldTime]);

      mgidSession.calculatePageSession();

      expect(writeCall('_mgPbSessionId').args[1]).to.not.equal('sid-old');
      expect(writeCall('_mgPbSessionPagesNumber').args[1]).to.equal('1');
      const list = JSON.parse(writeCall('_mgPbSessionsTimeList').args[1]);
      expect(list).to.have.lengthOf(2);
    });

    it('should drop session-start timestamps older than 30 days', function () {
      const fortyDaysAgo = Date.now() - 40 * 24 * 60 * 60 * 1000;
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      ls._mgPbSessionId = 'sid-existing';
      ls._mgPbSessionPagesNumber = '3';
      ls._mgPbSessionsTimeList = JSON.stringify([fortyDaysAgo, tenDaysAgo, fiveMinAgo]);
      window._mgPbSessionPages = [window.location.pathname];

      mgidSession.calculatePageSession();

      const list = JSON.parse(writeCall('_mgPbSessionsTimeList').args[1]);
      expect(list).to.not.include(fortyDaysAgo);
      expect(list).to.include(tenDaysAgo);
      expect(list).to.have.lengthOf(2);
      expect(writeCall('_mgPbSessionId').args[1]).to.equal('sid-existing');
    });

    it('should write the pagePath dedup list to a window global, not persistent storage', function () {
      mgidSession.calculatePageSession();

      expect(setSession.called).to.equal(false);
      expect(window._mgPbSessionPages).to.deep.equal([window.location.pathname]);
    });

    it('should refresh the session tail timestamp on repeated same-path calls without inflating the page count', function () {
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      ls._mgPbSessionId = 'sid-x';
      ls._mgPbSessionPagesNumber = '1';
      ls._mgPbSessionsTimeList = JSON.stringify([tenMinAgo]);
      window._mgPbSessionPages = [window.location.pathname];

      mgidSession.calculatePageSession();
      mgidSession.calculatePageSession();
      mgidSession.calculatePageSession();

      const listCalls = setLocal.getCalls().filter((c) => c.args[0] === '_mgPbSessionsTimeList');
      expect(listCalls.length).to.be.greaterThan(1);
      const lastList = JSON.parse(listCalls[listCalls.length - 1].args[1]);
      expect(lastList).to.have.lengthOf(1);
      expect(lastList[0]).to.be.closeTo(Date.now(), 1000);

      const pageCalls = setLocal.getCalls().filter((c) => c.args[0] === '_mgPbSessionPagesNumber');
      expect(pageCalls[pageCalls.length - 1].args[1]).to.equal('1');
    });

    it('should bump sessionPage when window pagePaths is empty and session is within 30 min', function () {
      const recent = Date.now() - 5 * 60 * 1000;
      ls._mgPbSessionId = 'sid-keep';
      ls._mgPbSessionPagesNumber = '7';
      ls._mgPbSessionsTimeList = JSON.stringify([recent]);

      mgidSession.calculatePageSession();

      expect(writeCall('_mgPbSessionPagesNumber').args[1]).to.equal('8');
      expect(writeCall('_mgPbSessionId').args[1]).to.equal('sid-keep');
      expect(window._mgPbSessionPages).to.deep.equal([window.location.pathname]);
    });

    it('should bump sessionPage when current pagePath is not in window pagePaths list', function () {
      const recent = Date.now() - 5 * 60 * 1000;
      ls._mgPbSessionId = 'sid-keep';
      ls._mgPbSessionPagesNumber = '3';
      ls._mgPbSessionsTimeList = JSON.stringify([recent]);
      window._mgPbSessionPages = ['/some/other/path'];

      mgidSession.calculatePageSession();

      expect(writeCall('_mgPbSessionPagesNumber').args[1]).to.equal('4');
      expect(window._mgPbSessionPages).to.deep.equal(['/some/other/path', window.location.pathname]);
    });

    it('should not bump sessionPage when current pagePath is already in window pagePaths list', function () {
      const recent = Date.now() - 5 * 60 * 1000;
      ls._mgPbSessionId = 'sid-keep';
      ls._mgPbSessionPagesNumber = '5';
      ls._mgPbSessionsTimeList = JSON.stringify([recent]);
      window._mgPbSessionPages = [window.location.pathname, '/some/other/path'];

      mgidSession.calculatePageSession();

      expect(writeCall('_mgPbSessionPagesNumber').args[1]).to.equal('5');
      expect(window._mgPbSessionPages).to.deep.equal([window.location.pathname, '/some/other/path']);
    });
  });

  describe('getOrCreatePvid', function () {
    it('should generate a UUIDv4 PVID and cache it on window', function () {
      const pvid = mgidSession.getOrCreatePvid();
      expect(pvid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(window._mgPvid).to.equal(pvid);
      expect(window._mgPvidList).to.include(window.location.pathname);
    });

    it('should reuse the same PVID for repeated calls on the same pagePath', function () {
      const first = mgidSession.getOrCreatePvid();
      const second = mgidSession.getOrCreatePvid();
      expect(second).to.equal(first);
    });

    it('should reuse PVID set earlier by widget-builder on the same page', function () {
      window._mgPvid = 'wb-pvid-123';
      window._mgPvidList = [window.location.pathname];
      expect(mgidSession.getOrCreatePvid()).to.equal('wb-pvid-123');
    });

    it('should regenerate PVID for a new pagePath', function () {
      window._mgPvid = 'old-pvid';
      window._mgPvidList = ['/some/other/path'];
      const pvid = mgidSession.getOrCreatePvid();
      expect(pvid).to.not.equal('old-pvid');
      expect(pvid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(window._mgPvidList).to.include(window.location.pathname);
    });

    it('should regenerate PVID when path is in list but _mgPvid is missing', function () {
      window._mgPvidList = [window.location.pathname];
      delete window._mgPvid;
      delete window._mgPbSessionPages;
      const pvid = mgidSession.getOrCreatePvid();
      expect(pvid).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(window._mgPvidList.filter((p) => p === window.location.pathname)).to.have.lengthOf(1);
    });
  });

  describe('trackRender / trackView', function () {
    const id = '/1234/widget';

    it('trackRender should increment r in _mgPbViewrate for the given id', function () {
      mgidSession.trackRender(id);

      const viewrate = JSON.parse(writeCall('_mgPbViewrate').args[1]);
      expect(viewrate[id][0].r).to.equal(1);
      expect(viewrate[id][0].v).to.equal(0);
    });

    it('trackView should increment v in _mgPbViewrate for the given id', function () {
      mgidSession.trackView(id);

      const viewrate = JSON.parse(writeCall('_mgPbViewrate').args[1]);
      expect(viewrate[id][0].v).to.equal(1);
      expect(viewrate[id][0].r).to.equal(0);
    });

    it('should accumulate r and v on the same viewrate row across calls', function () {
      mgidSession.trackRender(id);
      mgidSession.trackView(id);
      mgidSession.trackRender(id);

      const viewrate = JSON.parse(ls._mgPbViewrate);
      expect(viewrate[id]).to.have.lengthOf(1);
      expect(viewrate[id][0].r).to.equal(2);
      expect(viewrate[id][0].v).to.equal(1);
    });

    it('should no-op when id is empty', function () {
      mgidSession.trackRender('');
      mgidSession.trackView('');

      expect(setLocal.called).to.equal(false);
    });

    it('should not write a render-sessions key (per-widget session counters are dropped)', function () {
      mgidSession.trackRender(id);

      expect(writeCall('_mgPbRenderedSessions')).to.be.undefined;
    });
  });

  describe('getViewrate', function () {
    it('should return null when no rows exist for the id', function () {
      expect(mgidSession.getViewrate('/none')).to.be.null;
    });

    it('should return null for an empty id', function () {
      expect(mgidSession.getViewrate('')).to.be.null;
    });

    it('should sum v and r across rows within the 7-day window into a "v,r" string', function () {
      const now = Date.now();
      ls._mgPbViewrate = JSON.stringify({
        '/w': [
          { id: 'a', st: now, v: 2, r: 1 },
          { id: 'b', st: now - 60000, v: 1, r: 3 },
        ],
      });

      expect(mgidSession.getViewrate('/w')).to.equal('3,4');
    });

    it('should emit even when one side is zero', function () {
      const now = Date.now();
      ls._mgPbViewrate = JSON.stringify({ '/w': [{ id: 'a', st: now, v: 0, r: 4 }] });

      expect(mgidSession.getViewrate('/w')).to.equal('0,4');
    });

    it('should ignore rows older than 7 days', function () {
      const now = Date.now();
      const ancient = now - 8 * 24 * 60 * 60 * 1000;
      ls._mgPbViewrate = JSON.stringify({
        '/w': [
          { id: 'old', st: ancient, v: 9, r: 9 },
          { id: 'fresh', st: now, v: 1, r: 2 },
        ],
      });

      expect(mgidSession.getViewrate('/w')).to.equal('1,2');
    });
  });

  describe('pruneViewrate', function () {
    it('should drop rows older than 7 days and keep recent rows regardless of v/r values', function () {
      const now = Date.now();
      const ancient = now - 8 * 24 * 60 * 60 * 1000;
      ls._mgPbViewrate = JSON.stringify({
        'kept-recent-full': [{ id: 'a', st: now, v: 2, r: 3 }],
        'kept-recent-partial': [
          { id: 'b1', st: now, v: 0, r: 1 },
          { id: 'b2', st: now, v: 1, r: 0 },
        ],
        'all-ancient': [{ id: 'c', st: ancient, v: 5, r: 5 }],
        'mixed': [
          { id: 'd-old', st: ancient, v: 2, r: 2 },
          { id: 'd-fresh', st: now, v: 0, r: 1 },
        ],
      });

      mgidSession.pruneViewrate();

      const after = JSON.parse(writeCall('_mgPbViewrate').args[1]);
      expect(after).to.have.all.keys('kept-recent-full', 'kept-recent-partial', 'mixed');
      expect(after['kept-recent-full']).to.have.lengthOf(1);
      expect(after['kept-recent-partial']).to.have.lengthOf(2);
      expect(after['mixed']).to.have.lengthOf(1);
      expect(after['mixed'][0].id).to.equal('d-fresh');
    });

    it('should not write back when there is nothing older than 7 days to drop', function () {
      const now = Date.now();
      ls._mgPbViewrate = JSON.stringify({
        'a': [{ id: 'x', st: now, v: 1, r: 1 }],
        'b': [{ id: 'y', st: now, v: 0, r: 1 }],
      });

      mgidSession.pruneViewrate();

      expect(writeCall('_mgPbViewrate')).to.be.undefined;
    });
  });

  describe('error resilience', function () {
    it('should return null from getViewrate when the stored viewrate JSON is corrupted', function () {
      ls._mgPbViewrate = 'not json';

      expect(mgidSession.getViewrate('/w')).to.be.null;
    });

    it('should treat corrupted _mgPbSessionsTimeList JSON as empty list', function () {
      ls._mgPbSessionsTimeList = 'broken';

      expect(mgidSession.getSessionInfo().sessionNum).to.equal(0);
      expect(() => mgidSession.calculatePageSession()).to.not.throw();
    });
  });
});
