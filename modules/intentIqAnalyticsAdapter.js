import { isPlainObject, logError, logInfo } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { EVENTS } from '../src/constants.js';
import { detectBrowser } from '../libraries/intentIqUtils/detectBrowserUtils.js';
import { appendSPData } from '../libraries/intentIqUtils/urlUtils.js';
import { appendVrrefAndFui, getReferrer } from '../libraries/intentIqUtils/getRefferer.js';
import { getCmpData } from '../libraries/intentIqUtils/getCmpData.js';
import {
  VERSION,
  PREBID,
  WITH_IIQ
} from '../libraries/intentIqConstants/intentIqConstants.js';
import { reportingServerAddress } from '../libraries/intentIqUtils/intentIqConfig.js';
import { handleAdditionalParams } from '../libraries/intentIqUtils/handleAdditionalParams.js';
import { gamPredictionReport } from '../libraries/intentIqUtils/gamPredictionReport.js';
import { defineABTestingGroup } from '../libraries/intentIqUtils/defineABTestingGroupUtils.js';

const MODULE_NAME = 'iiqAnalytics';
const analyticsType = 'endpoint';
const prebidVersion = '$prebid.version$';
export const REPORTER_ID = Date.now() + '_' + getRandom(0, 1000);
let globalName;
let identityGlobalName;
let alreadySubscribedOnGAM = false;
let reportList = {};
let cleanReportsID;
let iiqConfig;

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
  adType: 'adType',
  abTestUuid: 'abTestUuid',
};

const DEFAULT_URL = 'https://reports.intentiq.com/report';

const getDataForDefineURL = () => {
  const cmpData = getCmpData();
  const gdprDetected = cmpData.gdprString;

  return [iiqAnalyticsAnalyticsAdapter.initOptions.reportingServerAddress, gdprDetected];
};

const getDefaultInitOptions = () => {
  return {
    adapterConfigInitialized: false,
    partner: null,
    fpid: null,
    currentGroup: null,
    dataInLs: null,
    eidl: null,
    dataIdsInitialized: false,
    manualWinReportEnabled: false,
    domainName: null,
    siloEnabled: false,
    reportMethod: null,
    abPercentage: null,
    abTestUuid: null,
    additionalParams: null,
    reportingServerAddress: ''
  }
}

