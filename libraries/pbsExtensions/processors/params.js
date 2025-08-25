import {deepSetValue} from '../../../src/utils.js';

export function setImpBidParams(imp, bidRequest) {
  const params = bidRequest.params;
  if (params) {
    deepSetValue(
      imp,
      `ext.prebid.bidder.${bidRequest.bidder}`,
      params
    );
  }
}
