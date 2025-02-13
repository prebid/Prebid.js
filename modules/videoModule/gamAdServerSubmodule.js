import { GAM_VENDOR } from '../../libraries/video/constants/vendorCodes.js';
import { getGlobal } from '../../src/prebidGlobal.js';

/**
 * @constructor
 * @param {Object} dfpModule_ - the DFP ad server module
 */
function GamAdServerProvider(dfpModule_) {
  const dfp = dfpModule_;

  function getAdTagUrl(adUnit, baseAdTag, params, bid) {
    return dfp.buildVideoUrl({ adUnit: adUnit, url: baseAdTag, params, bid });
  }

  async function replaceVastAdTagWithBlobContent(gamVastWrapper, bid) {
    return dfp.replaceVastAdTagWithBlobContent(gamVastWrapper, bid);
  }

  return {
    getAdTagUrl,
    replaceVastAdTagWithBlobContent
  }
}

export function gamSubmoduleFactory() {
  const dfp = getGlobal().adServers.dfp;
  const gamProvider = GamAdServerProvider(dfp);
  return gamProvider;
}

gamSubmoduleFactory.vendorCode = GAM_VENDOR;
