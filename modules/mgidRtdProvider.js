import { submodule } from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {deepAccess, logError, logInfo, mergeDeep} from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {getRefererInfo} from '../src/refererDetection.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'mgid';
const MGID_RTD_API_URL = 'https://servicer.mgid.com/sda';
const MGUID_LOCAL_STORAGE_KEY = 'mguid';
const ORTB2_NAME = 'www.mgid.com'

const GVLID = 358;
/** @type {?Object} */
export const storage = getStorageManager({
  gvlid: GVLID,
  moduleName: SUBMODULE_NAME
});

function init(moduleConfig) {
  if (!moduleConfig?.params?.clientSiteId) {
    logError('Mgid clientSiteId is not set!');
    return false;
  }
  return true;
}

function getBidRequestData(reqBidsConfigObj, onDone, moduleConfig, userConsent) {
  let mguid;
  try {
    mguid = storage.getDataFromLocalStorage(MGUID_LOCAL_STORAGE_KEY);
  } catch (e) {
    logInfo(`Can't get mguid from localstorage`);
  }

  const params = [
    {
      name: 'gdprApplies',
      data: typeof userConsent?.gdpr?.gdprApplies !== 'undefined' ? userConsent?.gdpr?.gdprApplies + '' : undefined,
    },
    {
      name: 'consentData',
      data: userConsent?.gdpr?.consentString,
    },
    {
      name: 'uspString',
      data: userConsent?.usp,
    },
    {
      name: 'cxurl',
      data: encodeURIComponent(getContextUrl()),
    },
    {
      name: 'muid',
      data: mguid,
    },
    {
      name: 'clientSiteId',
      data: moduleConfig?.params?.clientSiteId,
    },
    {
      name: 'cxlang',
      data: deepAccess(reqBidsConfigObj.ortb2Fragments.global, 'site.content.language'),
    },
  ];

  const url = MGID_RTD_API_URL + '?' + params.filter((p) => p.data).map((p) => p.name + '=' + p.data).join('&');

  let isDone = false;

  ajax(url, {
    success: (response, req) => {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          const ortb2 = reqBidsConfigObj?.ortb2Fragments?.global || {};

          mergeDeep(ortb2, getDataForMerge(data));

          if (data?.muid) {
            try {
              mguid = storage.setDataInLocalStorage(MGUID_LOCAL_STORAGE_KEY, data.muid);
            } catch (e) {
              logInfo(`Can't set mguid to localstorage`);
            }
          }

          onDone();
          isDone = true;
        } catch (e) {
          onDone();
          isDone = true;

          logError('Unable to parse Mgid RTD data', e);
        }
      } else {
        onDone();
        isDone = true;

        logError('Mgid RTD wrong response status');
      }
    },
    error: () => {
      onDone();
      isDone = true;

      logError('Unable to get Mgid RTD data');
    }
  },
  null, {
    method: 'GET',
    withCredentials: false,
  });

  setTimeout(function () {
    if (!isDone) {
      onDone();
      logInfo('Mgid RTD timeout');
      isDone = true;
    }
  }, moduleConfig.params.timeout || 1000);
}

function getContextUrl() {
  const refererInfo = getRefererInfo();

  let resultUrl = refererInfo.canonicalUrl || refererInfo.topmostLocation;

  const metaElements = document.getElementsByTagName('meta');
  for (let i = 0; i < metaElements.length; i++) {
    if (metaElements[i].getAttribute('property') === 'og:url') {
      resultUrl = metaElements[i].content;
    }
  }

  return resultUrl;
}

function getDataForMerge(responseData) {
  let siteData = {
    name: ORTB2_NAME
  };
  let userData = {
    name: ORTB2_NAME
  };

  if (responseData.siteSegments) {
    siteData.segment = responseData.siteSegments.map((segmentId) => ({ id: segmentId }));
  }
  if (responseData.siteSegtax) {
    siteData.ext = {
      segtax: responseData.siteSegtax
    }
  }

  if (responseData.userSegments) {
    userData.segment = responseData.userSegments.map((segmentId) => ({ id: segmentId }));
  }
  if (responseData.userSegtax) {
    userData.ext = {
      segtax: responseData.userSegtax
    }
  }

  let result = {};
  if (siteData.segment || siteData.ext) {
    result.site = {
      content: {
        data: [siteData],
      }
    }
  }

  if (userData.segment || userData.ext) {
    result.user = {
      data: [userData],
    }
  }

  return result;
}

/** @type {RtdSubmodule} */
export const mgidSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getBidRequestData,
};

submodule(MODULE_NAME, mgidSubmodule);
