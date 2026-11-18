import * as optimeraRTD from '../../../modules/optimeraRtdProvider.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

const utils = require('src/utils.js');

// `init()` now prefetches the scorefile as soon as it runs, instead of
// waiting for the first auction's getBidRequestData call. Stub the ajax
// dependency by default so tests that don't care about the fetch itself
// don't trigger real network requests; tests that do care replace this
// stub with their own before calling init().
let _defaultAjaxStub;
beforeEach(() => {
  _defaultAjaxStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder').returns(() => {});
});
afterEach(() => {
  try {
    _defaultAjaxStub.restore();
  } catch (e) {
    // already restored by a describe-specific beforeEach; nothing to do.
  }
});

describe('Optimera RTD sub module', () => {
  it('should init, return true, and set the params', () => {
    const conf = {
      dataProviders: [{
        name: 'optimeraRTD',
        params: {
          clientID: '9999',
          optimeraKeyName: 'optimera',
          device: 'de',
          transmitWithBidRequests: 'allow',
        }
      }]
    };
    expect(optimeraRTD.init(conf.dataProviders[0])).to.equal(true);
    expect(optimeraRTD.clientID).to.equal('9999');
    expect(optimeraRTD.optimeraKeyName).to.equal('optimera');
    expect(optimeraRTD.device).to.equal('de');
    expect(optimeraRTD.transmitWithBidRequests).to.equal('allow');
  });
});

describe('Optimera RTD score file URL is properly set for v0', () => {
  it('should properly set the score file URL', () => {
    const conf = {
      dataProviders: [{
        name: 'optimeraRTD',
        params: {
          clientID: '9999',
          optimeraKeyName: 'optimera',
          device: 'de',
          apiVersion: 'v0',
        }
      }]
    };
    optimeraRTD.init(conf.dataProviders[0]);
    optimeraRTD.setScoresURL();
    optimeraRTD.setScores();
    expect(optimeraRTD.apiVersion).to.equal('v0');
    expect(optimeraRTD.scoresURL).to.equal(`https://dyv1bugovvq1g.cloudfront.net/9999/${encodeURIComponent(window.location.host)}/context.html.js`);
  });

  it('should properly set the score file URL without apiVersion set', () => {
    const conf = {
      dataProviders: [{
        name: 'optimeraRTD',
        params: {
          clientID: '9999',
          optimeraKeyName: 'optimera',
          device: 'de',
        }
      }]
    };
    optimeraRTD.init(conf.dataProviders[0]);
    optimeraRTD.setScoresURL();
    optimeraRTD.setScores();
    expect(optimeraRTD.apiVersion).to.equal('v0');
    expect(optimeraRTD.scoresURL).to.equal(`https://dyv1bugovvq1g.cloudfront.net/9999/${encodeURIComponent(window.location.host)}/context.html.js`);
  });

  it('should properly set the score file URL with an api version other than v0', () => {
    const conf = {
      dataProviders: [{
        name: 'optimeraRTD',
        params: {
          clientID: '9999',
          optimeraKeyName: 'optimera',
          device: 'de',
          apiVersion: 'v15',
        }
      }]
    };
    optimeraRTD.init(conf.dataProviders[0]);
    optimeraRTD.setScoresURL();
    optimeraRTD.setScores();
    expect(optimeraRTD.scoresURL).to.equal(`https://dyv1bugovvq1g.cloudfront.net/9999/${encodeURIComponent(window.location.host)}/context.html.js`);
  });

  it('should log a warning and fall back to v0 when apiVersion v1 is used', () => {
    const utilsLogWarnStub = sinon.stub(utils, 'logWarn');
    const conf = {
      dataProviders: [{
        name: 'optimeraRTD',
        params: {
          clientID: '9999',
          optimeraKeyName: 'optimera',
          device: 'de',
          apiVersion: 'v1',
        }
      }]
    };
    optimeraRTD.init(conf.dataProviders[0]);
    optimeraRTD.setScoresURL();
    optimeraRTD.setScores();
    expect(utils.logWarn.called).to.equal(true);
    expect(optimeraRTD.apiVersion).to.equal('v0');
    expect(optimeraRTD.scoresURL).to.equal(`https://dyv1bugovvq1g.cloudfront.net/9999/${encodeURIComponent(window.location.host)}/context.html.js`);
    utilsLogWarnStub.restore();
  });
});

