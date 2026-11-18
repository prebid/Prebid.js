import * as optimeraRTD from '../../../modules/optimeraRtdProvider.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

const utils = require('src/utils.js');

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

  let ajaxBuilderStub;
  afterEach(() => {
    if (ajaxBuilderStub) {
      ajaxBuilderStub.restore();
      ajaxBuilderStub = undefined;
    }
  });

  it('skips fetching and calls back immediately when the score URL has not changed', () => {
    optimeraRTD.init(conf());
    optimeraRTD.setScoresURL();
    ajaxBuilderStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder');
    const callback = sinon.spy();
    optimeraRTD.fetchScores({ adUnits: [] }, callback);
    expect(callback.calledOnce).to.equal(true);
    expect(ajaxBuilderStub.called).to.equal(false);
  });

  it('fetches, parses scores, and injects ORTB2 data on a successful 200 response', () => {
    optimeraRTD.init(conf({ clientID: '1111' }));
    ajaxBuilderStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder').callsFake(() => {
      return (url, cbObj) => {
        cbObj.success(scoreFile, { status: 200 });
      };
    });
    const callback = sinon.spy();
    const reqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    optimeraRTD.fetchScores(reqBidsConfigObj, callback);
    expect(callback.calledOnce).to.equal(true);
    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.optimera).to.deep.equal(['A1', 'A2']);
  });

  it('does not inject ORTB2 data when transmitWithBidRequests is deny', () => {
    optimeraRTD.init(conf({ clientID: '2222', transmitWithBidRequests: 'deny' }));
    ajaxBuilderStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder').callsFake(() => {
      return (url, cbObj) => {
        cbObj.success(scoreFile, { status: 200 });
      };
    });
    const callback = sinon.spy();
    const reqBidsConfigObj = { adUnits: [{ code: 'div-0', ortb2Imp: {} }] };
    optimeraRTD.fetchScores(reqBidsConfigObj, callback);
    expect(callback.calledOnce).to.equal(true);
    expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.optimera).to.be.undefined;
  });

  it('logs an error and still calls back when processing the score file throws', () => {
    optimeraRTD.init(conf({ clientID: '3333' }));
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    ajaxBuilderStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder').callsFake(() => {
      return (url, cbObj) => {
        cbObj.success(scoreFile, { status: 200 });
      };
    });
    const callback = sinon.spy();
    // Omitting adUnits causes injectOrtbScores to throw, exercising the catch branch.
    optimeraRTD.fetchScores({}, callback);
    expect(callback.calledOnce).to.equal(true);
    expect(utils.logError.called).to.equal(true);
    utilsLogErrorStub.restore();
  });

  it('logs an error and calls back on a 403 response', () => {
    optimeraRTD.init(conf({ clientID: '4444' }));
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    ajaxBuilderStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder').callsFake(() => {
      return (url, cbObj) => {
        cbObj.success(scoreFile, { status: 403 });
      };
    });
    const callback = sinon.spy();
    optimeraRTD.fetchScores({ adUnits: [] }, callback);
    expect(callback.calledOnce).to.equal(true);
    expect(utils.logError.called).to.equal(true);
    utilsLogErrorStub.restore();
  });

  it('logs an error and calls back when the ajax request errors', () => {
    optimeraRTD.init(conf({ clientID: '5555' }));
    const utilsLogErrorStub = sinon.stub(utils, 'logError');
    ajaxBuilderStub = sinon.stub(optimeraRTD.dep, 'ajaxBuilder').callsFake(() => {
      return (url, cbObj) => {
        cbObj.error();
      };
    });
    const callback = sinon.spy();
    optimeraRTD.fetchScores({ adUnits: [] }, callback);
    expect(callback.calledOnce).to.equal(true);
    expect(utils.logError.called).to.equal(true);
    utilsLogErrorStub.restore();
  });
});
