import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { getWindowSelf, getWindowTop } from '../src/utils.js';

export const BIDDER_CODE = 'ad2iction';
export const SUPPORTED_AD_TYPES = [BANNER];
export const API_ENDPOINT = 'https://ads.ad2iction.com/html/prebid/';
export const API_VERSION_NUMBER = 2;
export const COOKIE_NAME = 'ad2udid';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const canAccessTopWindow = () => {
  try {
    return !!getWindowTop().location.href;
  } catch (errro) {
    return false;
  }
};

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ad2'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: (bid) =>
    !!bid.params.id && typeof bid.params.id === 'string',
  buildRequests: (validBidRequests, bidderRequest) => {
    const ids = validBidRequests.map(bid => {
      return { bannerId: bid.params.id, bidId: bid.bidId };
    });
    const w = canAccessTopWindow() ? getWindowTop() : getWindowSelf();
    const options = {
      contentType: 'application/json',
      withCredentials: false,
    };
    const udid = storage.cookiesAreEnabled() && storage.getCookie(COOKIE_NAME);

    const data = {
      ids: JSON.stringify(ids),
      rf: bidderRequest.refererInfo.page,
      o: w.innerWidth > w.innerHeight ? 'l' : 'p',
      v: API_VERSION_NUMBER,
      iso: navigator.browserLanguage ||
                      navigator.language,
      udid: udid || '',
      _: Math.round(new Date().getTime()),
    };
    return {
      method: 'GET',
      url: API_ENDPOINT,
      data,
      options
    };
  },
  interpretResponse: (serverResponse, bidRequest) => {
    if (!Array.isArray(serverResponse.body)) {
      return [];
    }

    const bidResponses = serverResponse.body;

    return bidResponses;
  },
};

registerBidder(spec);
