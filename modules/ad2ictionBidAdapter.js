import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { getWindowSelf, getWindowTop, logError, logInfo } from '../src/utils.js';

export const BIDDER_CODE = 'ad2iction';
export const SUPPORTED_AD_TYPES = [BANNER];
export const API_ENDPOINT = 'https://ads.ad2iction.com/html/prebid/';
export const API_VERSION_NUMBER = 2;
export const COOKIE_NAME = 'ad2udid';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const canAccessTopWindow = () => {
  try {
    return !!getWindowTop().location.href;
  } catch (error) {
    return false;
  }
};

const getScreenOrientation = (device) => {
  if (device && device.w && device.h) {
    return device.w > device.h ? 'l' : 'p'
  } else {
    const w = canAccessTopWindow() ? getWindowTop() : getWindowSelf();
    return w.innerWidth > w.innerHeight ? 'l' : 'p'
  }
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ad2'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: (bid) => {
    return !!bid.params.id && typeof bid.params.id === 'string'
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const ids = validBidRequests.map(bid => {
      return { bannerId: bid.params.id, bidId: bid.bidId };
    });

    const options = {
      contentType: 'application/json',
      withCredentials: false,
    };
    const udid = storage.cookiesAreEnabled() && storage.getCookie(COOKIE_NAME);

    const data = {
      ids: JSON.stringify(ids),
      rf: bidderRequest.ortb2.site?.page || bidderRequest.refererInfo.page,
      o: getScreenOrientation(),
      v: API_VERSION_NUMBER,
      iso: bidderRequest.ortb2.device?.language || navigator.browserLanguage ||
        navigator.language,
      udid: udid || '',
      _: Math.round(new Date().getTime()),
    }

    logInfo('===Ad2 buildRequests===', data)

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
  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: (data) => {
    // Bidder specific code
    logError('===Ad2 Timeout===', data)
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: (bid) => {
    // Bidder specific code
    logInfo('===Ad2 Bid won===', bid)
  },

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   * @param {Bid} The bid of which the targeting has been set
   */
  onSetTargeting: (bid) => {
    // Bidder specific code
    logInfo('===Ad2 Set targeting===', bid)
  },

  /**
   * Register bidder specific code, which will execute if the bidder responded with an error
   * @param {error, bidderRequest} An object with the XMLHttpRequest error and the bid request object
   */
  onBidderError: ({ error, bidderRequest }) => {
    // Bidder specific code
    logError('===Ad2 Bidder error===', { error, bidderRequest })
  },
};

registerBidder(spec);
