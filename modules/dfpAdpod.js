import {submodule} from '../src/hook.js';
import {buildUrl, deepAccess, formatQS, logError, parseSizesInput} from '../src/utils.js';
import {auctionManager} from '../src/auctionManager.js';
import {DEFAULT_DFP_PARAMS, DFP_ENDPOINT, gdprParams} from '../libraries/dfpUtils/dfpUtils.js';
import {registerVideoSupport} from '../src/adServerManager.js';

export const adpodUtils = {};

/**
 * @typedef {Object} DfpAdpodOptions
 *
 * @param {string} code Ad Unit code
 * @param {Object} params Query params which should be set on the DFP request.
 * These will override this module's defaults whenever they conflict.
 * @param {function} callback Callback function to execute when master tag is ready
 */

/**
 * Creates master tag url for long-form
 * @param {DfpAdpodOptions} options
 * @returns {string} A URL which calls DFP with custom adpod targeting key values to compete with rest of the demand in DFP
 */
export function buildAdpodVideoUrl({code, params, callback} = {}) {
  // TODO: the public API for this does not take in enough info to fill all DFP params (adUnit/bid),
  // and is marked "alpha": https://docs.prebid.org/dev-docs/publisher-api-reference/adServers.dfp.buildAdpodVideoUrl.html
  if (!params || !callback) {
    logError(`A params object and a callback is required to use pbjs.adServers.dfp.buildAdpodVideoUrl`);
    return;
  }

  const derivedParams = {
    correlator: Date.now(),
    sz: getSizeForAdUnit(code),
    url: encodeURIComponent(location.href),
  };

  function getSizeForAdUnit(code) {
    let adUnit = auctionManager.getAdUnits()
      .filter((adUnit) => adUnit.code === code)
    let sizes = deepAccess(adUnit[0], 'mediaTypes.video.playerSize');
    return parseSizesInput(sizes).join('|');
  }

  adpodUtils.getTargeting({
    'codes': [code],
    'callback': createMasterTag
  });

  function createMasterTag(err, targeting) {
    if (err) {
      callback(err, null);
      return;
    }

    let initialValue = {
      [adpodUtils.TARGETING_KEY_PB_CAT_DUR]: undefined,
      [adpodUtils.TARGETING_KEY_CACHE_ID]: undefined
    };
    let customParams = {};
    if (targeting[code]) {
      customParams = targeting[code].reduce((acc, curValue) => {
        if (Object.keys(curValue)[0] === adpodUtils.TARGETING_KEY_PB_CAT_DUR) {
          acc[adpodUtils.TARGETING_KEY_PB_CAT_DUR] = (typeof acc[adpodUtils.TARGETING_KEY_PB_CAT_DUR] !== 'undefined') ? acc[adpodUtils.TARGETING_KEY_PB_CAT_DUR] + ',' + curValue[adpodUtils.TARGETING_KEY_PB_CAT_DUR] : curValue[adpodUtils.TARGETING_KEY_PB_CAT_DUR];
        } else if (Object.keys(curValue)[0] === adpodUtils.TARGETING_KEY_CACHE_ID) {
          acc[adpodUtils.TARGETING_KEY_CACHE_ID] = curValue[adpodUtils.TARGETING_KEY_CACHE_ID]
        }
        return acc;
      }, initialValue);
    }

    let encodedCustomParams = encodeURIComponent(formatQS(customParams));

    const queryParams = Object.assign({},
      DEFAULT_DFP_PARAMS,
      derivedParams,
      params,
      { cust_params: encodedCustomParams },
      gdprParams(),
    );

    const masterTag = buildUrl({
      ...DFP_ENDPOINT,
      search: queryParams
    });

    callback(null, masterTag);
  }
}

registerVideoSupport('dfp', {
  buildAdpodVideoUrl: buildAdpodVideoUrl,
  getAdpodTargeting: (args) => adpodUtils.getTargeting(args)
});

submodule('adpod', adpodUtils);
