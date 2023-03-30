import { logInfo, logError } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { config } from '../src/config.js';

const MODULE_NAME = 'iiqAnalytics'
const analyticsType = 'endpoint';
const defaultUrl = 'https://reports.intentiq.com/report';
const storage = getStorageManager({ gvlid: undefined, moduleName: MODULE_NAME });
const prebidVersion = '$prebid.version$';
const REPORTER_ID = Date.now() + '_' + getRandom(0, 1000);

const FIRST_PARTY_KEY = '_iiq_fdata';
const FIRST_PARTY_DATA_KEY = '_iiq_fdata';
const GROUP_LS_KEY = '_iiq_group';
const PRECENT_LS_KEY = '_iiq_precent';
const JSVERSION = 5.3

const PARAMS_NAMES = {
  abPercentage: 'abPercentage',
  abTestGroup: 'abGroup',
  pbPauseUntill: 'pbPauseUntil',
  pbMonitoringEnabled: 'pbMonitoringEnabled',
  isInTestGroup: 'isInTestGroup',
  enhanceRequests: 'enhanceRequests',
  wasSubscribedForPrebid: 'wasSubscribedForPrebid',
  hadEids: 'hadEids',
  userActualPercentage: 'userPercentage',
  ABTestingConfigurationSource: 'ABTestingConfigurationSource',
  lateConfiguration: 'lateConfiguration',
  jsverion: 'jsversion',
  eidsNames: 'eidsNames',
  requestRtt: 'rtt',
  clientType: 'clientType',
  adserverDeviceType: 'AdserverDeviceType',
  terminationCause: 'terminationCause',
  callCount: 'callCount',
  manualCallCount: 'mcc',
  pubprovidedidsFailedToregister: 'ppcc',
  noDataCount: 'noDataCount',
  profile: 'profile',
  isProfileDeterministic: 'pidDeterministic',
  siteId: 'sid',
  hadEidsInLocalStorage: 'idls',
  auctionStartTime: 'ast',
  eidsReadTime: 'eidt',
  agentId: 'aid',
  auctionEidsLegth: 'aeidln',
  wasServerCalled: 'wsrvcll',
  refferer: 'vrref',
  isInBrowserBlacklist: 'inbbl',
  prebidVersion: 'pbjsver',
  partnerId: 'partnerId'
};

var initOptions = {
  lsValueInitialized: false
}

// Events needed
const {
  EVENTS: {
    BID_WON
  }
} = CONSTANTS;

let iiqAnalyticsAnalyticsAdapter = Object.assign(adapter({ defaultUrl, analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case BID_WON:
        bidWon(args);
        break;
      default:
        break;
    }
  }
});

function readData(key) {
  try {
    if (storage.hasLocalStorage()) {
      return storage.getDataFromLocalStorage(key);
    }
    if (storage.cookiesAreEnabled()) {
      return storage.getCookie(key);
    }
  } catch (error) {
    logError(error);
  }
}

function initLsValues() {
  if (initOptions.lsValueInitialized) return;
  initOptions.fpid = readData(FIRST_PARTY_KEY);
  let iiqArr = config.getConfig('userSync.userIds').filter(m => m.name == 'intentIqId');
  if (iiqArr && iiqArr.length > 0) initOptions.lsValueInitialized = true;
  if (!iiqArr) iiqArr = [];
  if (iiqArr.length == 0) {
    iiqArr.push({
      'params': {
        'partner': -1,
        'group': 'U',
        'percentage': -1
      }
    })
  }
  if (iiqArr && iiqArr.length > 0) {
    if (iiqArr[0].params && iiqArr[0].params.partner && !isNaN(iiqArr[0].params.partner)) {
      initOptions.partner = iiqArr[0].params.partner;
      initOptions.userGroup = iiqArr[0].params.group || 'U';
      initOptions.userPercentage = iiqArr[0].params.percentage || '-1';

      initOptions.currentGroup = readData(GROUP_LS_KEY + '_' + initOptions.partner)
      initOptions.currentPercentage = readData(PRECENT_LS_KEY + '_' + initOptions.partner)
    }
  }
}

function initReadLsIds() {
  if (isNaN(initOptions.partner) || initOptions.partner == -1) return;
  try {
    initOptions.dataInLs = null;
    let iData = readData(FIRST_PARTY_DATA_KEY + '_' + initOptions.partner)
    if (iData) {
      initOptions.lsIdsInitialized = true;
      let pData = JSON.parse(iData);
      initOptions.dataInLs = pData.data;
      initOptions.eidl = pData.eidl || -1;
    }
  } catch (e) {
    logError(e)
  }
}

