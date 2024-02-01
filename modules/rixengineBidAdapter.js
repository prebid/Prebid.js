import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { isNumber, generateUUID, deepSetValue } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'rixengine';
const USER_ID_KEY = '__algorixjs__owxbgtfdxcd';
const COOKIE_EXP = 86400 * 1000 * 365 * 1; // 1 year
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

let ENDPOINT = null;
let SID = null;
let TOKEN = null;

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY,
    mediaType: BANNER
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.bidfloor) {
      imp.bidfloor = isNumber(bidRequest.params.bidfloor)
        ? bidRequest.params.bidfloor
        : 0.01;
    }
    return imp;
  },
});
function getUserId() {
  let id = getUserIdFromStorage();
  if (!id || !isValidUuid(id)) {
    id = generateUUID();
    setUserId(id);
  }

  setUserId(id);

  return id;
}

function getUserIdFromStorage() {
  const id = storage.localStorageIsEnabled()
    ? storage.getDataFromLocalStorage(USER_ID_KEY)
    : storage.getCookie(USER_ID_KEY);

  return id;
}

function setUserId(userId) {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(USER_ID_KEY, userId);
  }

  if (storage.cookiesAreEnabled()) {
    const expires = new Date(Date.now() + COOKIE_EXP).toISOString();

    storage.setCookie(USER_ID_KEY, userId, expires);
  }
}

function isValidUuid(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (
      Boolean(bid.params.endpoint) &&
      Boolean(bid.params.sid) &&
      Boolean(bid.params.token)
    ) {
      SID = bid.params.sid;
      TOKEN = bid.params.token;
      ENDPOINT = bid.params.endpoint + '?sid=' + SID + '&token=' + TOKEN;
      return true;
    }
    return false;
  },

  buildRequests(bidRequests, bidderRequest) {
    let data = converter.toORTB({ bidRequests, bidderRequest });
    deepSetValue(data, 'user.id', getUserId());
    return [
      {
        method: 'POST',
        url: ENDPOINT,
        data,
        options: { contentType: 'application/json;charset=utf-8' },
      },
    ];
  },

  interpretResponse(response, request) {
    const bids = converter.fromORTB({
      response: response.body,
      request: request.data,
    }).bids;
    return bids;
  },
};

registerBidder(spec);
