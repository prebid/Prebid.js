import { deepSetValue } from '../../../src/utils.js';

export function setRequestExtPrebidSafeRenderer(ortbRequest, bidderRequest) {
  deepSetValue(
    ortbRequest,
    `ext.prebid.safeRenderer`,
    true
  );
}

export function setBidResponseSafeRenderer(bidResponse, bid) {
  const { rendererUrl } = bid.ext?.prebid?.meta || {};
  if (rendererUrl) {
    bidResponse.safeRenderer = {
      url: rendererUrl,
    };
  }
}