describe('Optimera RTD score file properly sets targeting values', () => {
  const scores = {
    'div-0': ['A1', 'A2'],
    'div-1': ['A3', 'A4'],
    device: {
      de: {
        'div-0': ['A5', 'A6'],
        'div-1': ['A7', 'A8'],
        insights: {
          ilv: ['div-0'],
          miv: ['div-4'],
        }
      },
      mo: {
        'div-0': ['A9', 'B0'],
        'div-1': ['B1', 'B2'],
        insights: {
          ilv: ['div-1'],
          miv: ['div-2'],
        }
      }
    },
    insights: {
      ilv: ['div-5'],
      miv: ['div-6'],
    }
  };
  it('Properly set the score file url and scores', () => {
    optimeraRTD.setScores(JSON.stringify(scores));
    expect(optimeraRTD.optimeraTargeting['div-0']).to.include.ordered.members(['A5', 'A6']);
    expect(optimeraRTD.optimeraTargeting['div-1']).to.include.ordered.members(['A7', 'A8']);
  });
});

describe('Optimera RTD propery sets the window.optimera object', () => {
  const scores = {
    'div-0': ['A1', 'A2'],
    'div-1': ['A3', 'A4'],
    device: {
      de: {
        'div-0': ['A5', 'A6'],
        'div-1': ['A7', 'A8'],
        insights: {
          ilv: ['div-0'],
          miv: ['div-4'],
        }
      },
      mo: {
        'div-0': ['A9', 'B0'],
        'div-1': ['B1', 'B2'],
        insights: {
          ilv: ['div-1'],
          miv: ['div-2'],
        }
      }
    },
    insights: {
      ilv: ['div-5'],
      miv: ['div-6'],
    },
    pagelevel: [
      'U',
      'LA_9999',
      'LB_9999',
      'LC_9999',
    ]
  };
  it('Properly set the score file url and scores', () => {
    optimeraRTD.setScores(JSON.stringify(scores));
    expect(window.optimera.data['div-1']).to.include.ordered.members(['A7', 'A8']);
    expect(window.optimera.insights.ilv).to.include.ordered.members(['div-0']);
    expect(window.optimera.pagelevel).to.include.ordered.members(['U', 'LA_9999', 'LB_9999', 'LC_9999']);
  });

  const scoresWithoutPageLevel = {
    'div-0': ['A1', 'A2'],
    'div-1': ['A3', 'A4'],
    device: {
      de: {
        'div-0': ['A5', 'A6'],
        'div-1': ['A7', 'A8'],
        insights: {
          ilv: ['div-0'],
          miv: ['div-4'],
        }
      },
      mo: {
        'div-0': ['A9', 'B0'],
        'div-1': ['B1', 'B2'],
        insights: {
          ilv: ['div-1'],
          miv: ['div-2'],
        }
      }
    },
    insights: {
      ilv: ['div-5'],
      miv: ['div-6'],
    },
  };

  it('Properly leaves pagelevel empty when it is not provided', () => {
    window.optimera = {};

    optimeraRTD.setScores(JSON.stringify(scoresWithoutPageLevel));
    expect(window.optimera.data['div-1']).to.include.ordered.members(['A7', 'A8']);
    expect(window.optimera.insights.ilv).to.include.ordered.members(['div-0']);
    expect(window.optimera.pagelevel).to.deep.equal([]);
  });
});

describe('Optimera RTD targeting object is properly formed', () => {
  const adDivs = ['div-0', 'div-1'];
  it('applyTargeting properly created the targeting object', () => {
    const targeting = optimeraRTD.returnTargetingData(adDivs);
    expect(targeting).to.deep.include({ 'div-0': { optimera: [['A5', 'A6']] } });
    expect(targeting).to.deep.include({ 'div-1': { optimera: [['A7', 'A8']] } });
  });
});

describe('Optimera RTD error logging', () => {
  let utilsLogErrorStub;

  beforeEach(() => {
    utilsLogErrorStub = sinon.stub(utils, 'logError');
  });
  afterEach(() => {
    utilsLogErrorStub.restore();
  });

  it('ommitting clientID should log an error', () => {
    const conf = {
      dataProviders: [{
        name: 'optimeraRTD',
        params: {
          optimeraKeyName: 'optimera',
          device: 'de'
        }
      }]
    };
    optimeraRTD.init(conf.dataProviders[0]);
    expect(utils.logError.called).to.equal(true);
  });

  it('if adUnits is not an array should log an error', () => {
    optimeraRTD.returnTargetingData('test');
    expect(utils.logError.called).to.equal(true);
  });
});

