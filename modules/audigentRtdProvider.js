/**
 * This module adds audigent provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch segments from audigent server
 * @module modules/audigentRtdProvider
 * @requires module:modules/realTimeData
 */
import {getGlobal} from '../src/prebidGlobal.js';
import * as utils from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';

export const storage = getStorageManager();

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'audigent';
export const HALOID_LOCAL_NAME = 'auHaloId';
export const SEG_LOCAL_NAME = '__adgntseg';

const set = (obj, path, val) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
  lastObj[lastKey] = lastObj[lastKey] || val;
};

/** bid adapter format segment augmentation functions */
const segmentMappers = {
  appnexus: function(bid, segments) {
    set(bid, 'params.user.segments', []);
    bid.params.user.segments = bid.params.user.segments.concat(segments);
  },
  generic: function(bid, segments) {
    bid.segments = segments;
  }
}

/**
 * decorate adUnits with segment data
 * @param {adUnit[]} adUnits
 * @param {Object} data
 */
export function addSegmentData(adUnits, data, config) {
  adUnits.forEach(adUnit => {
    set(adUnit, 'fpd.user.data.segments.audigent_segments', data);

    if (adUnit.hasOwnProperty('bids')) {
      adUnit.bids.forEach(bid => {
        try {
          if (config.params.mapSegments && config.params.mapSegments[bid.bidder] && data[bid.bidder]) {
            if (typeof config.params.mapSegments[bid.bidder] == 'function') {
              config.params.mapSegments[bid.bidder](bid, data[bid.bidder]);
            } else if (segmentMappers[bid.bidder]) {
              segmentMappers[bid.bidder](bid, data[bid.bidder]);
            }
          }
        } catch (err) {
          utils.logError('audigent segment map error.');
        }
      })
    }
  })

  return adUnits;
}

/**
 * segment retrieval from audigent's backends
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} config
 * @param {Object} userConsent
 */
export function getSegments(reqBidsConfigObj, onDone, config, userConsent) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;

  if (config.params.segmentCache) {
    let jsonData = storage.getDataFromLocalStorage(SEG_LOCAL_NAME);

    if (jsonData) {
      let data = JSON.parse(jsonData);

      if (data.audigent_segments) {
        addSegmentData(adUnits, data.audigent_segments, config);
        onDone();
        return;
      }
    }
  }

  const userIds = (getGlobal()).getUserIds();
  if (typeof userIds == 'undefined' || userIds == null) {
    onDone();
    return;
  }

  let haloId = storage.getDataFromLocalStorage(HALOID_LOCAL_NAME);
  if (haloId) {
    userIds.haloId = haloId;
    getSegmentsAsync(adUnits, onDone, config, userConsent, userIds);
  } else {
    var script = document.createElement('script')
    script.type = 'text/javascript';

    script.onload = function() {
      userIds.haloId = storage.getDataFromLocalStorage(HALOID_LOCAL_NAME);
      getSegmentsAsync(adUnits, onDone, config, userConsent, userIds);
    }

    script.src = 'https://id.halo.ad.gt/api/v1/haloid';
    document.getElementsByTagName('head')[0].appendChild(script);
  }
}

/**
 * async segment retrieval from audigent's backends
 * @param {adUnit[]} adUnits
 * @param {function} onDone
 * @param {Object} config
 * @param {Object} userConsent
 * @param {Object} userIds
 */
export function getSegmentsAsync(adUnits, onDone, config, userConsent, userIds) {
  let reqParams = {};
  if (typeof config == 'object' && config != null && Object.keys(config).length > 0) {
    reqParams = config.params.requestParams;
  }

  const url = `https://seg.halo.ad.gt/api/v1/rtb_segments`;
  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          if (data && data.audigent_segments) {
            addSegmentData(adUnits, data.audigent_segments, config);
            onDone();
            storage.setDataInLocalStorage(SEG_LOCAL_NAME, JSON.stringify(data));
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

/**
 * module init
 * @param {Object} provider
 * @param {Objkect} userConsent
 * @return {boolean}
 */
function init(provider, userConsent) {
  return true;
}

/** @type {RtdSubmodule} */
export const audigentSubmodule = {
  name: SUBMODULE_NAME,
  getBidRequestData: getSegments,
  init: init
};

submodule(MODULE_NAME, audigentSubmodule);
