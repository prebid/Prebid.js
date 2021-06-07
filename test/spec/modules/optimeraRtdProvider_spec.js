import * as optimeraRTD from '../../../modules/optimeraRtdProvider.js';
let utils = require('src/utils.js');

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

describe('Optimera RTD score file url is properly set', () => {
  it('Proerly set the score file url', () => {
    optimeraRTD.setScores();
    expect(optimeraRTD.scoresURL).to.equal('https://dyv1bugovvq1g.cloudfront.net/9999/localhost:9876/context.html.js');
  });
});

describe('Optimera RTD score file properly sets targeting values', () => {
  const scores = {
    'div-0': ['A1', 'A2'],
    'div-1': ['A3', 'A4'],
    'device': {
      'de': {
        'div-0': ['A5', 'A6'],
        'div-1': ['A7', 'A8'],
      },
      'mo': {
        'div-0': ['A9', 'B0'],
        'div-1': ['B1', 'B2'],
      }
    }
  };
  it('Properly set the score file url', () => {
    optimeraRTD.setScores(JSON.stringify(scores));
    expect(optimeraRTD.optimeraTargeting['div-0']).to.include.ordered.members(['A5', 'A6']);
    expect(optimeraRTD.optimeraTargeting['div-1']).to.include.ordered.members(['A7', 'A8']);
  });
});

describe('Optimera RTD targeting object is properly formed', () => {
  const adDivs = ['div-0', 'div-1'];
  it('applyTargeting properly created the targeting object', () => {
    const targeting = optimeraRTD.returnTargetingData(adDivs);
    expect(targeting).to.deep.include({'div-0': {'optimera': ['A5', 'A6']}});
    expect(targeting).to.deep.include({'div-1': {'optimera': ['A7', 'A8']}});
  });
});

describe('Optimera RTD error logging', () => {
  let utilsLogErrorStub;

  beforeEach(function () {
    utilsLogErrorStub = sinon.stub(utils, 'logError');
  });
  afterEach(function () {
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
});
