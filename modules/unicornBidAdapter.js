import * as utils from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();
const BIDDER_CODE = 'unicorn';
const UNICORN_ENDPOINT = 'https://ds.uncn.jp/pb/0/bid.json';
const UNICORN_DEFAULT_CURRENCY = 'JPY';
const UNICORN_PB_COOKIE_KEY = '__pb_unicorn_aud';

/**
 * Placement ID and Account ID are required.
 * @param {BidRequest} bidRequest
 * @returns {boolean}
 */
const isBidRequestValid = bidRequest => {
  return !!bidRequest.adUnitCode && !!bidRequest.params.accountId;
};

/**
 * @param {Array<BidRequest>} validBidRequests
 * @param {any} bidderRequest
 * @returns {ServerRequest}
 */
export const buildRequests = (validBidRequests, bidderRequest) => {
  return {
    method: 'POST',
    url: UNICORN_ENDPOINT,
    data: buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest)
  };
};

/**
 * Transform BidRequest to OpenRTB-formatted BidRequest Object
 * @param {Array<BidRequest>} validBidRequests
 * @param {any} bidderRequest
 * @returns {string}
 */
function buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest) {
  utils.logInfo(
    '[UNICORN] buildOpenRtbBidRequestPayload.validBidRequests:',
    validBidRequests
  );
  utils.logInfo(
    '[UNICORN] buildOpenRtbBidRequestPayload.bidderRequest:',
    bidderRequest
  );
  const imp = validBidRequests.map(br => {
    const sizes = utils.parseSizesInput(br.sizes)[0];
    return {
      id: br.bidId,
      banner: {
        w: sizes.split('x')[0],
        h: sizes.split('x')[1]
      },
      tagid: utils.deepAccess(br, 'params.placementId') || br.adUnitCode,
      secure: 1,
      bidfloor: parseFloat(utils.deepAccess(br, 'params.bidfloorCpm') || 0)
    };
  });
  const request = {
    id: bidderRequest.auctionId,
    at: 1,
    imp,
    cur: UNICORN_DEFAULT_CURRENCY,
    site: {
      id: utils.deepAccess(validBidRequests[0], 'params.mediaId') || '',
      publisher: {
        id: utils.deepAccess(validBidRequests[0], 'params.publisherId') || 0
      },
      domain: window.location.hostname,
      page: window.location.href,
      ref: bidderRequest.refererInfo.referer
    },
    device: {
      language: navigator.language,
      ua: navigator.userAgent
    },
    user: {
      id: getUid()
    },
    bcat: utils.deepAccess(validBidRequests[0], 'params.bcat') || [],
    source: {
      ext: {
        stype: 'prebid_uncn',
        bidder: BIDDER_CODE
      }
    },
    ext: {
      accountId: utils.deepAccess(validBidRequests[0], 'params.accountId')
    }
  };
  utils.logInfo('[UNICORN] OpenRTB Formatted Request:', request);
  return JSON.stringify(request);
}

const interpretResponse = (serverResponse, request) => {
  utils.logInfo('[UNICORN] interpretResponse.serverResponse:', serverResponse);
  utils.logInfo('[UNICORN] interpretResponse.request:', request);
  const res = serverResponse.body;
  var bids = []
  if (res) {
    res.seatbid.forEach(sb => {
      sb.bid.forEach(b => {
        bids.push({
          requestId: b.impid,
          cpm: b.price || 0,
          width: b.w,
          height: b.h,
          ad: b.adm,
          ttl: 1000,
          creativeId: b.crid,
          netRevenue: false,
          currency: res.cur
        })
      })
    });
  }
  utils.logInfo('[UNICORN] interpretResponse bids:', bids);
  return bids;
};

/**
 * Get or Create Uid for First Party Cookie
 */
const getUid = () => {
  const ck = storage.getCookie(UNICORN_PB_COOKIE_KEY);
  if (ck) {
    return JSON.parse(ck)['uid'];
  } else {
    const newCk = {
      uid: utils.generateUUID()
    };
    const expireIn = new Date(Date.now() + 24 * 60 * 60 * 10000).toUTCString();
    storage.setCookie(UNICORN_PB_COOKIE_KEY, JSON.stringify(newCk), expireIn);
    return newCk.uid;
  }
};

export const spec = {
  code: BIDDER_CODE,
  aliases: ['uncn'],
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);
