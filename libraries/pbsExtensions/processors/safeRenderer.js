import { deepSetValue } from '../../../src/utils.js';

export function setRequestExtPrebidSafeRenderer(ortbRequest, bidderRequest) {
  deepSetValue(
    ortbRequest,
    `ext.prebid.safeRenderer`,
    true
  );
}

export function setBidResponseSafeRenderer(bidResponse, bid) {
  if (bid.ext.prebid.meta.rendererUrl) {
    bidResponse.safeRenderer = {
      url: bid.ext.prebid.meta.rendererUrl,
    }
  }
}
