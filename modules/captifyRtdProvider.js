/**
 * This module adds Captify real time data provider module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch segments (page-centric) from Captify live-classification server
 * @module modules/captifyRtdProvider
 * @requires module:modules/realTimeData
 */
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import {deepAccess, isArray, isEmptyStr, isNumber, logError} from '../src/utils.js';
import {getGlobal} from '../src/prebidGlobal.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'CaptifyRTDModule';
const DEFAULT_LC_URL = 'https://live-classification.cpx.to/prebid-segments';

const STATUS = {
  SUCCESS: 200,
  ACCEPTED: 202,
};

/**
 * Set `appnexusAuctionKeywords` that appnexus bidder will read and send in request to Xandr
 * @param {Array<number>} segments captify segments for Appnexus(Xandr) system, in form of [id1, id2, id3]
 *                 where id1, id2, id3 - actual Xandr segment ids with keywords enabled
 */
export function setAppnexusSegments(segments) {
  config.setConfig({
    appnexusAuctionKeywords: {
      'captify_segments': segments,
    },
  })
}

/**
 * Function returns only bidders that contained both, in moduleConfig and at least one adUnit.
 * @param {Array<string>} bidders Contains list of bidders, to set targeting for
 * @param {Object} data Response of live-classification service
 */
export function addSegmentData(bidders, data) {
  for (const bidder of bidders) {
    if (bidder === 'appnexus') { setAppnexusSegments(data['xandr']) }
  }
}

/**
 * Function returns only bidders that contained in both, moduleConfig and at least one adUnit.
 * @param {Object} moduleConfig Config object passed to the module
 * @param {Object} reqBidsConfigObj Config object for the bidders; each adapter has its own entry
 */
export function getMatchingBidders(moduleConfig, reqBidsConfigObj) {
  const biddersFromConf = deepAccess(moduleConfig, 'params.bidders');

  const adUnitBidders = reqBidsConfigObj.adUnits
    .flatMap(({bids}) => bids.map(({bidder}) => bidder))
    .filter((e, i, a) => a.indexOf(e) === i);

  if (!isArray(adUnitBidders) || !adUnitBidders.length) {
    logError(SUBMODULE_NAME, 'Missing parameter bidders in bidRequestConfig');
    return [];
  }

  return biddersFromConf.filter(bidder => adUnitBidders.includes(bidder));
}

/**
 * Main function that sets Captify targeting for various bidders
 * @param {Object} moduleConfig Config object passed to the module
 * @param {Function} onDone callback function that executed when everything is done
 * @param {Object} reqBidsConfigObj Config object for the bidders; each adapter has its own entry
 * @param {Object} gcv contains data related to user consent, if applies
 */
export function setCaptifyTargeting(reqBidsConfigObj, onDone, moduleConfig, gcv) {
  const pbjsVer = getGlobal();
  const ref = getRefererInfo().referer;
  const url = document.URL;
  const pubId = moduleConfig.params.pubId;
  const bidders = getMatchingBidders(moduleConfig, reqBidsConfigObj)
  const requestBody = {
    pubId,
    ref,
    url,
    pbjsVer,
    gcv
  };
  let requestUrl = moduleConfig.params.url;
  if (!requestUrl || isEmptyStr(requestUrl)) {
    requestUrl = DEFAULT_LC_URL;
  }

  if (!bidders.length) {
    logError(SUBMODULE_NAME, 'There are no matched bidders to work with');
    return;
  }

  ajax(requestUrl, {
    success: function (response, req) {
      if (req.status === STATUS.SUCCESS) {
        try {
          const data = JSON.parse(response);
          if (data) {
            addSegmentData(bidders, data);
          }
        } catch (e) {
          logError(SUBMODULE_NAME, 'Unable to parse live-classification data' + e);
        }
      }
      onDone();
    },
    error: function () {
      onDone();
      logError(SUBMODULE_NAME, 'Unable to get live-classification data');
    }
  },
  JSON.stringify(requestBody),
  {
    contentType: 'application/json',
    method: 'POST',
  });
}

export function init(moduleConfig, userConsent) {
  // Validate bidders
  const biddersFromConf = deepAccess(moduleConfig, 'params.bidders');
  if (!isArray(biddersFromConf) || !biddersFromConf.length) {
    logError(SUBMODULE_NAME, 'Missing parameter bidders in moduleConfig');
    return false
  }
  const publisherId = deepAccess(moduleConfig, 'params.pubId');
  // Publisher Id
  if (!isNumber(publisherId)) {
    logError(SUBMODULE_NAME, 'Missing parameter pubId in moduleConfig');
    return false
  }
  return true
}

export const captifySubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  setCaptifyTargeting
};

submodule(MODULE_NAME, captifySubmodule);
