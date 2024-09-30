import { logInfo, logError, getWindowSelf, getWindowTop, getWindowLocation } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { config } from '../src/config.js';
import { EVENTS } from '../src/constants.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';
import { detectBrowser } from '../libraries/detectBrowserUtils/detectBrowserUtils.js';

const MODULE_NAME = 'iiqAnalytics'
const analyticsType = 'endpoint';
const defaultUrl = 'https://reports.intentiq.com/report';
const storage = getStorageManager({ moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_NAME });
const prebidVersion = '$prebid.version$';
export const REPORTER_ID = Date.now() + '_' + getRandom(0, 1000);

const FIRST_PARTY_KEY = '_iiq_fdata';
const FIRST_PARTY_DATA_KEY = '_iiq_fdata';
const JSVERSION = 0.2

const PARAMS_NAMES = {
  abTestGroup: 'abGroup',
  pbPauseUntil: 'pbPauseUntil',
  pbMonitoringEnabled: 'pbMonitoringEnabled',
  isInTestGroup: 'isInTestGroup',
  enhanceRequests: 'enhanceRequests',
  wasSubscribedForPrebid: 'wasSubscribedForPrebid',
  hadEids: 'hadEids',
  ABTestingConfigurationSource: 'ABTestingConfigurationSource',
  lateConfiguration: 'lateConfiguration',
  jsversion: 'jsversion',
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
  auctionEidsLength: 'aeidln',
  wasServerCalled: 'wsrvcll',
  referrer: 'vrref',
  isInBrowserBlacklist: 'inbbl',
  prebidVersion: 'pbjsver',
  partnerId: 'partnerId',
  firstPartyId: 'pcid'
};

let iiqAnalyticsAnalyticsAdapter = Object.assign(adapter({ defaultUrl, analyticsType }), {
  initOptions: {
    lsValueInitialized: false,
    partner: null,
    fpid: null,
    currentGroup: null,
    dataInLs: null,
    eidl: null,
    lsIdsInitialized: false,
    manualReport: false
  },
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

// Events needed
const {
  BID_WON
} = EVENTS;

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
  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized) return;
  let iiqArr = config.getConfig('userSync.userIds').filter(m => m.name == 'intentIqId');
  if (iiqArr && iiqArr.length > 0) iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized = true;
  if (!iiqArr) iiqArr = [];
  if (iiqArr.length == 0) {
    iiqArr.push({
      'params': {
        'partner': -1,
        'group': 'U'
      }
    })
  }
  if (iiqArr && iiqArr.length > 0) {
    if (iiqArr[0].params && iiqArr[0].params.partner && !isNaN(iiqArr[0].params.partner)) {
      iiqAnalyticsAnalyticsAdapter.initOptions.partner = iiqArr[0].params.partner;
    }
    iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList = typeof iiqArr[0].params.browserBlackList === 'string' ? iiqArr[0].params.browserBlackList.toLowerCase() : '';
  }
}

function initReadLsIds() {
  try {
    iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = null;
    iiqAnalyticsAnalyticsAdapter.initOptions.fpid = JSON.parse(readData(FIRST_PARTY_KEY));
    if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid) {
      iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup = iiqAnalyticsAnalyticsAdapter.initOptions.fpid.group;
    }
    let iData = readData(FIRST_PARTY_DATA_KEY + '_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner);
    if (iData) {
      iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized = true;
      let pData = JSON.parse(iData);
      iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = pData.data;
      iiqAnalyticsAnalyticsAdapter.initOptions.eidl = pData.eidl || -1;
    }
  } catch (e) {
    logError(e)
  }
}

function bidWon(args) {
  if (!iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized) { initLsValues(); }

  if (isNaN(iiqAnalyticsAnalyticsAdapter.initOptions.partner) || iiqAnalyticsAnalyticsAdapter.initOptions.partner == -1) return;

  const currentBrowserLowerCase = detectBrowser();
  if (iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList?.includes(currentBrowserLowerCase)) {
    logError('IIQ ANALYTICS -> Browser is in blacklist!');
    return;
  }

  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized && !iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized) { initReadLsIds(); }
  if (!iiqAnalyticsAnalyticsAdapter.initOptions.manualReport) {
    ajax(constructFullUrl(preparePayload(args, true)), undefined, null, { method: 'GET' });
  }

  logInfo('IIQ ANALYTICS -> BID WON')
}

function getRandom(start, end) {
  return Math.floor((Math.random() * (end - start + 1)) + start);
}

export function preparePayload(data) {
  let result = getDefaultDataObject();

  result[PARAMS_NAMES.partnerId] = iiqAnalyticsAnalyticsAdapter.initOptions.partner;
  result[PARAMS_NAMES.prebidVersion] = prebidVersion;
  result[PARAMS_NAMES.referrer] = getReferrer();

  result[PARAMS_NAMES.abTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup;

  result[PARAMS_NAMES.isInTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup == 'A';

  result[PARAMS_NAMES.agentId] = REPORTER_ID;
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pcid) result[PARAMS_NAMES.firstPartyId] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid)

  fillPrebidEventData(data, result);

  fillEidsData(result);

  return result;
}

function fillEidsData(result) {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized) {
    result[PARAMS_NAMES.hadEidsInLocalStorage] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl && iiqAnalyticsAnalyticsAdapter.initOptions.eidl > 0;
    result[PARAMS_NAMES.auctionEidsLength] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl || -1;
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
    'abGroup': 'U',
    'jsversion': JSVERSION,
    'partnerId': -1,
    'biddingPlatformId': 1,
    'idls': false,
    'ast': -1,
    'aeidln': -1
  }
}

function constructFullUrl(data) {
  let report = []
  data = btoa(JSON.stringify(data))
  report.push(data)
  return defaultUrl + '?pid=' + iiqAnalyticsAnalyticsAdapter.initOptions.partner +
    '&mct=1' +
    ((iiqAnalyticsAnalyticsAdapter.initOptions && iiqAnalyticsAnalyticsAdapter.initOptions.fpid)
      ? '&iiqid=' + encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid) : '') +
    '&agid=' + REPORTER_ID +
    '&jsver=' + JSVERSION +
    '&vrref=' + getReferrer() +
    '&source=pbjs' +
    '&payload=' + JSON.stringify(report)
}

export function getReferrer() {
  try {
    if (getWindowSelf() === getWindowTop()) {
      return getWindowLocation().href;
    } else {
      return getWindowTop().location.href;
    }
  } catch (error) {
    logError(`Error accessing location: ${error}`);
    return '';
  }
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
