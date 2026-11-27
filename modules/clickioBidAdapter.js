import { deepSetValue, formatQS } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getUserSyncParams } from '../libraries/userSyncUtils/userSyncUtils.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'clickio';
const IAB_GVL_ID = 1500;
const SYNC_HOST = 'https://o.clickiocdn.com';
const PIXEL_SYNCS = 5;

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.params', bidRequest.params);
    return imp;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: IAB_GVL_ID,
  supportedMediaTypes: [BANNER],
  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return [{
      method: 'POST',
      url: 'https://o.clickiocdn.com/bids',
      data
    }];
  },
  isBidRequestValid(bid) {
    return true;
  },
  interpretResponse(response, request) {
    const bids = converter.fromORTB({ response: response.body, request: request.data }).bids;
    return bids;
  },
  getUserSyncs(syncOptions, _, gdprConsent, uspConsent, gppConsent) {
    const query = formatQS(getUserSyncParams(gdprConsent, uspConsent, gppConsent));
    if (syncOptions.iframeEnabled) {
      return [{ type: 'iframe', url: `${SYNC_HOST}/cookie_sync_html${query ? '?' + query : ''}` }];
    }
    if (!syncOptions.pixelEnabled) {
      return [];
    }
    // Image i: the sync server redirects it to the i-th demand partner without a user ID (1x1 GIF if none).
    const syncs = [];
    for (let i = 0; i < PIXEL_SYNCS; i++) {
      syncs.push({ type: 'image', url: `${SYNC_HOST}/cookie_sync_img?i=${i}${query ? '&' + query : ''}` });
    }
    return syncs;
  }
};

registerBidder(spec);
