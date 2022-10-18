import adapterManager from '../../../src/adapterManager.js';
import {deepSetValue} from '../../../src/utils.js';

export function setRequestExtPrebidAliases(ortbRequest, bidderRequest, context, {am = adapterManager} = {}) {
  if (am.aliasRegistry[bidderRequest.bidderCode]) {
    const bidder = am.bidderRegistry[bidderRequest.bidderCode];
    // adding alias only if alias source bidder exists and alias isn't configured to be standalone
    // pbs adapter
    if (!bidder || !bidder.getSpec().skipPbsAliasing) {
      deepSetValue(
        ortbRequest,
        `ext.prebid.aliases.${bidderRequest.bidderCode}`,
        am.aliasRegistry[bidderRequest.bidderCode]
      );
    }
  }
}
