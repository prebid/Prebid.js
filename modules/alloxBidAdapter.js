import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  createTrackPixelHtml,
  deepAccess,
  deepClone,
  deepEqual,
  generateUUID,
  getWindowLocation,
  isArray,
  isEmpty,
  isStr,
} from '../src/utils.js';

const BIDDER_CODE = 'allox';
const ENDPOINT_URL = 'https://alxd.addlv.smt.docomo.ne.jp/1.0/w/xdp/web.json';
const TIME_TO_LIVE = 30;
const DOCOMO_SOURCE = 'docomo.ne.jp';
const NIDAN_ID_KEY = '__nidan_id';
const STORAGE_KEY = '__allox_trackers';
const STORAGE_TIMEOUT = 3000;

const QUERY_REG = {
  DEBUG: /[&|\?]allox_debug=(\d+)/,
  STB: /[&|\?]stb=(\d+)/g,
  TARGET: /[&|\?]allox_target=([^&]*)/,
  TEST: /[&|\?]allox_test=([^&]*)/,
};

const TRACKER_TYPE = {
  IMP: 1,
  LOSE_NOTICE_WHEN_ALLOX_WIN: 101,
  LOSE_NOTICE_WHEN_ALLOX_LOSE: 102
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TIME_TO_LIVE
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    let lurl;
    let trackers;
    ortbResponse.seatbid.forEach(seat => {
      seat.bid.forEach(bid => {
        lurl = bid.lurl;
        trackers = deepAccess(bid, 'ext.trackers');
      });
    });
    const response = buildResponse(bidResponses, ortbResponse, context);
    response.bids.forEach(bid => {
      if (lurl) {
        bid.lurl = lurl;
      };
      if (trackers) {
        bid.trackers = trackers;
      };
      if (bid.mediaType === BANNER) {
        const impTrackersHtml = trackers
          .filter(tracker => tracker.type === TRACKER_TYPE.IMP)
          .reduce((pre, cur) => `${pre}${createTrackPixelHtml(cur.url)}`, '');
        bid.ad += impTrackersHtml;
      };
    });
    return response;
  }
});

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {

  code: BIDDER_CODE,
  aliases: ['alx'],

  isBidRequestValid: function(bidRequest) {
    const alloxIds = getAlloxIds();
    bidRequest.params.nidanId = isEmpty(alloxIds.nidanId) ? bidRequest.params.nidanId || storage.getDataFromLocalStorage(NIDAN_ID_KEY) : alloxIds.nidanId;
    bidRequest.params.daisyId = isEmpty(alloxIds.daisyId) ? bidRequest.params.daisyId : alloxIds.daisyId;
    return !!bidRequest.params.placementId && includeNidanIdOrDaisyID(bidRequest.params);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(validBidRequest => {
      const context = { mediaType: getMediaType(validBidRequest) };
      const ortbRequest = converter.toORTB({
        bidRequests: [validBidRequest],
        bidderRequest: bidderRequest,
        context: context
      });

      const serverRequest = {
        p: validBidRequest.params.placementId,
        t: `web_${generateUUID()}-${validBidRequest.bidId}`,
        bw: window.innerWidth,
        impid: validBidRequest.bidId,
        n: validBidRequest.params.nidanId,
        d: validBidRequest.params.daisyId
      };

      setRequestParamFromURLParameter(serverRequest, 'debug', QUERY_REG.DEBUG);
      setRequestParamFromURLParameter(serverRequest, 'stb', QUERY_REG.STB);
      setRequestParamFromURLParameter(serverRequest, 'upt', QUERY_REG.TARGET);
      setRequestParamFromURLParameter(serverRequest, 'test', QUERY_REG.TEST);

      const request = {
        method: 'POST',
        url: ENDPOINT_URL,
        data: deepClone(serverRequest),
        options: {
          withCredentials: false
        },
        ortbRequest,
        validBidRequest
      };
      return request;
    });
  },

  interpretResponse: function(serverResponse, request) {
    if (isEmpty(serverResponse.body)) return [];

    const bids = converter.fromORTB({
      response: serverResponse.body,
      request: request.ortbRequest
    }).bids;

    if (storage.localStorageIsEnabled()) {
      const trackersValue = storage.getDataFromLocalStorage(STORAGE_KEY);
      const trackers = trackersValue ? JSON.parse(trackersValue) : {};
      const now = new Date().getTime();
      Object.keys(trackers).forEach(k => {
        if (now - trackers[k].date > STORAGE_TIMEOUT) {
          delete trackers[k];
        }
      })
      const trackersObj = isEmpty(serverResponse.body.seatbid) ? { trackers: deepAccess(serverResponse, 'body.ext.trackers') } : bids[0];
      trackers[request.validBidRequest.adUnitId] = extractTrackers(trackersObj);
      storage.setDataInLocalStorage(STORAGE_KEY, JSON.stringify(trackers));
    }
    return bids;
  },

  supportedMediaTypes: [BANNER]

};

registerBidder(spec);

function getAlloxIds() {
  const userIds = config.getConfig('userSync.userIds') || [];
  let alloxIds = {};

  userIds.forEach(userId => {
    const eids = delveArray(userId, 'params.eids');

    eids.forEach(eid => {
      const source = deepAccess(eid, 'source', null);

      if (deepEqual(source, DOCOMO_SOURCE)) {
        const uids = delveArray(eid, 'uids');

        uids.forEach(uid => {
          if (uid.atype === 1) {
            alloxIds.daisyId = uid.id;
          }
          if (uid.atype === 3) {
            alloxIds.nidanId = uid.id;
          }
        });
      };
    });
  });

  return alloxIds;
}

function delveArray(obj, keypath) {
  const result = deepAccess(obj, keypath, []);
  return isArray(result) ? result : [];
}

function convertStringToBoolean(value) {
  return !!((isStr(value) && value.toLowerCase() === 'true'));
};

function getMediaType(validBidRequest) {
  if (isEmpty(validBidRequest.mediaTypes)) return;

  const keyName = Object.keys(validBidRequest.mediaTypes)[0];
  switch (keyName) {
    case 'banner':
      return BANNER;
    default:
      return undefined;
  };
};

function getURLParameterValue(regexp) {
  const match = getWindowLocation().href.match(regexp);
  if (isEmpty(match)) return;

  let result;
  switch (regexp) {
    case QUERY_REG.DEBUG:
    case QUERY_REG.TARGET:
      result = isNaN(Number(match[1])) ? match[1] : Number(match[1]);
      break;
    case QUERY_REG.TEST:
      result = Number(convertStringToBoolean(match[1]));
      break;
    default:
      result = match.map((v) => {
        const value = v.split('=')[1];
        return isNaN(Number(value)) ? value : Number(value);
      });
  };
  return result;
};

function setRequestParamFromURLParameter(serverRequest, key, regexp) {
  const parsedValue = getURLParameterValue(regexp);
  if (parsedValue) {
    serverRequest[key] = parsedValue;
  };
};

function extractTrackers({trackers, lurl}) {
  const date = new Date().getTime();
  return {trackers, lurl, date};
}

function includeNidanIdOrDaisyID({nidanId, daisyId}) {
  const testValue = getURLParameterValue(QUERY_REG.TEST);
  return testValue ? true : (!!nidanId || !!daisyId)
}
