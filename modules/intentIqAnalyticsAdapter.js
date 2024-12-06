import {logError, logInfo} from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {config} from '../src/config.js';
import {EVENTS} from '../src/constants.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';
import {detectBrowser} from '../libraries/intentIqUtils/detectBrowserUtils.js';
import {appendVrrefAndFui, getReferrer} from '../libraries/intentIqUtils/getRefferer.js';
import {getGppValue} from '../libraries/intentIqUtils/getGppValue.js';
import {CLIENT_HINTS_KEY, FIRST_PARTY_KEY, VERSION} from '../libraries/intentIqConstants/intentIqConstants.js';

const MODULE_NAME = 'iiqAnalytics'
const analyticsType = 'endpoint';
const defaultUrl = 'https://reports.intentiq.com/report';
const storage = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_NAME});
const prebidVersion = '$prebid.version$';
export const REPORTER_ID = Date.now() + '_' + getRandom(0, 1000);

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
  firstPartyId: 'pcid',
  placementId: 'placementId'
};

let iiqAnalyticsAnalyticsAdapter = Object.assign(adapter({defaultUrl, analyticsType}), {
  initOptions: {
    lsValueInitialized: false,
    partner: null,
    fpid: null,
    currentGroup: null,
    dataInLs: null,
    eidl: null,
    lsIdsInitialized: false,
    manualWinReportEnabled: false,
    domainName: null
  },
  track({eventType, args}) {
    switch (eventType) {
      case BID_WON:
        bidWon(args);
        break;
      case BID_REQUESTED:
        defineGlobalVariableName();
        break;
      default:
        break;
    }
  }
});

// Events needed
const {
  BID_WON,
  BID_REQUESTED
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
    iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled = iiqArr[0].params.manualWinReportEnabled || false;
    iiqAnalyticsAnalyticsAdapter.initOptions.domainName = iiqArr[0].params.domainName || '';
  }
}

function initReadLsIds() {
  try {
    iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = null;
    iiqAnalyticsAnalyticsAdapter.initOptions.fpid = JSON.parse(readData(FIRST_PARTY_KEY));
    if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid) {
      iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup = iiqAnalyticsAnalyticsAdapter.initOptions.fpid.group;
    }
    const partnerData = readData(FIRST_PARTY_KEY + '_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner);
    const clientsHints = readData(CLIENT_HINTS_KEY) || '';

    if (partnerData) {
      iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized = true;
      let pData = JSON.parse(partnerData);
      iiqAnalyticsAnalyticsAdapter.initOptions.terminationCause = pData.terminationCause
      iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = pData.data;
      iiqAnalyticsAnalyticsAdapter.initOptions.eidl = pData.eidl || -1;
      iiqAnalyticsAnalyticsAdapter.initOptions.ct = pData.ct || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.siteId = pData.siteId || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll = pData.wsrvcll || false;
      iiqAnalyticsAnalyticsAdapter.initOptions.rrtt = pData.rrtt || null;
    }

    iiqAnalyticsAnalyticsAdapter.initOptions.clientsHints = clientsHints
  } catch (e) {
    logError(e)
  }
}

function bidWon(args, isReportExternal) {
  if (!iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized) {
    initLsValues();
  }

  if (isNaN(iiqAnalyticsAnalyticsAdapter.initOptions.partner) || iiqAnalyticsAnalyticsAdapter.initOptions.partner == -1) return;

  const currentBrowserLowerCase = detectBrowser();
  if (iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList?.includes(currentBrowserLowerCase)) {
    logError('IIQ ANALYTICS -> Browser is in blacklist!');
    return;
  }

  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized && !iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized) {
    initReadLsIds();
  }
  if ((isReportExternal && iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled) || (!isReportExternal && !iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled)) {
    ajax(constructFullUrl(preparePayload(args, true)), undefined, null, {method: 'GET'});
    logInfo('IIQ ANALYTICS -> BID WON')
    return true;
  }
  return false;
}

