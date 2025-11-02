import { isPlainObject, logError, logInfo } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { config } from '../src/config.js';
import { EVENTS } from '../src/constants.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';
import { detectBrowser } from '../libraries/intentIqUtils/detectBrowserUtils.js';
import { appendSPData } from '../libraries/intentIqUtils/urlUtils.js';
import { appendVrrefAndFui, getReferrer } from '../libraries/intentIqUtils/getRefferer.js';
import { getCmpData } from '../libraries/intentIqUtils/getCmpData.js';
import {
  CLIENT_HINTS_KEY,
  FIRST_PARTY_KEY,
  VERSION,
  PREBID
} from '../libraries/intentIqConstants/intentIqConstants.js';
import { readData, defineStorageType } from '../libraries/intentIqUtils/storageUtils.js';
import { reportingServerAddress } from '../libraries/intentIqUtils/intentIqConfig.js';
import { handleAdditionalParams } from '../libraries/intentIqUtils/handleAdditionalParams.js';
import { gamPredictionReport } from '../libraries/intentIqUtils/gamPredictionReport.js';

const MODULE_NAME = 'iiqAnalytics';
const analyticsType = 'endpoint';
const storage = getStorageManager({
  moduleType: MODULE_TYPE_ANALYTICS,
  moduleName: MODULE_NAME
});
const prebidVersion = '$prebid.version$';
export const REPORTER_ID = Date.now() + '_' + getRandom(0, 1000);
const allowedStorage = defineStorageType(config.enabledStorageTypes);
let globalName;
let alreadySubscribedOnGAM = false;
let reportList = {};
let cleanReportsID;

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
  placementId: 'placementId',
  adType: 'adType'
};

function getIntentIqConfig() {
  return config.getConfig('userSync.userIds')?.find((m) => m.name === 'intentIqId');
}

const DEFAULT_URL = 'https://reports.intentiq.com/report';

const getDataForDefineURL = () => {
  const cmpData = getCmpData();
  const gdprDetected = cmpData.gdprString;

  return [iiqAnalyticsAnalyticsAdapter.initOptions.reportingServerAddress, gdprDetected];
};

const iiqAnalyticsAnalyticsAdapter = Object.assign(adapter({ url: DEFAULT_URL, analyticsType }), {
  initOptions: {
    lsValueInitialized: false,
    partner: null,
    fpid: null,
    currentGroup: null,
    dataInLs: null,
    eidl: null,
    lsIdsInitialized: false,
    manualWinReportEnabled: false,
    domainName: null,
    siloEnabled: false,
    reportMethod: null,
    additionalParams: null,
    reportingServerAddress: ''
  },
  track({ eventType, args }) {
    switch (eventType) {
      case BID_WON:
        bidWon(args);
        break;
      case BID_REQUESTED:
        checkAndInitConfig();
        defineGlobalVariableName();
        if (!alreadySubscribedOnGAM && shouldSubscribeOnGAM()) {
          alreadySubscribedOnGAM = true;
          const iiqConfig = getIntentIqConfig();
          gamPredictionReport(iiqConfig?.params?.gamObjectReference, bidWon);
        }
        break;
      default:
        break;
    }
  }
});

// Events needed
const { BID_WON, BID_REQUESTED } = EVENTS;

