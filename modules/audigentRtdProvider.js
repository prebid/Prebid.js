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
        bid.audigent_segments = data;
      })
    }
  })

  return adUnits;
}

function getSegments(reqBidsConfigObj, onDone, config, userConsent) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;

  try {
    let jsonData = storage.getDataFromLocalStorage('__adgntseg');
    if (jsonData) {
      let data = JSON.parse(jsonData);
      if (data.audigent_segments) {
        addSegmentData(adUnits, data);
        onDone();
        return;
      }
    }
    getSegmentsAsync(adUnits, onDone, config, userConsent);
  } catch (e) {
    getSegmentsAsync(adUnits, onDone, config, userConsent);
  }
}

function getSegmentsAsync(adUnits, onDone, config, userConsent) {
  let reqParams = {}
  if (typeof config == 'object' && config == null && Object.keys(config).length > 0) {
    reqParams = config.params
  }

  const userIds = (getGlobal()).getUserIds();
  if (typeof userIds == 'undefined' || userIds == null) {
    onDone();
    return;
  }

  const url = `https://seg.halo.ad.gt/api/v1/rtb_segments`;

  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          if (data && data.audigent_segments) {
            addSegmentData(adUnits, data);
            onDone();
            setData(data);
          } else {
            onDone();
          }
        } catch (err) {
          utils.logError('unable to parse audigent segment data');
          onDone();
        }
      } else if (req.status === 204) {
        // unrecognized partner config
        onDone();
      }
    },
    error: function () {
      onDone();
      utils.logError('unable to get audigent segment data');
    }
  },
  JSON.stringify({'userIds': userIds, 'config': reqParams}),
  {contentType: 'application/json'}
  );
}

/** @type {RtdSubmodule} */
export const audigentSubmodule = {
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
