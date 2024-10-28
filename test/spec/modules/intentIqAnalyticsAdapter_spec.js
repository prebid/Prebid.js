import { expect } from 'chai';
import iiqAnalyticsAnalyticsAdapter from 'modules/intentIqAnalyticsAdapter.js';
import * as utils from 'src/utils.js';
import * as detectBrowserUtils from '../../../libraries/detectBrowserUtils/detectBrowserUtils';
import { server } from 'test/mocks/xhr.js';
import { config } from 'src/config.js';
import { EVENTS } from 'src/constants.js';
import * as events from 'src/events.js';
import { getStorageManager } from 'src/storageManager.js';
import sinon from 'sinon';
import { FIRST_PARTY_KEY } from '../../../modules/intentIqIdSystem';
import { REPORTER_ID, getReferrer, preparePayload } from '../../../modules/intentIqAnalyticsAdapter';

const partner = 10;
const defaultData = '{"pcid":"f961ffb1-a0e1-4696-a9d2-a21d815bd344", "group": "A"}';
const version = 0.2;

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
      manualReport: false
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

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1');
    expect(request.url).to.contain(`&jsver=${version}&vrref=http://localhost:9876/`);
    expect(request.url).to.contain('&payload=');
    expect(request.url).to.contain('iiqid=f961ffb1-a0e1-4696-a9d2-a21d815bd344');
  });

  it('should initialize with default configurations', function () {
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized).to.be.false;
  });

  it('should handle BID_WON event with group configuration from local storage', function () {
    localStorage.setItem(FIRST_PARTY_KEY, '{"pcid":"testpcid", "group": "B"}');

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1');
    expect(request.url).to.contain(`&jsver=${version}&vrref=http://localhost:9876/`);
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
    expect(request.url).to.equal(
      `https://reports.intentiq.com/report?pid=${partner}&mct=1&iiqid=${defaultDataObj.pcid}&agid=${REPORTER_ID}&jsver=${version}&vrref=${getReferrer()}&source=pbjs&payload=${payload}`
    );
    expect(dataToSend.pcid).to.equal(defaultDataObj.pcid)
  });

  it('should not send request if manualReport is true', function () {
    iiqAnalyticsAnalyticsAdapter.initOptions.manualReport = true;
    events.emit(EVENTS.BID_WON, wonRequest);
    expect(server.requests.length).to.equal(0);
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

  it('should return window.location.href when window.self === window.top', function () {
    // Stub helper functions
    getWindowSelfStub = sinon.stub(utils, 'getWindowSelf').returns(window);
    getWindowTopStub = sinon.stub(utils, 'getWindowTop').returns(window);
    getWindowLocationStub = sinon.stub(utils, 'getWindowLocation').returns({ href: 'http://localhost:9876/' });

    const referrer = getReferrer();
    expect(referrer).to.equal('http://localhost:9876/');
  });

  it('should return window.top.location.href when window.self !== window.top and access is successful', function () {
    // Stub helper functions to simulate iframe
    getWindowSelfStub = sinon.stub(utils, 'getWindowSelf').returns({});
    getWindowTopStub = sinon.stub(utils, 'getWindowTop').returns({ location: { href: 'http://example.com/' } });

    const referrer = getReferrer();
    expect(referrer).to.equal('http://example.com/');
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
    expect(request.url).to.contain(`&jsver=${version}&vrref=http://localhost:9876/`);
    expect(request.url).to.contain('&payload=');
    expect(request.url).to.contain('iiqid=f961ffb1-a0e1-4696-a9d2-a21d815bd344');
  });
});
