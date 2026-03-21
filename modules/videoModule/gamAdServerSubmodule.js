import { GAM_VENDOR } from '../../libraries/video/constants/vendorCodes.js';
import { getGlobal } from '../../src/prebidGlobal.js';

/**
 * @class
 * @param {Object} gamModule_ - the GAM ad server module
 */
function GamAdServerProvider(gamModule_) {
  const dfp = gamModule_;

  function getAdTagUrl(adUnit, baseAdTag, params, bid) {
    return dfp.buildVideoUrl({ adUnit: adUnit, url: baseAdTag, params, bid });
  }

  async function getVastXml(adUnit, baseAdTag, params, bid) {
    return dfp.getVastXml({ adUnit: adUnit, url: baseAdTag, params, bid });
  }

  return {
    getAdTagUrl,
    getVastXml
  }
}

export function gamSubmoduleFactory() {
  const dfp = getGlobal().adServers.gam;
  const gamProvider = GamAdServerProvider(dfp);
  return gamProvider;
}

gamSubmoduleFactory.vendorCode = GAM_VENDOR;
