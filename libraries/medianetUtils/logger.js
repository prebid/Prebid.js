import { flattenObj, formatQS as mnFormatQS, pick } from './utils.js';
import { formatQS, triggerPixel, isPlainObject } from '../../src/utils.js';
import {
  ANALYTICS_VERSION, BID_SUCCESS,
  EVENT_PIXEL_URL, LOG_APPR,
  LOGGING_TOPICS,
  mnetGlobals, POST_ENDPOINT,
  PREBID_VERSION
} from './constants.js';
import { ajax, sendBeacon } from '../../src/ajax.js';
import { getRefererInfo } from '../../src/refererDetection.js';
import { getGlobal } from '../../src/prebidGlobal.js';

export function shouldLogAPPR(auctionData, adUnitId) {
  const adSlot = auctionData.adSlots[adUnitId];
  return (
    (
      mnetGlobals.configuration.shouldLogAPPR
    ) &&
    !adSlot.logged[LOG_APPR]
  );
}

// common error logger for medianet analytics and bid adapter
export function errorLogger(event, data = undefined, analytics = true) {
  const { name, cid, value, relatedData, logData, project } = isPlainObject(event) ? {...event, logData: data} : { name: event, relatedData: data };
  const refererInfo = mnetGlobals.refererInfo || getRefererInfo();
  const errorData = Object.assign({},
    {
      logid: 'kfk',
      evtid: LOGGING_TOPICS.PROJECT_EVENTS,
      project: project || (analytics ? 'prebidanalytics' : 'prebid'),
      dn: refererInfo.domain || '',
      requrl: refererInfo.topmostLocation || '',
      pbav: getGlobal().medianetGlobals.analyticsEnabled ? ANALYTICS_VERSION : '',
      pbver: PREBID_VERSION,
      // To handle media.net alias bidderAdapter (params.cid) code errors
      cid: cid || mnetGlobals.configuration.cid || '',
      event: name || '',
      value: value || '',
      rd: relatedData || '',
    },
    logData);
  const loggingHost = analytics ? EVENT_PIXEL_URL : POST_ENDPOINT;
  const payload = analytics ? mnFormatQS(errorData) : formatQS(errorData);

  function send() {
    if (!analytics) {
      fireAjaxLog(loggingHost, payload, pick(errorData, ['cid', 'project', 'name as value']));
      return;
    }
    const pixelUrl = getUrl();
    mnetGlobals.errorQueue.push(pixelUrl);
    triggerPixel(pixelUrl);
  }

  function getUrl() {
    return loggingHost + '?' + payload;
  }

  return {
    send,
    getUrl
  };
}

// Log generation for APPR & RA
export function getLoggingPayload(queryParams, logType) {
  const loggingTopic = LOGGING_TOPICS[logType];
  return `logid=kfk&evtid=${loggingTopic}&${queryParams}`;
}

export function firePostLog(loggingHost, payload) {
  try {
    mnetGlobals.logsQueue.push(loggingHost + '?' + payload);
    const isSent = sendBeacon(loggingHost, payload);
    if (!isSent) {
      fireAjaxLog(loggingHost, payload);
      errorLogger('sb_log_failed').send();
    }
  } catch (e) {
    fireAjaxLog(loggingHost, payload);
    errorLogger('sb_not_supported').send();
  }
}

export function fireAjaxLog(loggingHost, payload, errorData = {}) {
  ajax(loggingHost,
    {
      success: () => undefined,
      error: (_, {reason}) => errorLogger(Object.assign(errorData, {name: 'ajax_log_failed', relatedData: reason})).send()
    },
    payload,
    {
      method: 'POST',
    }
  );
}

export function mergeFieldsToLog(objParams) {
  const logParams = Object.keys(objParams).map((param) => {
    const value = objParams[param];
    return `${param}=${value === undefined ? '' : value}`;
  });
  return logParams.join('||');
}

export function getProcessedParams(params, status) {
  if (params === undefined || status !== BID_SUCCESS) return '';
  const clonedFlattenParams = flattenObj(params, '', {});
  return JSON.stringify(clonedFlattenParams);
}
