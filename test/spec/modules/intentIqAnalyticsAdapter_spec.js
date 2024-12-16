import { expect } from 'chai';
import iiqAnalyticsAnalyticsAdapter from 'modules/intentIqAnalyticsAdapter.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { config } from 'src/config.js';
import { EVENTS } from 'src/constants.js';
import * as events from 'src/events.js';
import { getStorageManager } from 'src/storageManager.js';
import sinon from 'sinon';
import { REPORTER_ID, preparePayload } from '../../../modules/intentIqAnalyticsAdapter';
import {FIRST_PARTY_KEY, VERSION} from '../../../libraries/intentIqConstants/intentIqConstants.js';
import * as detectBrowserUtils from '../../../libraries/intentIqUtils/detectBrowserUtils.js';
import {getReferrer, appendVrrefAndFui} from '../../../libraries/intentIqUtils/getRefferer.js';

const partner = 10;
const defaultData = '{"pcid":"f961ffb1-a0e1-4696-a9d2-a21d815bd344", "group": "A"}';
const version = VERSION;

const storage = getStorageManager({ moduleType: 'analytics', moduleName: 'iiqAnalytics' });

const USERID_CONFIG = [
  {
    'name': 'intentIqId',
    'params': {
      'partner': partner,
      'unpack': null,
    },
    'storage': {
      'type': 'html5',
      'name': 'intentIqId',
      'expires': 60,
      'refreshInSeconds': 14400
    }
  }
];

let wonRequest = {
  'bidderCode': 'pubmatic',
  'width': 728,
  'height': 90,
  'statusMessage': 'Bid available',
  'adId': '23caeb34c55da51',
  'requestId': '87615b45ca4973',
  'transactionId': '5e69fd76-8c86-496a-85ce-41ae55787a50',
  'auctionId': '0cbd3a43-ff45-47b8-b002-16d3946b23bf',
  'mediaType': 'banner',
  'source': 'client',
  'cpm': 5,
  'currency': 'USD',
  'ttl': 300,
  'referrer': '',
  'adapterCode': 'pubmatic',
  'originalCpm': 5,
  'originalCurrency': 'USD',
  'responseTimestamp': 1669644710345,
  'requestTimestamp': 1669644710109,
  'bidder': 'testbidder',
  'adUnitCode': 'addUnitCode',
  'timeToRespond': 236,
  'pbLg': '5.00',
  'pbMg': '5.00',
  'pbHg': '5.00',
  'pbAg': '5.00',
  'pbDg': '5.00',
  'pbCg': '',
  'size': '728x90',
  'status': 'rendered'
};

