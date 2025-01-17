import * as optimeraRTD from '../../../modules/optimeraRtdProvider.js';

const utils = require('src/utils.js');

describe('Optimera RTD sub module', () => {
  it('should init, return true, and set the params', () => {
    const conf = {
      dataProviders: [{
        name: 'optimeraRTD',
        params: {
          clientID: '9999',
          optimeraKeyName: 'optimera',
          device: 'de'
        }
      }]
    };
    expect(optimeraRTD.init(conf.dataProviders[0])).to.equal(true);
    expect(optimeraRTD.clientID).to.equal('9999');
    expect(optimeraRTD.optimeraKeyName).to.equal('optimera');
    expect(optimeraRTD.device).to.equal('de');
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
    optimeraRTD.setScores();
    expect(optimeraRTD.apiVersion).to.equal('v0');
    expect(optimeraRTD.scoresURL).to.equal('https://dyv1bugovvq1g.cloudfront.net/9999/localhost%3A9876/context.html.js');
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
    optimeraRTD.setScores();
    expect(optimeraRTD.apiVersion).to.equal('v0');
    expect(optimeraRTD.scoresURL).to.equal('https://dyv1bugovvq1g.cloudfront.net/9999/localhost%3A9876/context.html.js');
  });

  it('should properly set the score file URL with an api version other than v0 or v1', () => {
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
    optimeraRTD.setScores();
    expect(optimeraRTD.scoresURL).to.equal('https://dyv1bugovvq1g.cloudfront.net/9999/localhost%3A9876/context.html.js');
  });
});

describe('Optimera RTD score file URL is properly set for v1', () => {
  it('should properly set the score file URL', () => {
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
    optimeraRTD.setScores();
    expect(optimeraRTD.apiVersion).to.equal('v1');
    expect(optimeraRTD.scoresURL).to.equal('https://v1.oapi26b.com/api/products/scores?c=9999&h=localhost:9876&p=/context.html&s=de');
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
    }
  };
  it('Properly set the score file url and scores', () => {
    optimeraRTD.setScores(JSON.stringify(scores));
    expect(window.optimera.data['div-1']).to.include.ordered.members(['A7', 'A8']);
    expect(window.optimera.insights.ilv).to.include.ordered.members(['div-0']);
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