const iiqAnalyticsAnalyticsAdapter = Object.assign(adapter({ url: DEFAULT_URL, analyticsType }), {
  initOptions: getDefaultInitOptions(),
  track({ eventType, args }) {
    switch (eventType) {
      case BID_WON:
        bidWon(args);
        break;
      case BID_REQUESTED:
        if (!alreadySubscribedOnGAM && shouldSubscribeOnGAM()) {
          alreadySubscribedOnGAM = true;
          gamPredictionReport(iiqConfig?.gamObjectReference, bidWon);
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
  if (iiqAnalyticsAnalyticsAdapter.initOptions.adapterConfigInitialized) return;

  const options = config?.options || {}
  iiqConfig = options
  const { manualWinReportEnabled, gamPredictReporting, reportMethod, reportingServerAddress, adUnitConfig, partner, ABTestingConfigurationSource, browserBlackList, domainName, additionalParams } = options
  iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled =
            manualWinReportEnabled || false;
  iiqAnalyticsAnalyticsAdapter.initOptions.reportMethod = parseReportingMethod(reportMethod);
  iiqAnalyticsAnalyticsAdapter.initOptions.gamPredictReporting = typeof gamPredictReporting === 'boolean' ? gamPredictReporting : false;
  iiqAnalyticsAnalyticsAdapter.initOptions.reportingServerAddress = typeof reportingServerAddress === 'string' ? reportingServerAddress : '';
  iiqAnalyticsAnalyticsAdapter.initOptions.adUnitConfig = typeof adUnitConfig === 'number' ? adUnitConfig : 1;
  iiqAnalyticsAnalyticsAdapter.initOptions.configSource = ABTestingConfigurationSource;
  iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup = defineABTestingGroup(options);
  iiqAnalyticsAnalyticsAdapter.initOptions.idModuleConfigInitialized = true;
  iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList =
        typeof browserBlackList === 'string'
          ? browserBlackList.toLowerCase()
          : '';
  iiqAnalyticsAnalyticsAdapter.initOptions.domainName = domainName || '';
  iiqAnalyticsAnalyticsAdapter.initOptions.additionalParams = additionalParams || null;
  if (!partner) {
    logError('IIQ ANALYTICS -> partner ID is missing');
    iiqAnalyticsAnalyticsAdapter.initOptions.partner = -1
  } else iiqAnalyticsAnalyticsAdapter.initOptions.partner = partner
  defineGlobalVariableName();
  iiqAnalyticsAnalyticsAdapter.initOptions.adapterConfigInitialized = true
}

function receivePartnerData() {
  try {
    iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = null;
    const FPD = window[identityGlobalName]?.firstPartyData
    if (!window[identityGlobalName] || !FPD) {
      return false
    }
    iiqAnalyticsAnalyticsAdapter.initOptions.fpid = FPD
    const { partnerData, clientsHints = '', actualABGroup } = window[identityGlobalName]

    if (partnerData) {
      iiqAnalyticsAnalyticsAdapter.initOptions.dataIdsInitialized = true;
      iiqAnalyticsAnalyticsAdapter.initOptions.terminationCause = partnerData.terminationCause;
      iiqAnalyticsAnalyticsAdapter.initOptions.abTestUuid = partnerData.abTestUuid;
      iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = partnerData.data;
      iiqAnalyticsAnalyticsAdapter.initOptions.eidl = partnerData.eidl || -1;
      iiqAnalyticsAnalyticsAdapter.initOptions.clientType = partnerData.clientType || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.siteId = partnerData.siteId || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll = partnerData.wsrvcll || false;
      iiqAnalyticsAnalyticsAdapter.initOptions.rrtt = partnerData.rrtt || null;
    }

    if (actualABGroup) {
      iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup = actualABGroup;
    }
    iiqAnalyticsAnalyticsAdapter.initOptions.clientsHints = clientsHints;
  } catch (e) {
    logError(e);
    return false;
  }
}

function shouldSubscribeOnGAM() {
  if (!iiqConfig?.gamObjectReference || !isPlainObject(iiqConfig.gamObjectReference)) return false;
  const partnerData = window[identityGlobalName]?.partnerData

  if (partnerData) {
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

function bidWon(args, isReportExternal) {
  if (
    isNaN(iiqAnalyticsAnalyticsAdapter.initOptions.partner)
  ) {
    iiqAnalyticsAnalyticsAdapter.initOptions.partner = -1;
  }
  const currentBrowserLowerCase = detectBrowser();
  if (iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList?.includes(currentBrowserLowerCase)) {
    logError('IIQ ANALYTICS -> Browser is in blacklist!');
    return;
  }

  if (shouldSendReport(isReportExternal)) {
    const success = receivePartnerData();
    const preparedPayload = preparePayload(args);
    if (!preparedPayload) return false;
    if (success === false) {
      preparedPayload[PARAMS_NAMES.terminationCause] = -1
    }
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

  const partnerId = iiqConfig?.partner || 0;
  globalName = `intentIqAnalyticsAdapter_${partnerId}`;
  identityGlobalName = `iiq_identity_${partnerId}`

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
  result[PARAMS_NAMES.clientType] = iiqAnalyticsAnalyticsAdapter.initOptions.clientType;
  result[PARAMS_NAMES.siteId] = iiqAnalyticsAnalyticsAdapter.initOptions.siteId;
  result[PARAMS_NAMES.wasServerCalled] = iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll;
  result[PARAMS_NAMES.requestRtt] = iiqAnalyticsAnalyticsAdapter.initOptions.rrtt;
  result[PARAMS_NAMES.isInTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup === WITH_IIQ;

  if (iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup) {
    result[PARAMS_NAMES.abTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup;
  }
  result[PARAMS_NAMES.agentId] = REPORTER_ID;
  if (iiqAnalyticsAnalyticsAdapter.initOptions.abTestUuid) {
    result[PARAMS_NAMES.abTestUuid] = iiqAnalyticsAnalyticsAdapter.initOptions.abTestUuid;
  }
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pcid) {
    result[PARAMS_NAMES.firstPartyId] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid);
  }
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pid) {
    result[PARAMS_NAMES.profile] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pid);
  }
  if (iiqAnalyticsAnalyticsAdapter.initOptions.configSource) {
    result[PARAMS_NAMES.ABTestingConfigurationSource] = iiqAnalyticsAnalyticsAdapter.initOptions.configSource
  }
  prepareData(data, result);

  if (shouldSubscribeOnGAM()) {
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
  }

  fillEidsData(result);

  return result;
}

function fillEidsData(result) {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.dataIdsInitialized) {
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

iiqAnalyticsAnalyticsAdapter.originDisableAnalytics = iiqAnalyticsAnalyticsAdapter.disableAnalytics;
iiqAnalyticsAnalyticsAdapter.disableAnalytics = function() {
  globalName = undefined;
  identityGlobalName = undefined;
  alreadySubscribedOnGAM = false;
  reportList = {};
  cleanReportsID = undefined;
  iiqConfig = undefined;
  iiqAnalyticsAnalyticsAdapter.initOptions = getDefaultInitOptions()
  iiqAnalyticsAnalyticsAdapter.originDisableAnalytics()
};
adapterManager.registerAnalyticsAdapter({
  adapter: iiqAnalyticsAnalyticsAdapter,
  code: MODULE_NAME
});

export default iiqAnalyticsAnalyticsAdapter;