function initAdapterConfig(config) {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized) return;
  const iiqIdSystemConfig = getIntentIqConfig();

  if (iiqIdSystemConfig) {
    const { manualWinReportEnabled, gamPredictReporting, reportMethod, reportingServerAddress: reportEndpoint, adUnitConfig } = config?.options || {}
    iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized = true;
    iiqAnalyticsAnalyticsAdapter.initOptions.partner =
            iiqIdSystemConfig.params?.partner && !isNaN(iiqIdSystemConfig.params.partner) ? iiqIdSystemConfig.params.partner : -1;

    iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList =
            typeof iiqIdSystemConfig.params?.browserBlackList === 'string'
              ? iiqIdSystemConfig.params.browserBlackList.toLowerCase()
              : '';
    iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled =
            manualWinReportEnabled || false;
    iiqAnalyticsAnalyticsAdapter.initOptions.domainName = iiqIdSystemConfig.params?.domainName || '';
    iiqAnalyticsAnalyticsAdapter.initOptions.siloEnabled =
            typeof iiqIdSystemConfig.params?.siloEnabled === 'boolean' ? iiqIdSystemConfig.params.siloEnabled : false;
    iiqAnalyticsAnalyticsAdapter.initOptions.reportMethod = parseReportingMethod(reportMethod);
    iiqAnalyticsAnalyticsAdapter.initOptions.additionalParams = iiqIdSystemConfig.params?.additionalParams || null;
    iiqAnalyticsAnalyticsAdapter.initOptions.gamPredictReporting = typeof gamPredictReporting === 'boolean' ? gamPredictReporting : false;
    iiqAnalyticsAnalyticsAdapter.initOptions.reportingServerAddress = typeof reportEndpoint === 'string' ? reportEndpoint : '';
    iiqAnalyticsAnalyticsAdapter.initOptions.adUnitConfig = typeof adUnitConfig === 'number' ? adUnitConfig : 1;
  } else {
    logError('IIQ ANALYTICS -> there is no initialized intentIqIdSystem module')
    iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized = false;
    iiqAnalyticsAnalyticsAdapter.initOptions.partner = -1;
    iiqAnalyticsAnalyticsAdapter.initOptions.reportMethod = 'GET';
  }
}

function initReadLsIds() {
  try {
    iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = null;
    iiqAnalyticsAnalyticsAdapter.initOptions.fpid = JSON.parse(
      readData(
                `${FIRST_PARTY_KEY}${
                    iiqAnalyticsAnalyticsAdapter.initOptions.siloEnabled
                        ? '_p_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner
                        : ''
                }`,
                allowedStorage,
                storage
      )
    );
    if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid) {
      iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup = iiqAnalyticsAnalyticsAdapter.initOptions.fpid.group;
    }
    const partnerData = readData(
      FIRST_PARTY_KEY + '_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner,
      allowedStorage,
      storage
    );
    const clientsHints = readData(CLIENT_HINTS_KEY, allowedStorage, storage) || '';

    if (partnerData) {
      iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized = true;
      const pData = JSON.parse(partnerData);
      iiqAnalyticsAnalyticsAdapter.initOptions.terminationCause = pData.terminationCause;
      iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = pData.data;
      iiqAnalyticsAnalyticsAdapter.initOptions.eidl = pData.eidl || -1;
      iiqAnalyticsAnalyticsAdapter.initOptions.clientType = pData.clientType || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.siteId = pData.siteId || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll = pData.wsrvcll || false;
      iiqAnalyticsAnalyticsAdapter.initOptions.rrtt = pData.rrtt || null;
    }

    iiqAnalyticsAnalyticsAdapter.initOptions.clientsHints = clientsHints;
  } catch (e) {
    logError(e);
  }
}

function shouldSubscribeOnGAM() {
  const iiqConfig = getIntentIqConfig();
  if (!iiqConfig?.params?.gamObjectReference || !isPlainObject(iiqConfig.params.gamObjectReference)) return false;
  const partnerDataFromLS = readData(
    FIRST_PARTY_KEY + '_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner,
    allowedStorage,
    storage
  );

  if (partnerDataFromLS) {
    const partnerData = JSON.parse(partnerDataFromLS);
    return partnerData.gpr || (!('gpr' in partnerData) && iiqAnalyticsAnalyticsAdapter.initOptions.gamPredictReporting);
  }
  return false;
}

function shouldSendReport(isReportExternal) {
  return (
    (isReportExternal &&
            iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled &&
            !shouldSubscribeOnGAM()) ||
        (!isReportExternal && !iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled)
  );
}

export function restoreReportList() {
  reportList = {};
}

function checkAndInitConfig() {
  if (!iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized) {
    initAdapterConfig();
  }
}

