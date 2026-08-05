import { isPlainObject, logError, logInfo } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';
import { EVENTS } from '../src/constants.js';
import { detectBrowser } from '../libraries/intentIqUtils/detectBrowserUtils.ts';
import { appendSPData } from '../libraries/intentIqUtils/urlUtils.ts';
import { appendVrrefAndFui, getCurrentUrl, getRelevantRefferer } from '../libraries/intentIqUtils/getRefferer.ts';
import { getCmpData, areCmpValuesEqual, isValidValue } from '../libraries/intentIqUtils/getCmpData.ts';
import { getUnitPosition } from '../libraries/intentIqUtils/getUnitPosition.ts';
import {
  VERSION,
  PREBID,
  WITH_IIQ
} from '../libraries/intentIqConstants/intentIqConstants.ts';
import { reportingServerAddress } from '../libraries/intentIqUtils/intentIqConfig.ts';
import { handleAdditionalParams } from '../libraries/intentIqUtils/handleAdditionalParams.ts';
import { gamPredictionReport } from '../libraries/intentIqUtils/gamPredictionReport.ts';
import { defineABTestingGroup, IntentIqABConfigSource } from '../libraries/intentIqUtils/defineABTestingGroupUtils.ts';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * Payload passed to `window.intentIqAnalyticsAdapter_<partnerId>.reportExternalWin()`.
 * Use this when Prebid is NOT the winning bidding platform (e.g. Amazon TAM, GAM).
 */
export interface IiqExternalWinData {
  /**
   * Platform that rendered this impression.
   * 1 = Prebid, 2 = Amazon, 3 = Google, 4 = Open RTB / local Prebid server.
   */
  biddingPlatformId: 1 | 2 | 3 | 4;

  /**
   * Unified auction identifier when running multiple auction solutions.
   */
  partnerAuctionId?: string;

  /**
   * Name of the bidder that won the auction as reported by the platform.
   */
  bidderCode: string;

  /**
   * Prebid auction ID. Leave undefined when Prebid is not the platform.
   */
  prebidAuctionId?: string;

  /**
   * CPM received from the demand-side auction, before any floor adjustments.
   */
  cpm: number;

  /**
   * ISO 4217 currency code for `cpm`, e.g. `'USD'`.
   */
  currency: string;

  /**
   * Pre-adjustment CPM. Leave undefined when Prebid is not the platform.
   */
  originalCpm?: number;

  /**
   * Currency of `originalCpm`. Leave undefined when Prebid is not the platform.
   */
  originalCurrency?: string;

  /**
   * Impression status. Leave undefined when Prebid is not the platform.
   */
  status?: string;

  /**
   * Unique identifier of the ad unit that showed this ad.
   */
  placementId?: string;

  /**
   * Type of ad served.
   */
  adType?: 'banner' | 'video' | 'native' | 'audio';
}

/**
 * Options passed to `pbjs.enableAnalytics({ provider: 'iiqAnalytics', options: { … } })`.
 */
export interface IntentIqAnalyticsAdapterOptions {
  /**
   * Partner ID assigned by IntentIQ. Required.
   */
  partner: number;

  /**
   * Set to `true` to allow manual win reporting via
   * `window.intentIqAnalyticsAdapter_<partnerId>.reportExternalWin()`.
   * Defaults to `false`.
   */
  manualWinReportEnabled?: boolean;

  /**
   * Enable GAM predict-score reporting. Defaults to `false`.
   */
  gamPredictReporting?: boolean;

  /**
   * HTTP method used to send reports. Defaults to `'GET'`.
   */
  reportMethod?: 'GET' | 'POST';

  /**
   * Override for the IntentIQ reporting server base URL.
   */
  reportingServerAddress?: string;

  /**
   * Geo-region routing hint for the reporting server.
   */
  region?: string;

  /**
   * Controls how the `placementId` field in reports is populated:
   * 1 = adUnitCode then placementId (default)
   * 2 = placementId then adUnitCode
   * 3 = adUnitCode only
   * 4 = placementId only
   */
  adUnitConfig?: 1 | 2 | 3 | 4;

  /**
   * Determines how the A/B test group is assigned. Defaults to `'IIQServer'`.
   */
  ABTestingConfigurationSource?: IntentIqABConfigSource;

  /**
   * Explicit A/B group override. Only used when
   * `ABTestingConfigurationSource` is `'group'`.
   */
  group?: 'A' | 'B';