function defineGlobalVariableName() {
  function reportExternalWin(args) {
    return bidWon(args, true)
  }

  let partnerId = 0
  const userConfig = config.getConfig('userSync.userIds')

  if (userConfig) {
    const iiqArr = userConfig.filter(m => m.name == 'intentIqId');
    if (iiqArr.length) partnerId = iiqArr[0].params.partner
  }

  window[`intentIqAnalyticsAdapter_${partnerId}`] = {reportExternalWin: reportExternalWin}
}

function getRandom(start, end) {
  return Math.floor((Math.random() * (end - start + 1)) + start);
}

export function preparePayload(data) {
  let result = getDefaultDataObject();
  readData(FIRST_PARTY_KEY + '_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner);
  result[PARAMS_NAMES.partnerId] = iiqAnalyticsAnalyticsAdapter.initOptions.partner;
  result[PARAMS_NAMES.prebidVersion] = prebidVersion;
  result[PARAMS_NAMES.referrer] = getReferrer();
  result[PARAMS_NAMES.terminationCause] = iiqAnalyticsAnalyticsAdapter.initOptions.terminationCause;
  result[PARAMS_NAMES.abTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup;
  result[PARAMS_NAMES.clientType] = iiqAnalyticsAnalyticsAdapter.initOptions.ct;
  result[PARAMS_NAMES.siteId] = iiqAnalyticsAnalyticsAdapter.initOptions.siteId;
  result[PARAMS_NAMES.wasServerCalled] = iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll;
  result[PARAMS_NAMES.requestRtt] = iiqAnalyticsAnalyticsAdapter.initOptions.rrtt;

  result[PARAMS_NAMES.isInTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup == 'A';

  result[PARAMS_NAMES.agentId] = REPORTER_ID;
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pcid) result[PARAMS_NAMES.firstPartyId] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid);
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pid) result[PARAMS_NAMES.profile] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pid)

  prepareData(data, result);

  fillEidsData(result);

  return result;
}

function fillEidsData(result) {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized) {
    result[PARAMS_NAMES.hadEidsInLocalStorage] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl && iiqAnalyticsAnalyticsAdapter.initOptions.eidl > 0;
    result[PARAMS_NAMES.auctionEidsLength] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl || -1;
  }
}

function prepareData (data, result) {
  if (data.bidderCode) {
    result.bidderCode = data.bidderCode;
  }
  if (data.cpm) {
    result.cpm = data.cpm;
  }
  if (data.currency) {
    result.currency = data.currency;
  }
  if (data.originalCpm) {
    result.originalCpm = data.originalCpm;
  }
  if (data.originalCurrency) {
    result.originalCurrency = data.originalCurrency;
  }
  if (data.status) {
    result.status = data.status;
  }
  if (data.auctionId) {
    result.prebidAuctionId = data.auctionId;
  }
  if (data.placementId) {
    result.placementId = data.placementId;
  } else {
    // Simplified placementId determination
    let placeIdFound = false;
    if (data.params && Array.isArray(data.params)) {
      for (let i = 0; i < data.params.length; i++) {
        const param = data.params[i];
        if (param.placementId) {
          result.placementId = param.placementId;
          placeIdFound = true;
          break;
        }
      }
    }
    if (!placeIdFound && data.adUnitCode) {
      result.placementId = data.adUnitCode;
    }
  }

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
    'jsversion': VERSION,
    'partnerId': -1,
    'biddingPlatformId': 1,
    'idls': false,
    'ast': -1,
    'aeidln': -1
  }
}

function constructFullUrl(data) {
  let report = [];
  data = btoa(JSON.stringify(data));
  report.push(data);
  const gppData = getGppValue();

  let url = defaultUrl + '?pid=' + iiqAnalyticsAnalyticsAdapter.initOptions.partner +
    '&mct=1' +
    ((iiqAnalyticsAnalyticsAdapter.initOptions?.fpid)
      ? '&iiqid=' + encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid) : '') +
    '&agid=' + REPORTER_ID +
    '&jsver=' + VERSION +
    '&source=pbjs' +
    '&payload=' + JSON.stringify(report) +
    '&uh=' + iiqAnalyticsAnalyticsAdapter.initOptions.clientsHints +
    (gppData.gppString ? '&gpp=' + encodeURIComponent(gppData.gppString) : '');

  url = appendVrrefAndFui(url, iiqAnalyticsAnalyticsAdapter.initOptions.domainName);
  return url;
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