function bidWon(args, isReportExternal) {
  checkAndInitConfig();

  if (
    isNaN(iiqAnalyticsAnalyticsAdapter.initOptions.partner) ||
            iiqAnalyticsAnalyticsAdapter.initOptions.partner === -1
  ) {
    return;
  }
  const currentBrowserLowerCase = detectBrowser();
  if (iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList?.includes(currentBrowserLowerCase)) {
    logError('IIQ ANALYTICS -> Browser is in blacklist!');
    return;
  }

  if (
    iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized &&
            !iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized
  ) {
    initReadLsIds();
  }
  if (shouldSendReport(isReportExternal)) {
    const preparedPayload = preparePayload(args, true);
    if (!preparedPayload) return false;
    const { url, method, payload } = constructFullUrl(preparedPayload);
    if (method === 'POST') {
      ajax(url, undefined, payload, {
        method,
        contentType: 'application/x-www-form-urlencoded'
      });
    } else {
      ajax(url, undefined, null, { method });
    }
    logInfo('IIQ ANALYTICS -> BID WON');
    return true;
  }
  return false;
}

function parseReportingMethod(reportMethod) {
  if (typeof reportMethod === 'string') {
    switch (reportMethod.toUpperCase()) {
      case 'GET':
        return 'GET';
      case 'POST':
        return 'POST';
      default:
        return 'GET';
    }
  }
  return 'GET';
}

function defineGlobalVariableName() {
  function reportExternalWin(args) {
    return bidWon(args, true);
  }

  const iiqConfig = getIntentIqConfig();
  const partnerId = iiqConfig?.params?.partner || 0;
  globalName = `intentIqAnalyticsAdapter_${partnerId}`;

  window[globalName] = { reportExternalWin };
}

function getRandom(start, end) {
  return Math.floor(Math.random() * (end - start + 1) + start);
}

export function preparePayload(data) {
  const result = getDefaultDataObject();

  result[PARAMS_NAMES.partnerId] = iiqAnalyticsAnalyticsAdapter.initOptions.partner;
  result[PARAMS_NAMES.prebidVersion] = prebidVersion;
  result[PARAMS_NAMES.referrer] = getReferrer();
  result[PARAMS_NAMES.terminationCause] = iiqAnalyticsAnalyticsAdapter.initOptions.terminationCause;
  result[PARAMS_NAMES.abTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup;
  result[PARAMS_NAMES.clientType] = iiqAnalyticsAnalyticsAdapter.initOptions.clientType;
  result[PARAMS_NAMES.siteId] = iiqAnalyticsAnalyticsAdapter.initOptions.siteId;
  result[PARAMS_NAMES.wasServerCalled] = iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll;
  result[PARAMS_NAMES.requestRtt] = iiqAnalyticsAnalyticsAdapter.initOptions.rrtt;

  result[PARAMS_NAMES.isInTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup === 'A';

  result[PARAMS_NAMES.agentId] = REPORTER_ID;
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pcid) {
    result[PARAMS_NAMES.firstPartyId] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid);
  }
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pid) {
    result[PARAMS_NAMES.profile] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pid);
  }
  prepareData(data, result);

  if (!reportList[result.placementId] || !reportList[result.placementId][result.prebidAuctionId]) {
    reportList[result.placementId] = reportList[result.placementId]
      ? { ...reportList[result.placementId], [result.prebidAuctionId]: 1 }
      : { [result.prebidAuctionId]: 1 };
    cleanReportsID = setTimeout(() => {
      if (cleanReportsID) clearTimeout(cleanReportsID);
      restoreReportList();
    }, 1500); // clear object in 1.5 second after defining reporting list
  } else {
    logError('Duplication detected, report will be not sent');
    return;
  }

  fillEidsData(result);

  return result;
}

function fillEidsData(result) {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized) {
    result[PARAMS_NAMES.hadEidsInLocalStorage] =
            iiqAnalyticsAnalyticsAdapter.initOptions.eidl && iiqAnalyticsAnalyticsAdapter.initOptions.eidl > 0;
    result[PARAMS_NAMES.auctionEidsLength] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl || -1;
  }
}

