import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { generateUUID, getWindowTop, getWindowSelf } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

export const BIDDER_CODE = 'aseal';
export const SUPPORTED_AD_TYPES = [BANNER];
export const API_ENDPOINT = 'https://tkprebid.aotter.net/prebid/adapter';
export const WEB_SESSION_ID_KEY = '__tkwsid';
export const HEADER_AOTTER_VERSION = 'prebid_0.0.2';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const getTrekWebSessionId = () => {
  let wsid =
    storage.localStorageIsEnabled() &&
    storage.getDataFromLocalStorage(WEB_SESSION_ID_KEY);

  if (!wsid) {
    wsid = generateUUID();
    setTrekWebSessionId(wsid);
  }

  return wsid;
};

const setTrekWebSessionId = (wsid) => {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(WEB_SESSION_ID_KEY, wsid);
  }
};

const canAccessTopWindow = () => {
  try {
    return !!getWindowTop().location.href;
  } catch (errro) {
    return false;
  }
};

export const spec = {
  code: BIDDER_CODE,
  aliases: ['aotter', 'trek'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: (bid) =>
    !!bid.params.placeUid && typeof bid.params.placeUid === 'string',
  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests.length === 0) {
      return [];
    }

    const clientId = config.getConfig('aseal.clientId') || '';

    const windowTop = getWindowTop();
    const windowSelf = getWindowSelf();

    const w = canAccessTopWindow() ? windowTop : windowSelf;

    const data = {
      bids: validBidRequests,
      // TODO: please do not pass internal data structures over to the network
      refererInfo: bidderRequest.refererInfo?.legacy,
      device: {
        webSessionId: getTrekWebSessionId(),
      },
      payload: {
        meta: {
          dr: w.document.referrer,
          drs: windowSelf.document.referrer,
          drt: (canAccessTopWindow() && windowTop.document.referrer) || '',
          dt: w.document.title,
          dl: w.location.href,
        },
      },
    };

    const options = {
      contentType: 'application/json',
      withCredentials: true,
      customHeaders: {
        'x-aotter-clientid': clientId,
        'x-aotter-version': HEADER_AOTTER_VERSION,
      },
    };

    return [
      {
        method: 'POST',
        url: API_ENDPOINT,
        data,
        options,
      },
    ];
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