function bidWon(args) {
  if (!initOptions.lsValueInitialized) { initLsValues(); }
  if (initOptions.lsValueInitialized && !initOptions.lsIdsInitialized) { initReadLsIds(); }
  if (!initOptions.manualReport) { ajax(constructFulllUrl(preparePayload(args, true)), undefined, null, { method: 'GET' }); }

  logInfo('IIQ ANALYTICS -> BID WON')
}

function getRandom(start, end) {
  return Math.floor((Math.random() * (end - start + 1)) + start);
}

function preparePayload(data) {
  let result = getDefaultDataObject();

  result[PARAMS_NAMES.partnerId] = initOptions.partner;
  result[PARAMS_NAMES.prebidVersion] = prebidVersion;
  result[PARAMS_NAMES.refferer] = getRefferer();
  result[PARAMS_NAMES.userActualPercentage] = initOptions.userPercentage;

  if (initOptions.userGroup && initOptions.userGroup != '') { result[PARAMS_NAMES.ABTestingConfigurationSource] = 'group'; } else if (initOptions.userPercentage && !isNaN(initOptions.userPercentage)) { result[PARAMS_NAMES.ABTestingConfigurationSource] = 'percentage'; }

  result[PARAMS_NAMES.abPercentage] = initOptions.currentPercentage;
  result[PARAMS_NAMES.abTestGroup] = initOptions.currentGroup;

  result[PARAMS_NAMES.isInTestGroup] = initOptions.currentGroup == 'A';

  result[PARAMS_NAMES.agentId] = REPORTER_ID;

  fillPrebidEventData(data, result);

  fillEidsData(result);

  return result;
}

function fillEidsData(result) {
  if (initOptions.lsIdsInitialized) {
    result[PARAMS_NAMES.hadEidsInLocalStorage] = initOptions.eidl && initOptions.eidl > 0;
    result[PARAMS_NAMES.auctionEidsLegth] = initOptions.eidl || -1;
  }
}

function fillPrebidEventData(eventData, result) {
  if (eventData.bidderCode) { result.bidderCode = eventData.bidderCode; }
  if (eventData.cpm) { result.cpm = eventData.cpm; }
  if (eventData.currency) { result.currency = eventData.currency; }
  if (eventData.originalCpm) { result.originalCpm = eventData.originalCpm; }
  if (eventData.originalCurrency) { result.originalCurrency = eventData.originalCurrency; }
  if (eventData.status) { result.status = eventData.status; }
  if (eventData.auctionId) { result.prebidAuctionId = eventData.auctionId; }

  result.biddingPlatformId = 1;
  result.partnerAuctionId = 'BW';
}

function getDefaultDataObject() {
  return {
    'inbbl': false,
    'pbjsver': prebidVersion,
    'partnerAuctionId': 'BW',
    'reportSource': 'pbjs',
    'abPercentage': -1,
    'abGroup': 'U',
    'userPercentage': -1,
    'jsversion': JSVERSION,
    'partnerId': -1,
    'biddingPlatformId': 1,
    'idls': false,
    'ast': -1,
    'aeidln': -1
  }
}

function constructFulllUrl(data) {
  let report = []
  data = btoa(JSON.stringify(data))
  report.push(data)
  return defaultUrl + '?pid=' + initOptions.partner +
    '&mct=1' +
    ((iiqAnalyticsAnalyticsAdapter.initOptions && iiqAnalyticsAnalyticsAdapter.initOptions.fpid)
      ? '&iiqid=' + encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid) : '') +
    '&agid=' + REPORTER_ID +
    '&jsver=' + JSVERSION +
    '&source=pbjs' +
    '&payload=' + JSON.stringify(report)
}

function getRefferer() {
  return document.referrer;
}

iiqAnalyticsAnalyticsAdapter.originEnableAnalytics = iiqAnalyticsAnalyticsAdapter.enableAnalytics;

iiqAnalyticsAnalyticsAdapter.enableAnalytics = function (myConfig) {
  iiqAnalyticsAnalyticsAdapter.originEnableAnalytics(myConfig); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: iiqAnalyticsAnalyticsAdapter,
  code: MODULE_NAME
});

export default iiqAnalyticsAnalyticsAdapter;