describe('Optimera RTD injectOrtbScores', () => {
  it('injects optimera targeting into ortb2Imp.ext.data', () => {
    const adUnits = [
      { code: 'div-0', ortb2Imp: {} },
      { code: 'div-1', ortb2Imp: {} }
    ];

    const reqBidsConfigObj = { adUnits };

    optimeraRTD.injectOrtbScores(reqBidsConfigObj);

    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.optimera).to.deep.equal(['A5', 'A6']);
    expect(reqBidsConfigObj.adUnits[1].ortb2Imp.ext.data.optimera).to.deep.equal(['A7', 'A8']);
  });

  it('does not inject when no targeting data is available', () => {
    const adUnits = [{ code: 'div-unknown', ortb2Imp: {} }];

    const reqBidsConfigObj = { adUnits };

    optimeraRTD.injectOrtbScores(reqBidsConfigObj);

    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;
  });
});

describe('Optimera RTD oPS script', () => {
  function conf(params) {
    return { name: 'optimeraRTD', params: Object.assign({ clientID: '9999' }, params) };
  }

  it('should default callOPS to false and not request the script', () => {
    optimeraRTD.init(conf());
    expect(optimeraRTD.callOPS).to.equal(false);
    expect(loadExternalScriptStub.called).to.equal(false);
  });

  it('should not request the script when callOPS is false', () => {
    optimeraRTD.init(conf({ callOPS: false }));
    expect(optimeraRTD.callOPS).to.equal(false);
    expect(loadExternalScriptStub.called).to.equal(false);
  });

  it('should request the oPS script and append it to the body when callOPS is true', () => {
    optimeraRTD.init(conf({ callOPS: true }));
    expect(optimeraRTD.callOPS).to.equal(true);
    expect(loadExternalScriptStub.calledOnce).to.equal(true);
    expect(loadExternalScriptStub.getCall(0).args[0]).to.equal('https://d15kdpgjg3unno.cloudfront.net/oPS.js?cid=9999');
    expect(loadExternalScriptStub.getCall(0).args[5]).to.deep.equal({
      id: 'optimera-ops',
      'data-cid': '9999',
    });
    const script = loadExternalScriptStub.getCall(0).returnValue;
    expect(script.parentNode).to.equal(document.body);
    script.remove();
  });

  it('defers appending the oPS script until the body is available when document.body is not yet set', () => {
    const originalBody = document.body;
    const addEventListenerSpy = sinon.spy(document, 'addEventListener');
    Object.defineProperty(document, 'body', { value: null, configurable: true });
    try {
      optimeraRTD.init(conf({ clientID: '9999-no-body', callOPS: true }));
      expect(loadExternalScriptStub.calledOnce).to.equal(true);
      // Since document.body was unavailable, the script should not have been
      // appended yet; instead a DOMContentLoaded listener should have been
      // registered to append it later.
      expect(addEventListenerSpy.calledWith('DOMContentLoaded')).to.equal(true);
    } finally {
      Object.defineProperty(document, 'body', { value: originalBody, configurable: true });
      addEventListenerSpy.restore();
    }
  });
});

