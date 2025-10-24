import {deepSetValue} from '../../../src/utils.js';

export function setRequestExtPrebidPageViewIds(ortbRequest, bidderRequest) {
  deepSetValue(
    ortbRequest,
    `ext.prebid.page_view_ids.${bidderRequest.bidderCode}`,
    bidderRequest.pageViewId
  );
}