  /**
   * Percentage of users placed in the WITH_IIQ cohort (0–100). Defaults to 95.
   */
  abPercentage?: number;

  /**
   * Comma-separated list of browser names (lowercase) excluded from reporting,
   * e.g. `'chrome,safari'`.
   */
  browserBlackList?: string;

  /**
   * Publisher domain name appended to report URLs.
   */
  domainName?: string;

  /**
   * Freeform key-value pairs appended to every report URL.
   */
  additionalParams?: Record<string, string | number | boolean>;

  /**
   * When `true`, first-party data is stored under a partner-specific key.
   */
  siloEnabled?: boolean;

  /**
   * Reference to the GAM `googletag.pubads()` object for predict-score
   * reporting.
   */
  gamObjectReference?: Record<string, unknown>;
}

const MODULE_NAME = 'iiqAnalytics' as const;
const analyticsType = 'endpoint' as const;
const prebidVersion = '$prebid.version$';
const pbjs: any = getGlobal();
export const REPORTER_ID = Date.now() + '_' + getRandom(0, 1000);
let globalName: string | undefined;
let identityGlobalName: string | undefined;
let alreadySubscribedOnGAM = false;
let reportList: Record<string, Record<string, number>> = {};
let cleanReportsID: ReturnType<typeof setTimeout> | undefined;
let iiqConfig: any;

const PARAMS_NAMES: Record<string, string> = {
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
  abPercentage: 'abPercentage',
  userPercentage: 'userPercentage',
};

const DEFAULT_URL = 'https://reports.intentiq.com/report';

const getDataForDefineURL = () => {
  return [iiqAnalyticsAnalyticsAdapter.initOptions.reportingServerAddress, iiqAnalyticsAnalyticsAdapter.initOptions.region];
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
    userPercentage: null,
    abTestUuid: null,
    additionalParams: null,
    reportingServerAddress: '',
    region: ''
  };
};

const iiqAnalyticsAnalyticsAdapter: any = Object.assign(adapter({ url: DEFAULT_URL, analyticsType }), {
  initOptions: getDefaultInitOptions(),
  track({ eventType, args }: { eventType: string; args: any }) {
    switch (eventType) {
      case BID_WON:
        bidWon(args);
        break;
      case BID_REQUESTED: {
        if (!alreadySubscribedOnGAM && shouldSubscribeOnGAM()) {
          alreadySubscribedOnGAM = true;
          gamPredictionReport(iiqConfig?.gamObjectReference, bidWon);
        }
        const fpdFromGlobalObject = (window as any)[identityGlobalName as string]?.firstPartyData;
        if (fpdFromGlobalObject) {
          const currentCmpData = getCmpData();
          const hasCmpMismatch = ['gdprString', 'gppString', 'uspString'].some((field: string) =>
            !areCmpValuesEqual(fpdFromGlobalObject[field], currentCmpData[field])
          );
          if (hasCmpMismatch) {
            pbjs.refreshUserIds({ submoduleNames: ['intentIqId'] });
          }
        }
        break;
      }
      default:
        break;
    }
  }
});

// Events needed
const { BID_WON, BID_REQUESTED } = EVENTS;

function initAdapterConfig(config: any): void {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.adapterConfigInitialized) return;

  const options = config?.options || {};
  iiqConfig = options;
  const { manualWinReportEnabled, gamPredictReporting, reportMethod, reportingServerAddress, region, adUnitConfig, partner, ABTestingConfigurationSource, browserBlackList, domainName, additionalParams } = options;
  iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled =
            manualWinReportEnabled || false;
  iiqAnalyticsAnalyticsAdapter.initOptions.reportMethod = parseReportingMethod(reportMethod);
  iiqAnalyticsAnalyticsAdapter.initOptions.gamPredictReporting = typeof gamPredictReporting === 'boolean' ? gamPredictReporting : false;
  iiqAnalyticsAnalyticsAdapter.initOptions.reportingServerAddress = typeof reportingServerAddress === 'string' ? reportingServerAddress : '';
  iiqAnalyticsAnalyticsAdapter.initOptions.region = typeof region === 'string' ? region : '';
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
    iiqAnalyticsAnalyticsAdapter.initOptions.partner = -1;
  } else iiqAnalyticsAnalyticsAdapter.initOptions.partner = partner;
  defineGlobalVariableName();
  iiqAnalyticsAnalyticsAdapter.initOptions.adapterConfigInitialized = true;
}