describe('Optimera RTD fetchScores', () => {
  const scoreFile = JSON.stringify({
    'div-0': ['A1', 'A2'],
    'div-1': ['A3', 'A4'],
  });

  function conf(params) {
    return {
      name: 'optimeraRTD',
      params: Object.assign({
        clientID: '9999',
        optimeraKeyName: 'optimera',
        device: 'de',
        transmitWithBidRequests: 'allow',
      }, params)
    };
  }

  // `init()`'s automatic prefetch means the ajax dependency must be stubbed
  // with the desired behavior *before* `init()` runs, and each test starts
  // from a clean scorefile cache so it doesn't reuse another test's (or
  // another describe's) in-flight/resolved fetch for the same URL.
  beforeEach(() => {
    _defaultAjaxStub.restore();
    optimeraRTD.resetScoresCache();
  });

  let ajaxBuilderStub;
  afterEach(() => {
    if (ajaxBuilderStub) {
      try {
        ajaxBuilderStub.restore();
      } catch (e) {
        // already restored; nothing to do.
      }
    }
    ajaxBuilderStub = undefined;
  });

  function stubAjax(fakeImpl) {
    ajaxBuilderStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder').callsFake(() => fakeImpl);
  }

  it('prefetches on init and reuses the cached result for getBidRequestData, without refetching', async () => {
    stubAjax((url, cbObj) => cbObj.success(scoreFile, { status: 200 }));
    optimeraRTD.init(conf());
    expect(ajaxBuilderStub.calledOnce).to.equal(true);

    const callback = sinon.spy();
    const reqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    await optimeraRTD.fetchScores(reqBidsConfigObj, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.optimera).to.deep.equal(['A1', 'A2']);
    // The scorefile URL did not change, so no second ajax call was made:
    // the in-memory cache from init()'s prefetch was reused.
    expect(ajaxBuilderStub.calledOnce).to.equal(true);
  });

  it('shares a single in-flight request across concurrent auctions', async () => {
    let resolveSuccess;
    stubAjax((url, cbObj) => {
      resolveSuccess = () => cbObj.success(scoreFile, { status: 200 });
    });
    optimeraRTD.init(conf({ clientID: '1111' }));
    expect(ajaxBuilderStub.calledOnce).to.equal(true);

    const callback1 = sinon.spy();
    const callback2 = sinon.spy();
    const reqBidsConfigObj1 = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    const reqBidsConfigObj2 = { adUnits: [{ code: 'div-1', ortb2Imp: {} }] };
    // Two "concurrent auctions" both ask for scores while the prefetch
    // triggered by init() is still in flight.
    const p1 = optimeraRTD.fetchScores(reqBidsConfigObj1, callback1);
    const p2 = optimeraRTD.fetchScores(reqBidsConfigObj2, callback2);

    // Only the one request started by init() was made; neither
    // getBidRequestData call issued its own.
    expect(ajaxBuilderStub.calledOnce).to.equal(true);

    resolveSuccess();
    await Promise.all([p1, p2]);

    expect(callback1.calledOnce).to.equal(true);
    expect(callback2.calledOnce).to.equal(true);
    expect(reqBidsConfigObj1.adUnits[0].ortb2Imp.ext.data.optimera).to.deep.equal(['A1', 'A2']);
    expect(reqBidsConfigObj2.adUnits[0].ortb2Imp.ext.data.optimera).to.deep.equal(['A3', 'A4']);
  });

  it('does not inject ORTB2 data when transmitWithBidRequests is deny', async () => {
    stubAjax((url, cbObj) => cbObj.success(scoreFile, { status: 200 }));
    optimeraRTD.init(conf({ clientID: '2222', transmitWithBidRequests: 'deny' }));

    const callback = sinon.spy();
    const reqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    await optimeraRTD.fetchScores(reqBidsConfigObj, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;
  });

  it('logs an error and still calls back when processing the score file throws', async () => {
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    stubAjax((url, cbObj) => cbObj.success(scoreFile, { status: 200 }));
    optimeraRTD.init(conf({ clientID: '3333' }));

    const callback = sinon.spy();
    // Omitting adUnits causes injectOrtbScores to throw, exercising the catch branch.
    await optimeraRTD.fetchScores({}, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(utils.logError.called).to.equal(true);
    utilsLogErrorStub.restore();
  });

  it('logs an error and calls back on a 403 response, without blocking later auctions', async () => {
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    stubAjax((url, cbObj) => cbObj.success(scoreFile, { status: 403 }));
    optimeraRTD.init(conf({ clientID: '4444' }));

    const callback = sinon.spy();
    await optimeraRTD.fetchScores({ adUnits: [] }, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(utils.logError.called).to.equal(true);
    utilsLogErrorStub.restore();
  });

  it('logs an error and calls back on other non-200 responses (e.g. 404/500)', async () => {
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    stubAjax((url, cbObj) => cbObj.success('', { status: 500 }));
    optimeraRTD.init(conf({ clientID: '6666' }));

    const callback = sinon.spy();
    await optimeraRTD.fetchScores({ adUnits: [] }, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(utils.logError.calledWithMatch(/500/)).to.equal(true);
    utilsLogErrorStub.restore();
  });

  it('logs an error and calls back when the ajax request errors', async () => {
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    stubAjax((url, cbObj) => cbObj.error());
    optimeraRTD.init(conf({ clientID: '5555' }));

    const callback = sinon.spy();
    await optimeraRTD.fetchScores({ adUnits: [] }, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(utils.logError.called).to.equal(true);
    utilsLogErrorStub.restore();
  });

  it('a late response (arriving after a getBidRequestData call already gave up) still updates the cache for the next auction', async () => {
    let resolveSuccess;
    stubAjax((url, cbObj) => {
      resolveSuccess = () => cbObj.success(scoreFile, { status: 200 });
    });
    optimeraRTD.init(conf({ clientID: '7777' }));

    // Simulate an auction's own RTD timeout elapsing before the scorefile
    // arrives: it moves on without targeting.
    const firstReqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    expect(firstReqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;

    // The network response arrives later and is still applied to the cache.
    resolveSuccess();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // A subsequent auction/ad request benefits from the now-cached data,
    // without triggering another network request.
    const callback = sinon.spy();
    const secondReqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    await optimeraRTD.fetchScores(secondReqBidsConfigObj, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(secondReqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.optimera).to.deep.equal(['A1', 'A2']);
    expect(ajaxBuilderStub.calledOnce).to.equal(true);
  });

  it('does not retroactively modify the first auction\'s bid requests once scores arrive, but does attach scores to a later/lazy-loaded slot\'s auction', async () => {
    // Mirrors the reported Carpenter's-sites scenario: auctionDelay (e.g.
    // 50ms) is shorter than the scorefile's fetch time (e.g. 320ms), so the
    // first auction's getBidRequestData call is released by Prebid's RTD
    // timeout before the fetch resolves. A second auction - e.g. a
    // lazy-loaded slot or a refresh - calls getBidRequestData later, after
    // the scorefile has arrived, and must receive scores.
    let resolveSuccess;
    stubAjax((url, cbObj) => {
      resolveSuccess = () => cbObj.success(scoreFile, { status: 200 });
    });
    optimeraRTD.init(conf({ clientID: '9900' }));

    // First auction: getBidRequestData is called while the fetch (started
    // by init()'s prefetch) is still in flight.
    const firstCallback = sinon.spy();
    const firstReqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    const firstPromise = optimeraRTD.fetchScores(firstReqBidsConfigObj, firstCallback);

    // Simulate Prebid's own auctionDelay elapsing and releasing the auction
    // before our fetch has resolved: the bid request config object is
    // inspected (and the auction proceeds) with no optimera data yet.
    expect(firstCallback.called).to.equal(false);
    expect(firstReqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;

    // Now the scorefile response finally arrives.
    resolveSuccess();
    await firstPromise;

    // The first auction's own reqBidsConfigObj is filled in once our promise
    // resolves (since nothing else sent it to the wire ahead of us in this
    // unit test), but critically it was not touched before that - a real
    // auction that had already dispatched bid requests by this point would
    // not have anything retroactively changed, since this module never
    // revisits bids after they're sent.
    expect(firstCallback.calledOnce).to.equal(true);

    // Second auction (e.g. a lazy-loaded slot becoming viewable, or a GAM
    // refresh triggering a new Prebid auction) calls getBidRequestData after
    // the scorefile has already loaded and cached: it must get scores
    // immediately, without triggering another network request.
    const secondCallback = sinon.spy();
    const secondReqBidsConfigObj = { adUnits: [{ code: 'div-1', ortb2Imp: {} }] };
    await optimeraRTD.fetchScores(secondReqBidsConfigObj, secondCallback);

    expect(secondCallback.calledOnce).to.equal(true);
    expect(secondReqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.optimera).to.deep.equal(['A3', 'A4']);
    expect(ajaxBuilderStub.calledOnce).to.equal(true);
  });

  it('discards a stale response superseded by a newer fetch (e.g. after a SPA navigation)', async () => {
    const calls = [];
    stubAjax((url, cbObj) => {
      calls.push({ url, cbObj });
    });
    optimeraRTD.init(conf({ clientID: '8888' }));
    expect(calls.length).to.equal(1);

    // Simulate a SPA navigation producing a new scorefile URL while the
    // first request for the old URL is still outstanding.
    optimeraRTD.resetScoresCache();
    optimeraRTD.init(conf({ clientID: '8888-new' }));
    expect(calls.length).to.equal(2);

    // The newer request resolves first.
    calls[1].cbObj.success(JSON.stringify({ 'div-0': ['NEW1', 'NEW2'] }), { status: 200 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(optimeraRTD.optimeraTargeting['div-0']).to.deep.equal(['NEW1', 'NEW2']);

    // The stale, older response arrives afterwards and must not clobber it.
    calls[0].cbObj.success(scoreFile, { status: 200 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(optimeraRTD.optimeraTargeting['div-0']).to.deep.equal(['NEW1', 'NEW2']);
  });

  it('discards a stale ajax *error* superseded by a newer fetch', async () => {
    const calls = [];
    stubAjax((url, cbObj) => {
      calls.push({ url, cbObj });
    });
    optimeraRTD.init(conf({ clientID: '8899' }));
    expect(calls.length).to.equal(1);

    // A newer fetch starts (e.g. a SPA navigation) while the first request
    // is still outstanding.
    optimeraRTD.resetScoresCache();
    optimeraRTD.init(conf({ clientID: '8899-new' }));
    expect(calls.length).to.equal(2);

    // The newer request succeeds first.
    calls[1].cbObj.success(JSON.stringify({ 'div-0': ['NEW1', 'NEW2'] }), { status: 200 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(optimeraRTD.optimeraTargeting['div-0']).to.deep.equal(['NEW1', 'NEW2']);

    // The stale, older request then errors out; since it's superseded, it
    // must not log another error or otherwise disturb the already-cached
    // newer data.
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    calls[0].cbObj.error();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(utils.logError.called).to.equal(false);
    expect(optimeraRTD.optimeraTargeting['div-0']).to.deep.equal(['NEW1', 'NEW2']);
    utilsLogErrorStub.restore();
  });

  it('resolves immediately without fetching when the URL is unchanged but no fetch was ever tracked for it', async () => {
    // Simulate a scorefile URL that is already known (e.g. computed directly
    // via setScoresURL(), independently of ensureScoresFetched/fetchScores)
    // but for which no fetch has ever been started or cached in this
    // module's lifetime.
    stubAjax(() => {});
    optimeraRTD.init(conf({ clientID: '9910' }));
    optimeraRTD.resetScoresCache();
    optimeraRTD.setScoresURL();
    ajaxBuilderStub.resetHistory();

    const callback = sinon.spy();
    const reqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    await optimeraRTD.fetchScores(reqBidsConfigObj, callback);

    expect(callback.calledOnce).to.equal(true);
    expect(ajaxBuilderStub.called).to.equal(false);
    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;
  });

  it('does not inject a previous page\'s stale scores when a SPA navigation\'s new scorefile request fails', async () => {
    // Page A's scorefile loads successfully.
    stubAjax((url, cbObj) => cbObj.success(scoreFile, { status: 200 }));
    optimeraRTD.init(conf({ clientID: 'pageA' }));
    expect(optimeraRTD.optimeraTargeting['div-0']).to.deep.equal(['A1', 'A2']);

    // SPA navigation to page B produces a new scorefile URL (simulated here
    // via a new clientID, since setScoresURL() keys the URL off clientID and
    // location). The new request fails. `optimeraTargeting` still holds page
    // A's scores at this point, since nothing has overwritten it yet.
    ajaxBuilderStub.restore();
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    stubAjax((url, cbObj) => cbObj.error());
    optimeraRTD.init(conf({ clientID: 'pageB' }));

    const callback = sinon.spy();
    // Same ad unit code as page A happened to use, to make sure a stale
    // match isn't injected.
    const reqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    await optimeraRTD.fetchScores(reqBidsConfigObj, callback);
    utilsLogErrorStub.restore();

    expect(callback.calledOnce).to.equal(true);
    // Page A's stale scores must not be injected into page B's ad units.
    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;

    // A subsequent auction on page B (still using the same failed-fetch
    // promise) must also not inject the stale data.
    const secondCallback = sinon.spy();
    const secondReqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    await optimeraRTD.fetchScores(secondReqBidsConfigObj, secondCallback);
    expect(secondCallback.calledOnce).to.equal(true);
    expect(secondReqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;
  });
});