function prepareData(data, result) {
  const adTypeValue = data.adType || data.mediaType;

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

  result.prebidAuctionId = data.auctionId || data.prebidAuctionId;

  if (adTypeValue) {
    result[PARAMS_NAMES.adType] = adTypeValue;
  }

  switch (iiqAnalyticsAnalyticsAdapter.initOptions.adUnitConfig) {
    case 1:
      // adUnitCode or placementId
      result.placementId = data.adUnitCode || extractPlacementId(data) || '';
      break;
    case 2:
      // placementId or adUnitCode
      result.placementId = extractPlacementId(data) || data.adUnitCode || '';
      break;
    case 3:
      // Only adUnitCode
      result.placementId = data.adUnitCode || '';
      break;
    case 4:
      // Only placementId
      result.placementId = extractPlacementId(data) || '';
      break;
    default:
      // Default (like in case #1)
      result.placementId = data.adUnitCode || extractPlacementId(data) || '';
  }

  result.biddingPlatformId = data.biddingPlatformId || 1;
  result.partnerAuctionId = 'BW';
}

function extractPlacementId(data) {
  if (data.placementId) {
    return data.placementId;
  }
  if (data.params && Array.isArray(data.params)) {
    for (let i = 0; i < data.params.length; i++) {
      if (data.params[i].placementId) {
        return data.params[i].placementId;
      }
    }
  }
  return null;
}

function getDefaultDataObject() {
  return {
    inbbl: false,
    pbjsver: prebidVersion,
    partnerAuctionId: 'BW',
    reportSource: 'pbjs',
    abGroup: 'U',
    jsversion: VERSION,
    partnerId: -1,
    biddingPlatformId: 1,
    idls: false,
    ast: -1,
    aeidln: -1
  };
}

function constructFullUrl(data) {
  const report = [];
  const reportMethod = iiqAnalyticsAnalyticsAdapter.initOptions.reportMethod;
  const currentBrowserLowerCase = detectBrowser();
  data = btoa(JSON.stringify(data));
  report.push(data);

  const cmpData = getCmpData();
  const baseUrl = reportingServerAddress(...getDataForDefineURL());

  let url =
        baseUrl +
        '?pid=' +
        iiqAnalyticsAnalyticsAdapter.initOptions.partner +
        '&mct=1' +
        (iiqAnalyticsAnalyticsAdapter.initOptions?.fpid
          ? '&iiqid=' + encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid)
          : '') +
        '&agid=' +
        REPORTER_ID +
        '&jsver=' +
        VERSION +
        '&source=' +
        PREBID +
        '&uh=' +
        encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.clientsHints) +
        (cmpData.uspString ? '&us_privacy=' + encodeURIComponent(cmpData.uspString) : '') +
        (cmpData.gppString ? '&gpp=' + encodeURIComponent(cmpData.gppString) : '') +
        (cmpData.gdprString ? '&gdpr_consent=' + encodeURIComponent(cmpData.gdprString) + '&gdpr=1' : '&gdpr=0');
  url = appendSPData(url, iiqAnalyticsAnalyticsAdapter.initOptions.fpid);
  url = appendVrrefAndFui(url, iiqAnalyticsAnalyticsAdapter.initOptions.domainName);

  if (reportMethod === 'POST') {
    return { url, method: 'POST', payload: JSON.stringify(report) };
  }
  url += '&payload=' + encodeURIComponent(JSON.stringify(report));
  url = handleAdditionalParams(
    currentBrowserLowerCase,
    url,
    2,
    iiqAnalyticsAnalyticsAdapter.initOptions.additionalParams
  );
  return { url, method: 'GET' };
}

iiqAnalyticsAnalyticsAdapter.originEnableAnalytics = iiqAnalyticsAnalyticsAdapter.enableAnalytics;

iiqAnalyticsAnalyticsAdapter.enableAnalytics = function (myConfig) {
  iiqAnalyticsAnalyticsAdapter.originEnableAnalytics(myConfig); // call the base class function
  initAdapterConfig(myConfig)
};
adapterManager.registerAnalyticsAdapter({
  adapter: iiqAnalyticsAnalyticsAdapter,
  code: MODULE_NAME
});

export default iiqAnalyticsAnalyticsAdapter;
