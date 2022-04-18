import { GAM_VENDOR } from './videoModule/constants/vendorCodes.js';
import { adServerDirectory } from './adServerModule/vendorDirectory.js';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * @constructor
 * @param {Object} dfpModule_ - the DFP ad server module
 * @returns {AdServerProvider}
 */
function GamAdServerProvider(dfpModule_) {
  const dfp = dfpModule_;

  function getAdTagUrl(adUnit, baseAdTag) {
    return dfp.buildVideoUrl({ adUnit: adUnit, url: baseAdTag });
  }

  return {
    getAdTagUrl
  }
}
function gamSubmoduleFactory() {
  const dfp = getGlobal().adServers.dfp;
  const gamProvider = GamAdServerProvider(dfp);
  return gamProvider;
}

gamSubmoduleFactory.vendorCode = GAM_VENDOR;
adServerDirectory[GAM_VENDOR] = gamSubmoduleFactory;
