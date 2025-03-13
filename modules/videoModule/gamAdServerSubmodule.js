import { GAM_VENDOR } from '../../libraries/video/constants/vendorCodes.js';
import { getGlobal } from '../../src/prebidGlobal.js';

/**
 * @class
 * @param {Object} dfpModule_ - the DFP ad server module
 */
function GamAdServerProvider(dfpModule_) {
  const dfp = dfpModule_;

  function getAdTagUrl(adUnit, baseAdTag, params) {
    return dfp.buildVideoUrl({ adUnit: adUnit, url: baseAdTag, params });
  }

  return {
    getAdTagUrl
  }
}

export function gamSubmoduleFactory() {
  const dfp = getGlobal().adServers.dfp;
  const gamProvider = GamAdServerProvider(dfp);
  return gamProvider;
}

gamSubmoduleFactory.vendorCode = GAM_VENDOR;