function receivePartnerData(): boolean | void {
  try {
    iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = null;
    const FPD = (window as any)[identityGlobalName as string]?.firstPartyData;
    if (!(window as any)[identityGlobalName as string] || !FPD) {
      return false;
    }
    iiqAnalyticsAnalyticsAdapter.initOptions.fpid = FPD;
    const { partnerData, clientHints = '', actualABGroup } = (window as any)[identityGlobalName as string];

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
    iiqAnalyticsAnalyticsAdapter.initOptions.clientHints = clientHints;

    const { abPercentage, userProvidedAbPercentage } = (window as any)[identityGlobalName as string];
    if (abPercentage !== undefined) {
      iiqAnalyticsAnalyticsAdapter.initOptions.abPercentage = abPercentage;
    }
    iiqAnalyticsAnalyticsAdapter.initOptions.userPercentage = userProvidedAbPercentage;
  } catch (e) {
    logError(e);
    return false;
  }
}

function shouldSubscribeOnGAM(): boolean {
  if (!iiqConfig?.gamObjectReference || !isPlainObject(iiqConfig.gamObjectReference)) return false;
  const partnerData = (window as any)[identityGlobalName as string]?.partnerData;

  if (partnerData) {
    return partnerData.gpr || (!('gpr' in partnerData) && iiqAnalyticsAnalyticsAdapter.initOptions.gamPredictReporting);
  }
  return false;
}

