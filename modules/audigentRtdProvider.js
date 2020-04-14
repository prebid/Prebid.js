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

function getSegments(adUnits, onDone) {
  try {
    let jsonData = storage.getDataFromLocalStorage('__adgntseg');
    if (jsonData) {
      let data = JSON.parse(jsonData);
      if (data.audigent_segments) {
        let dataToReturn = adUnits.reduce((rp, cau) => {
          const adUnitCode = cau && cau.code;
          if (!adUnitCode) { return rp }
          rp[adUnitCode] = data;
          return rp;
        }, {});

        onDone(dataToReturn);
        return;
      }
    }
    getSegmentsAsync(adUnits, onDone);
  } catch (e) {
    getSegmentsAsync(adUnits, onDone);
  }
}

function getSegmentsAsync(adUnits, onDone) {
  const userIds = (getGlobal()).getUserIds();
  let tdid = null;

  if (userIds && userIds['tdid']) {
    tdid = userIds['tdid'];
  } else {
    onDone({});
  }

  const url = `https://seg.ad.gt/api/v1/rtb_segments?tdid=${tdid}`;

  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          if (data && data.audigent_segments) {
            setData(data);
            let dataToReturn = adUnits.reduce((rp, cau) => {
              const adUnitCode = cau && cau.code;
              if (!adUnitCode) { return rp }
              rp[adUnitCode] = data;
              return rp;
            }, {});

            onDone(dataToReturn);
          } else {
            onDone({});
          }
        } catch (err) {
          utils.logError('unable to parse audigent segment data');
          onDone({})
        }
      } else if (req.status === 204) {
        // unrecognized site key
        onDone({});
      }
    },
    error: function () {
      onDone({});
      utils.logError('unable to get audigent segment data');
    }
  }
  );
}

/** @type {RtdSubmodule} */
export const audigentSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: 'audigent',
  /**
   * get data and send back to realTimeData module
   * @function
   * @param {adUnit[]} adUnits
   * @param {function} onDone
   */
  getData: getSegments
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
