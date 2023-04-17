import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { generateUUID, getWindowTop, getWindowSelf } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

export const BIDDER_CODE = 'ad2iction';
export const SUPPORTED_AD_TYPES = [BANNER];
export const API_ENDPOINT = 'https://testads.ad2iction.com/html/v2/';
export const API_VERSION_NUMBER = 8;
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
    return validBidRequests.map(bid => {
      const w = canAccessTopWindow() ? getWindowTop() : getWindowSelf();
      const options = {
        contentType: 'application/json',
        withCredentials: false,
      };

      const data = {
        id: bid.params.id,
        rf: bidderRequest.refererInfo.page,
        o: w.innerWidth > w.innerHeight ? 'l' : 'p',
        v: API_VERSION_NUMBER,
        size: 'infinity',
        prebid: 1,
        iso: navigator.browserLanguage ||
                        navigator.language,
        udid: storage.getCookie(COOKIE_NAME),
        bidId: bid.bidId,
        _: Math.round(new Date().getTime()),
      };
      return {
        method: 'GET',
        url: API_ENDPOINT,
        data,
        options
      };
    });
  },
  interpretResponse: function (responseObj) {
    if (!responseObj) return [];
    const ad = responseObj.body;

    ad['requestId'] = ad['bidId'];
    delete ad['bidId'];

    return [ad];
  }
};

registerBidder(spec);