function shouldSendReport(isReportExternal?: boolean): boolean {
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

function bidWon(args: any, isReportExternal?: boolean): boolean | void {
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
      preparedPayload[PARAMS_NAMES.terminationCause] = -1;
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

function parseReportingMethod(reportMethod: unknown): 'GET' | 'POST' {
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

function defineGlobalVariableName(): void {
  function reportExternalWin(args: any): boolean | void {
    return bidWon(args, true);
  }

  const partnerId = iiqConfig?.partner || 0;
  globalName = `intentIqAnalyticsAdapter_${partnerId}`;
  identityGlobalName = `iiq_identity_${partnerId}`;

  (window as any)[globalName as string] = { reportExternalWin };
}

function getRandom(start: number, end: number): number {
  return Math.floor(Math.random() * (end - start + 1) + start);
}

export function preparePayload(data: any): Record<string, any> | void {
  const result = getDefaultDataObject();
  const fullUrl = getCurrentUrl();
  result[PARAMS_NAMES.partnerId] = iiqAnalyticsAnalyticsAdapter.initOptions.partner;
  result[PARAMS_NAMES.prebidVersion] = prebidVersion;
  result[PARAMS_NAMES.referrer] = getRelevantRefferer(iiqAnalyticsAnalyticsAdapter.initOptions.domainName, fullUrl);
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
    result[PARAMS_NAMES.ABTestingConfigurationSource] = iiqAnalyticsAnalyticsAdapter.initOptions.configSource;
  }
  if (iiqAnalyticsAnalyticsAdapter.initOptions.abPercentage !== null) {
    result[PARAMS_NAMES.abPercentage] = iiqAnalyticsAnalyticsAdapter.initOptions.abPercentage;
  }
  if (iiqAnalyticsAnalyticsAdapter.initOptions.userPercentage !== undefined && iiqAnalyticsAnalyticsAdapter.initOptions.userPercentage !== null) {
    result[PARAMS_NAMES.userPercentage] = iiqAnalyticsAnalyticsAdapter.initOptions.userPercentage;
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

function fillEidsData(result: Record<string, any>): void {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.dataIdsInitialized) {
    result[PARAMS_NAMES.hadEidsInLocalStorage] =
            iiqAnalyticsAnalyticsAdapter.initOptions.eidl && iiqAnalyticsAnalyticsAdapter.initOptions.eidl > 0;
    result[PARAMS_NAMES.auctionEidsLength] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl || -1;
  }
}

function prepareData(data: any, result: Record<string, any>): void {
  const adTypeValue = data.adType || data.mediaType;

  if (data.bidderCode) result.bidderCode = data.bidderCode;
  if (data.cpm) result.cpm = data.cpm;
  if (data.currency) result.currency = data.currency;
  if (data.originalCpm) result.originalCpm = data.originalCpm;
  if (data.originalCurrency) result.originalCurrency = data.originalCurrency;
  if (data.status) result.status = data.status;
  if (data.size) result.size = data.size;
  if (typeof data.pos === 'number') {
    result.pos = data.pos;
  } else if (data.adUnitCode) {
    const pos = getUnitPosition(pbjs, data.adUnitCode);
    if (typeof pos === 'number') result.pos = pos;
  }
  if (data.size) {
    result.size = data.size;
  }
  if (typeof data.pos === 'number') {
    result.pos = data.pos;
  } else if (data.adUnitCode) {
    const pos = getUnitPosition(pbjs, data.adUnitCode);
    if (typeof pos === 'number') result.pos = pos;
  }

  result.prebidAuctionId = data.auctionId || data.prebidAuctionId;

  if (adTypeValue) result[PARAMS_NAMES.adType] = adTypeValue;

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

  if (data?.partnerAuctionId) result.partnerAuctionId = data.partnerAuctionId;
}

function extractPlacementId(data: any): string | null {
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

function getDefaultDataObject(): Record<string, any> {
  return {
    inbbl: false,
    pbjsver: prebidVersion,
    reportSource: 'pbjs',
    jsversion: VERSION,
    partnerId: -1,
    biddingPlatformId: 1,
    idls: false,
    ast: -1,
    aeidln: -1
  };
}

function constructFullUrl(data: Record<string, any>): any {
  const report: string[] = [];
  const reportMethod = iiqAnalyticsAnalyticsAdapter.initOptions.reportMethod;
  const partnerData = (window as any)[identityGlobalName as string]?.partnerData;
  const currentBrowserLowerCase = detectBrowser();
  const partnerAuctionId = data?.partnerAuctionId;
  const encodedData = btoa(JSON.stringify(data));
  report.push(encodedData);

  const cmpData = getCmpData();
  const [reportEndpoint, region] = getDataForDefineURL();
  const baseUrl = reportingServerAddress(reportEndpoint, region);

  let url =
        baseUrl +
        '?pid=' +
        iiqAnalyticsAnalyticsAdapter.initOptions.partner;
  if (partnerAuctionId) {
    url +=
          '&paucid=' +
          encodeURIComponent(JSON.stringify([partnerAuctionId]));
  }
  url += '&mct=1' +
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
        encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.clientHints) +
        (isValidValue(cmpData.uspString) ? '&us_privacy=' + encodeURIComponent(cmpData.uspString as string) : '') +
        (isValidValue(cmpData.gppString) ? '&gpp=' + encodeURIComponent(cmpData.gppString as string) : '') +
        (isValidValue(cmpData.gdprString)
          ? '&gdpr_consent=' + encodeURIComponent(cmpData.gdprString as string) + '&gdpr=1'
          : '&gdpr=0') +
        (cmpData.gdprApplies && isValidValue(cmpData.tcfApiVersion) ? '&tcfv=' + encodeURIComponent(cmpData.tcfApiVersion as string) : '');

  url = appendSPData(url, partnerData);
  url = appendVrrefAndFui(url, iiqAnalyticsAnalyticsAdapter.initOptions.domainName);

  if (reportMethod !== 'POST') {
    url += '&payload=' + encodeURIComponent(JSON.stringify(report));
  }

  url = handleAdditionalParams(
    currentBrowserLowerCase,
    url,
    2,
    iiqAnalyticsAnalyticsAdapter.initOptions.additionalParams
  );

  if (reportMethod === 'POST') {
    return { url, method: 'POST', payload: JSON.stringify(report) };
  }
  return { url };
}

iiqAnalyticsAnalyticsAdapter.originEnableAnalytics = iiqAnalyticsAnalyticsAdapter.enableAnalytics;

iiqAnalyticsAnalyticsAdapter.enableAnalytics = function (myConfig: any): void {
  iiqAnalyticsAnalyticsAdapter.originEnableAnalytics(myConfig); // call the base class function
  initAdapterConfig(myConfig);
};

iiqAnalyticsAnalyticsAdapter.originDisableAnalytics = iiqAnalyticsAnalyticsAdapter.disableAnalytics;
iiqAnalyticsAnalyticsAdapter.disableAnalytics = function(): void {
  globalName = undefined;
  identityGlobalName = undefined;
  alreadySubscribedOnGAM = false;
  reportList = {};
  cleanReportsID = undefined;
  iiqConfig = undefined;
  iiqAnalyticsAnalyticsAdapter.initOptions = getDefaultInitOptions();
  iiqAnalyticsAnalyticsAdapter.originDisableAnalytics();
};
adapterManager.registerAnalyticsAdapter({
  adapter: iiqAnalyticsAnalyticsAdapter,
  code: MODULE_NAME
});

export default iiqAnalyticsAnalyticsAdapter;
