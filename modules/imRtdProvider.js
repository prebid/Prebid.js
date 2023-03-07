/**
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time data from Intimate Merger
 * @module modules/imRtdProvider
 * @requires module:modules/realTimeData
 */
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js'
import {getStorageManager} from '../src/storageManager.js';
import {
  deepSetValue,
  deepAccess,
  timestamp,
  mergeDeep,
  logError,
  logInfo,
  isFn
} from '../src/utils.js'
import {submodule} from '../src/hook.js';

export const imUidLocalName = '__im_uid';
export const imVidCookieName = '_im_vid';
export const imRtdLocalName = '__im_sids';
export const storage = getStorageManager();
const submoduleName = 'im';
const segmentsMaxAge = 3600000; // 1 hour (30 * 60 * 1000)
const uidMaxAge = 1800000; // 30 minites (30 * 60 * 1000)
const vidMaxAge = 97200000000; // 37 months ((365 * 3 + 30) * 24 * 60 * 60 * 1000)

function setImDataInCookie(value) {
  storage.setCookie(
    imVidCookieName,
    value,
    new Date(timestamp() + vidMaxAge).toUTCString(),
    'none'
  );
}

/**
 * @param {Object} segments
 * @param {Object} moduleConfig
 */
function getSegments(segments, moduleConfig) {
  if (!segments) return;
  const maxSegments = !Number.isNaN(moduleConfig.params.maxSegments) ? moduleConfig.params.maxSegments : 200;
  return segments.slice(0, maxSegments);
}

/**
* @param {string} bidderName
*/
export function getBidderFunction(bidderName) {
  const biddersFunction = {
    pubmatic: function (bid, data, moduleConfig) {
      if (data.im_segments && data.im_segments.length) {
        const segments = getSegments(data.im_segments, moduleConfig);
        const dctr = deepAccess(bid, 'params.dctr');
        deepSetValue(
          bid,
          'params.dctr',
          `${dctr ? dctr + '|' : ''}im_segments=${segments.join(',')}`
        );
      }
      return bid
    },
    fluct: function (bid, data, moduleConfig) {
      if (data.im_segments && data.im_segments.length) {
        const segments = getSegments(data.im_segments, moduleConfig);
        deepSetValue(
          bid,
          'params.kv.imsids',
          segments
        );
      }
      return bid
    }
  }
  return biddersFunction[bidderName] || null;
}

export function getCustomBidderFunction(config, bidder) {
  const overwriteFn = deepAccess(config, `params.overwrites.${bidder}`)

  if (overwriteFn && isFn(overwriteFn)) {
    return overwriteFn
  } else {
    return null
  }
}

/**
 * Add real-time data.
 * @param {Object} bidConfig
 * @param {Object} moduleConfig
 * @param {Object} data
 */
export function setRealTimeData(bidConfig, moduleConfig, data) {
  const adUnits = bidConfig.adUnits || getGlobal().adUnits;
  const utils = {deepSetValue, deepAccess, logInfo, logError, mergeDeep};

  if (data.im_segments) {
    const segments = getSegments(data.im_segments, moduleConfig);
    const ortb2 = bidConfig.ortb2Fragments?.global || {};
    deepSetValue(ortb2, 'user.ext.data.im_segments', segments);

    if (moduleConfig.params.setGptKeyValues || !moduleConfig.params.hasOwnProperty('setGptKeyValues')) {
      window.googletag = window.googletag || {cmd: []};
      window.googletag.cmd = window.googletag.cmd || [];
      window.googletag.cmd.push(() => {
        window.googletag.pubads().setTargeting('im_segments', segments);
      });
    }
  }

  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      const bidderFunction = getBidderFunction(bid.bidder);
      const overwriteFunction = getCustomBidderFunction(moduleConfig, bid.bidder);
      if (overwriteFunction) {
        overwriteFunction(bid, data, utils, config);
      } else if (bidderFunction) {
        bidderFunction(bid, data, moduleConfig);
      }
    })
  });
}

/**
 * Real-time data retrieval from Intimate Merger
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} moduleConfig
 */
export function getRealTimeData(reqBidsConfigObj, onDone, moduleConfig) {
  const cid = deepAccess(moduleConfig, 'params.cid');
  if (!cid) {
    logError('imRtdProvider requires a valid cid to be defined');
    onDone();
    return;
  }
  const sids = storage.getDataFromLocalStorage(imRtdLocalName);
  const parsedSids = sids ? sids.split(',') : [];
  const mt = storage.getDataFromLocalStorage(`${imRtdLocalName}_mt`);
  const localVid = storage.getCookie(imVidCookieName);
  let apiUrl = `https://sync6.im-apps.net/${cid}/rtd`;
  let expired = true;
  let alreadyDone = false;

  if (localVid) {
    apiUrl += `?vid=${localVid}`;
    setImDataInCookie(localVid);
  }

  if (Date.parse(mt) && Date.now() - (new Date(mt)).getTime() < segmentsMaxAge) {
    expired = false;
  }

  if (sids !== null) {
    setRealTimeData(reqBidsConfigObj, moduleConfig, {im_segments: parsedSids});
    onDone();
    alreadyDone = true;
  }

  if (expired) {
    ajax(
      apiUrl,
      getApiCallback(reqBidsConfigObj, alreadyDone ? undefined : onDone, moduleConfig),
      undefined,
      {method: 'GET', withCredentials: true}
    );
  }
}

/**
 * Api callback from Intimate Merger
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} moduleConfig
 */
export function getApiCallback(reqBidsConfigObj, onDone, moduleConfig) {
  return {
    success: function (response, req) {
      let parsedResponse = {};
      if (req.status === 200) {
        try {
          parsedResponse = JSON.parse(response);
        } catch (e) {
          logError('unable to get Intimate Merger segment data');
        }

        if (parsedResponse.uid) {
          const imuid = storage.getDataFromLocalStorage(imUidLocalName);
          const imuidMt = storage.getDataFromLocalStorage(`${imUidLocalName}_mt`);
          const imuidExpired = Date.parse(imuidMt) && Date.now() - (new Date(imuidMt)).getTime() < uidMaxAge;
          if (!imuid || imuidExpired) {
            storage.setDataInLocalStorage(imUidLocalName, parsedResponse.uid);
            storage.setDataInLocalStorage(`${imUidLocalName}_mt`, new Date(timestamp()).toUTCString());
          }
        }

        if (parsedResponse.vid) {
          setImDataInCookie(parsedResponse.vid);
        }

        if (parsedResponse.segments) {
          setRealTimeData(reqBidsConfigObj, moduleConfig, {im_segments: parsedResponse.segments});
          storage.setDataInLocalStorage(imRtdLocalName, parsedResponse.segments);
          storage.setDataInLocalStorage(`${imRtdLocalName}_mt`, new Date(timestamp()).toUTCString());
        }
      }
      if (onDone) {
        onDone();
      }
    },
    error: function () {
      if (onDone) {
        onDone();
      }
      logError('unable to get Intimate Merger segment data');
    }
  }
}

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
 */
function init(provider, userConsent) {
  return true;
}

/** @type {RtdSubmodule} */
export const imRtdSubmodule = {
  name: submoduleName,
  getBidRequestData: getRealTimeData,
  init: init
};

submodule('realTimeData', imRtdSubmodule);
