import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER} from 'src/mediaTypes';
import * as utils from '../src/utils';

export const BIDDER_CODE = 'adikteev';
export const ENDPOINT_URL = 'https://serve-adserver.adikteev.com/api/prebid/bid';
export const ENDPOINT_URL_STAGING = 'https://serve-adserver-staging.adikteev.com/api/prebid/bid';
export const USER_SYNC_IFRAME_URL = 'https://serve-adserver.adikteev.com/api/prebid/sync-iframe';
export const USER_SYNC_IFRAME_URL_STAGING = 'https://serve-adserver-staging.adikteev.com/api/prebid/sync-iframe';
export const USER_SYNC_IMAGE_URL = 'https://serve-adserver.adikteev.com/api/prebid/sync-image';
export const USER_SYNC_IMAGE_URL_STAGING = 'https://serve-adserver-staging.adikteev.com/api/prebid/sync-image';

export let stagingEnvironmentSwitch = false; // Don't use it. Allow us to make tests on staging

export function setstagingEnvironmentSwitch(value) {
  stagingEnvironmentSwitch = value;
}

function validateSizes(sizes) {
  if (!utils.isArray(sizes) || typeof sizes[0] === 'undefined') {
    return false;
  }
  return sizes.every(size => utils.isArray(size) && size.length === 2);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    setstagingEnvironmentSwitch(stagingEnvironmentSwitch || !!bid.params.stagingEnvironment);
    return !!(
      bid &&
      bid.params &&
      bid.params.currency &&
      bid.params.currency === 'EUR' &&
      bid.params.bidFloorPrice &&
      bid.params.placementId &&
      bid.bidder === BIDDER_CODE &&
      validateSizes(bid.mediaTypes.banner.sizes)
    )
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const payload = {
      validBidRequests,
      bidderRequest,
      url: utils.getTopWindowUrl(),
      referrer: utils.getTopWindowReferrer(),
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      language: navigator.language,
      cookies: document.cookie.split(';'),
    };
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: stagingEnvironmentSwitch ? ENDPOINT_URL_STAGING : ENDPOINT_URL,
      data: payloadString,
    };
  },

  interpretResponse: ({body}) => body,

  getUserSyncs: (syncOptions, serverResponses) => {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: stagingEnvironmentSwitch ? USER_SYNC_IFRAME_URL_STAGING : USER_SYNC_IFRAME_URL,
      });
    }
    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: stagingEnvironmentSwitch ? USER_SYNC_IMAGE_URL_STAGING : USER_SYNC_IMAGE_URL,
      });
    }
    return syncs;
  },
};
registerBidder(spec);
