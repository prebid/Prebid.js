/**
 * This module adds audigent provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch segments from audigent server
 * @module modules/audigentRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {Object} ModuleParams
 * @property {string} siteKey
 * @property {string} pubKey
 * @property {string} url
 * @property {?string} keyName
 * @property {number} auctionDelay
 */

import {config} from '../src/config.js';
import {getGlobal} from '../src/prebidGlobal.js';
import * as utils from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

/** @type {string} */
const MODULE_NAME = 'realTimeData';

/** @type {ModuleParams} */
let _moduleParams = {};

/**
 * XMLHttpRequest to get data form audigent server
 * @param {string} url server url with query params
 */
export function setData(data) {
  storage.setDataInLocalStorage('__adgntseg', JSON.stringify(data));
}

function addSegmentData(adUnits, data) {
  adUnits.forEach(adUnit => {
    if (adUnit.hasOwnProperty('bids')) {
      adUnit.bids.forEach(bid => {
        if (!bid.hasOwnProperty('realTimeData')) {
          bid.realTimeData = Object();
        }
        bid.realTimeData.audigent_segments = data;
      })
    }
  })

  return adUnits;
}

function getSegments(reqBidsConfigObj, callback, config, userConsent) {
  try {
    let jsonData = storage.getDataFromLocalStorage('__adgntseg');
    if (jsonData) {
      let data = JSON.parse(jsonData);
      if (data.audigent_segments) {
        reqBidsConfigObj.adUnits = addSegmentData(reqBidsConfigObj.adUnits, data);
        callback(reqBidsConfigObj.auctionId);
        return;
      }
    }
    getSegmentsAsync(reqBidsConfigObj, callback, config, userConsent);
  } catch (e) {
    getSegmentsAsync(reqBidsConfigObj, callback, config, userConsent);
  }
}

function getSegmentsAsync(reqBidsConfigObj, callback, config, userConsent) {
  let queryConfig = {}
  if (typeof config == 'object' && config == null && Object.keys(config).length > 0) {
    queryConfig = config
  }

  const userIds = (getGlobal()).getUserIds();
  if (typeof userIds == 'undefined' || userIds == null) {
    callback(reqBidsConfigObj.auctionId);
    return;
  }

  const url = `https://seg.halo.ad.gt/api/v1/rtb_segments`;

  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          if (data && data.audigent_segments) {
            reqBidsConfigObj.adUnits = addSegmentData(reqBidsConfigObj.adUnits, data);
            callback(reqBidsConfigObj.auctionId);
            setData(data);
          } else {
            callback(reqBidsConfigObj.auctionId);
          }
        } catch (err) {
          utils.logError('unable to parse audigent segment data');
          callback(reqBidsConfigObj.auctionId);
        }
      } else if (req.status === 204) {
        // unrecognized partner config
        callback(reqBidsConfigObj.auctionId);
      }
    },
    error: function () {
      callback(reqBidsConfigObj.auctionId);
      utils.logError('unable to get audigent segment data');
    }
  },
  JSON.stringify({'userIds': userIds, 'config': queryConfig}),
  {contentType: 'application/json'}
  );
}

/** @type {RtdSubmodule} */
export const audigentSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: 'audigent',
  getBidRequestData: getSegments
};

export function init(config) {
  const confListener = config.getConfig(MODULE_NAME, ({realTimeData}) => {
    try {
      _moduleParams = realTimeData.dataProviders && realTimeData.dataProviders.filter(pr => pr.name && pr.name.toLowerCase() === 'audigent')[0].params;
      _moduleParams.auctionDelay = realTimeData.auctionDelay;
    } catch (e) {
      _moduleParams = {};
    }
    confListener();
  });
}

submodule('realTimeData', audigentSubmodule);
init(config);