describe('IntentIQ tests all', function () {
  let logErrorStub;
  let getWindowSelfStub;
  let getWindowTopStub;
  let getWindowLocationStub;
  let detectBrowserStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
    sinon.stub(config, 'getConfig').withArgs('userSync.userIds').returns(USERID_CONFIG);
    sinon.stub(events, 'getEvents').returns([]);
    iiqAnalyticsAnalyticsAdapter.enableAnalytics({
      provider: 'iiqAnalytics',
    });
    iiqAnalyticsAnalyticsAdapter.initOptions = {
      lsValueInitialized: false,
      partner: null,
      fpid: null,
      userGroup: null,
      currentGroup: null,
      dataInLs: null,
      eidl: null,
      lsIdsInitialized: false,
      manualWinReportEnabled: false,
      domainName: null
    };
    if (iiqAnalyticsAnalyticsAdapter.track.restore) {
      iiqAnalyticsAnalyticsAdapter.track.restore();
    }
    sinon.spy(iiqAnalyticsAnalyticsAdapter, 'track');
  });

  afterEach(function () {
    logErrorStub.restore();
    if (getWindowSelfStub) getWindowSelfStub.restore();
    if (getWindowTopStub) getWindowTopStub.restore();
    if (getWindowLocationStub) getWindowLocationStub.restore();
    if (detectBrowserStub) detectBrowserStub.restore();
    config.getConfig.restore();
    events.getEvents.restore();
    iiqAnalyticsAnalyticsAdapter.disableAnalytics();
    if (iiqAnalyticsAnalyticsAdapter.track.restore) {
      iiqAnalyticsAnalyticsAdapter.track.restore();
    }
    localStorage.clear();
    server.reset();
  });

  it('IIQ Analytical Adapter bid win report', function () {
    localStorage.setItem(FIRST_PARTY_KEY, defaultData);
    getWindowLocationStub = sinon.stub(utils, 'getWindowLocation').returns({href: 'http://localhost:9876/'});
    const expectedVrref = encodeURIComponent(getWindowLocationStub().href);

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1');
    expect(request.url).to.contain(`&jsver=${version}`);
    expect(request.url).to.contain(`&vrref=${expectedVrref}`);
    expect(request.url).to.contain('&payload=');
    expect(request.url).to.contain('iiqid=f961ffb1-a0e1-4696-a9d2-a21d815bd344');
  });

  it('should initialize with default configurations', function () {
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized).to.be.false;
  });

  it('should handle BID_WON event with group configuration from local storage', function () {
    localStorage.setItem(FIRST_PARTY_KEY, '{"pcid":"testpcid", "group": "B"}');
    const expectedVrref = encodeURIComponent('http://localhost:9876/');

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1');
    expect(request.url).to.contain(`&jsver=${version}`);
    expect(request.url).to.contain(`&vrref=${expectedVrref}`);
    expect(request.url).to.contain('iiqid=testpcid');
  });

  it('should handle BID_WON event with default group configuration', function () {
    localStorage.setItem(FIRST_PARTY_KEY, defaultData);
    const defaultDataObj = JSON.parse(defaultData)

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    const dataToSend = preparePayload(wonRequest);
    const base64String = btoa(JSON.stringify(dataToSend));
    const payload = `[%22${base64String}%22]`;
    const expectedUrl = appendVrrefAndFui(
      `https://reports.intentiq.com/report?pid=${partner}&mct=1&iiqid=${defaultDataObj.pcid}&agid=${REPORTER_ID}&jsver=${version}&source=pbjs&payload=${payload}&uh=`,
      iiqAnalyticsAnalyticsAdapter.initOptions.domainName
    );
    expect(request.url).to.equal(expectedUrl);
    expect(dataToSend.pcid).to.equal(defaultDataObj.pcid)
  });

  it('should not send request if manualWinReportEnabled is true', function () {
    iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled = true;
    events.emit(EVENTS.BID_WON, wonRequest);
    expect(server.requests.length).to.equal(1);
  });

  it('should read data from local storage', function () {
    localStorage.setItem(FIRST_PARTY_KEY, '{"group": "A"}');
    localStorage.setItem(FIRST_PARTY_KEY + '_' + partner, '{"data":"testpcid", "eidl": 10}');
    events.emit(EVENTS.BID_WON, wonRequest);
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs).to.equal('testpcid');
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.eidl).to.equal(10);
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup).to.equal('A');
  });

  it('should handle initialization values from local storage', function () {
    localStorage.setItem(FIRST_PARTY_KEY, '{"pcid":"testpcid", "group": "B"}');
    localStorage.setItem(FIRST_PARTY_KEY + '_' + partner, '{"data":"testpcid"}');
    events.emit(EVENTS.BID_WON, wonRequest);
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup).to.equal('B');
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.fpid).to.be.not.null;
  });

  it('should handle reportExternalWin', function () {
    events.emit(EVENTS.BID_REQUESTED);
    iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled = true;
    localStorage.setItem(FIRST_PARTY_KEY, '{"pcid":"testpcid", "group": "B"}');
    localStorage.setItem(FIRST_PARTY_KEY + '_' + partner, '{"data":"testpcid"}');
    expect(window[`intentIqAnalyticsAdapter_${partner}`].reportExternalWin).to.be.a('function');
    expect(window[`intentIqAnalyticsAdapter_${partner}`].reportExternalWin({cpm: 1, currency: 'USD'})).to.equal(false);
  });

  it('should return window.location.href when window.self === window.top', function () {
    // Stub helper functions
    getWindowSelfStub = sinon.stub(utils, 'getWindowSelf').returns(window);
    getWindowTopStub = sinon.stub(utils, 'getWindowTop').returns(window);
    getWindowLocationStub = sinon.stub(utils, 'getWindowLocation').returns({ href: 'http://localhost:9876/' });

    const referrer = getReferrer();
    expect(referrer).to.equal(encodeURIComponent('http://localhost:9876/'));
  });

  it('should return window.top.location.href when window.self !== window.top and access is successful', function () {
    // Stub helper functions to simulate iframe
    getWindowSelfStub = sinon.stub(utils, 'getWindowSelf').returns({});
    getWindowTopStub = sinon.stub(utils, 'getWindowTop').returns({ location: { href: 'http://example.com/' } });

    const referrer = getReferrer();

    expect(referrer).to.equal(encodeURIComponent('http://example.com/'));
  });

  it('should return an empty string and log an error when accessing window.top.location.href throws an error', function () {
    // Stub helper functions to simulate error
    getWindowSelfStub = sinon.stub(utils, 'getWindowSelf').returns({});
    getWindowTopStub = sinon.stub(utils, 'getWindowTop').throws(new Error('Access denied'));

    const referrer = getReferrer();
    expect(referrer).to.equal('');
    expect(logErrorStub.calledOnce).to.be.true;
    expect(logErrorStub.firstCall.args[0]).to.contain('Error accessing location: Error: Access denied');
  });

  it('should not send request if the browser is in blacklist (chrome)', function () {
    const USERID_CONFIG_BROWSER = [...USERID_CONFIG];
    USERID_CONFIG_BROWSER[0].params.browserBlackList = 'ChrOmE';

    config.getConfig.restore();
    sinon.stub(config, 'getConfig').withArgs('userSync.userIds').returns(USERID_CONFIG_BROWSER);
    detectBrowserStub = sinon.stub(detectBrowserUtils, 'detectBrowser').returns('chrome');

    localStorage.setItem(FIRST_PARTY_KEY, defaultData);
    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.equal(0);
  });

  it('should send request if the browser is not in blacklist (safari)', function () {
    const USERID_CONFIG_BROWSER = [...USERID_CONFIG];
    USERID_CONFIG_BROWSER[0].params.browserBlackList = 'chrome,firefox';

    config.getConfig.restore();
    sinon.stub(config, 'getConfig').withArgs('userSync.userIds').returns(USERID_CONFIG_BROWSER);
    detectBrowserStub = sinon.stub(detectBrowserUtils, 'detectBrowser').returns('safari');

    localStorage.setItem(FIRST_PARTY_KEY, defaultData);
    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain(`https://reports.intentiq.com/report?pid=${partner}&mct=1`);
    expect(request.url).to.contain(`&jsver=${version}`);
    expect(request.url).to.contain(`&vrref=${encodeURIComponent('http://localhost:9876/')}`);
    expect(request.url).to.contain('&payload=');
    expect(request.url).to.contain('iiqid=f961ffb1-a0e1-4696-a9d2-a21d815bd344');
  });

  const testCasesVrref = [
    {
      description: 'domainName matches window.top.location.href',
      getWindowSelf: {},
      getWindowTop: { location: { href: 'http://example.com/page' } },
      getWindowLocation: { href: 'http://example.com/page' },
      domainName: 'example.com',
      expectedVrref: encodeURIComponent('http://example.com/page'),
      shouldContainFui: false
    },
    {
      description: 'domainName does not match window.top.location.href',
      getWindowSelf: {},
      getWindowTop: { location: { href: 'http://anotherdomain.com/page' } },
      getWindowLocation: { href: 'http://anotherdomain.com/page' },
      domainName: 'example.com',
      expectedVrref: encodeURIComponent('example.com'),
      shouldContainFui: false
    },
    {
      description: 'domainName is missing, only fui=1 is returned',
      getWindowSelf: {},
      getWindowTop: { location: { href: '' } },
      getWindowLocation: { href: '' },
      domainName: null,
      expectedVrref: '',
      shouldContainFui: true
    },
    {
      description: 'domainName is missing',
      getWindowSelf: {},
      getWindowTop: { location: { href: 'http://example.com/page' } },
      getWindowLocation: { href: 'http://example.com/page' },
      domainName: null,
      expectedVrref: encodeURIComponent('http://example.com/page'),
      shouldContainFui: false
    },
  ];

  testCasesVrref.forEach(({ description, getWindowSelf, getWindowTop, getWindowLocation, domainName, expectedVrref, shouldContainFui }) => {
    it(`should append correct vrref when ${description}`, function () {
      getWindowSelfStub = sinon.stub(utils, 'getWindowSelf').returns(getWindowSelf);
      getWindowTopStub = sinon.stub(utils, 'getWindowTop').returns(getWindowTop);
      getWindowLocationStub = sinon.stub(utils, 'getWindowLocation').returns(getWindowLocation);

      const url = 'https://reports.intentiq.com/report?pid=10';
      const modifiedUrl = appendVrrefAndFui(url, domainName);
      const urlObj = new URL(modifiedUrl);

      const vrref = encodeURIComponent(urlObj.searchParams.get('vrref') || '');
      const fui = urlObj.searchParams.get('fui');

      expect(vrref).to.equal(expectedVrref);
      expect(urlObj.searchParams.has('fui')).to.equal(shouldContainFui);
      if (shouldContainFui) {
        expect(fui).to.equal('1');
      }
    });
  });
});
