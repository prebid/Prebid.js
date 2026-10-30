import adapterManager from '../../../src/adapterManager.js';
import { config } from '../../../src/config.js';
import { deepSetValue, logWarn } from '../../../src/utils.js';
import { normalizeGvlid } from '../../../src/consentHandler.js';

export function setRequestExtPrebidAliases(ortbRequest, bidderRequest, context, { am = adapterManager } = {}) {
  if (am.aliasRegistry[bidderRequest.bidderCode]) {
    const bidder = am.bidderRegistry[bidderRequest.bidderCode];
    // adding alias only if alias source bidder exists and alias isn't configured to be standalone
    // pbs adapter
    if (!bidder || !bidder.getSpec().skipPbsAliasing) {
      // set alias
      deepSetValue(
        ortbRequest,
        `ext.prebid.aliases.${bidderRequest.bidderCode}`,
        am.aliasRegistry[bidderRequest.bidderCode]
      );

      // set alias gvlids if present also
      const gvlId = normalizeGvlid(config.getConfig(`gvlMapping.${bidderRequest.bidderCode}`)) || normalizeGvlid(bidder?.getSpec?.().gvlid);
      if (Array.isArray(gvlId)) {
        // Prebid Server accepts a single GVL ID per alias; sending only one of them would ignore the others
        logWarn(`Alias '${bidderRequest.bidderCode}' has multiple GVL IDs (${gvlId.join(', ')}); not sending them to Prebid Server`);
      } else if (gvlId) {
        deepSetValue(
          ortbRequest,
          `ext.prebid.aliasgvlids.${bidderRequest.bidderCode}`,
          gvlId
        );
      }
    }
  }
}
