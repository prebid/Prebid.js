import { GAM_VENDOR } from './videoModule/constants/vendorCodes';
import { adServerDirectory } from './videoModule/vendorDirectory';


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
  const dfp = $$PREBID_GLOBAL$$.adServers.dfp;
  const gamProvider = GamAdServerProvider(dfp);
  return gamProvider;
}

gamSubmoduleFactory.vendorCode = GAM_VENDOR;
adServerDirectory[GAM_VENDOR] = gamSubmoduleFactory;
