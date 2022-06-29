import {deepAccess, isFn, logError, logMessage} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'smarthub';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency || !bid.hasOwnProperty('netRevenue')) {
    return false;
  }
  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.width && bid.height && (bid.vastUrl || bid.vastXml));
    case NATIVE:
      return Boolean(bid.native && bid.native.impressionTrackers && bid.native.impressionTrackers.length);
    default:
      return false;
  }
}

function getPlacementReqData(bid) {
  const { params, bidId, mediaTypes } = bid;
  const schain = bid.schain || {};
  const { partnerName, seat, token, iabCat, minBidfloor, pos } = params;
  const bidfloor = getBidFloor(bid);

  const placement = {
    partnerName: partnerName.toLowerCase(),
    seat,
    token,
    iabCat,
    minBidfloor,
    pos,
    bidId,
    schain,
    bidfloor
  };

  if (mediaTypes && mediaTypes[BANNER]) {
    placement.adFormat = BANNER;
    placement.sizes = mediaTypes[BANNER].sizes;
  } else if (mediaTypes && mediaTypes[VIDEO]) {
    placement.adFormat = VIDEO;
    placement.playerSize = mediaTypes[VIDEO].playerSize;
    placement.minduration = mediaTypes[VIDEO].minduration;
    placement.maxduration = mediaTypes[VIDEO].maxduration;
    placement.mimes = mediaTypes[VIDEO].mimes;
    placement.protocols = mediaTypes[VIDEO].protocols;
    placement.startdelay = mediaTypes[VIDEO].startdelay;
    placement.placement = mediaTypes[VIDEO].placement;
    placement.skip = mediaTypes[VIDEO].skip;
    placement.skipafter = mediaTypes[VIDEO].skipafter;
    placement.minbitrate = mediaTypes[VIDEO].minbitrate;
    placement.maxbitrate = mediaTypes[VIDEO].maxbitrate;
    placement.delivery = mediaTypes[VIDEO].delivery;
    placement.playbackmethod = mediaTypes[VIDEO].playbackmethod;
    placement.api = mediaTypes[VIDEO].api;
    placement.linearity = mediaTypes[VIDEO].linearity;
  } else if (mediaTypes && mediaTypes[NATIVE]) {
    placement.native = mediaTypes[NATIVE];
    placement.adFormat = NATIVE;
  }

  return placement;
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (e) {
    logError(e);
    return 0;
  }
}

function buildRequestParams(bidderRequest = {}, placements = []) {
  let deviceWidth = 0;
  let deviceHeight = 0;

  let winLocation;
  try {
    const winTop = window.top;
    deviceWidth = winTop.screen.width;
    deviceHeight = winTop.screen.height;
    winLocation = winTop.location;
  } catch (e) {
    logMessage(e);
    winLocation = window.location;
  }

  const refferUrl = bidderRequest.refererInfo && bidderRequest.refererInfo.page;
  let refferLocation;
  try {
    refferLocation = refferUrl && new URL(refferUrl);
  } catch (e) {
    logMessage(e);
  }

  let location = refferLocation || winLocation;
  const language = (navigator && navigator.language) ? navigator.language.split('-')[0] : '';
  const host = location.host;
  const page = location.pathname;
  const secure = location.protocol === 'https:' ? 1 : 0;
  return {
    deviceWidth,
    deviceHeight,
    language,
    secure,
    host,
    page,
    placements,
    coppa: config.getConfig('coppa') === true ? 1 : 0,
    ccpa: bidderRequest.uspConsent || undefined,
    gdpr: bidderRequest.gdprConsent || undefined,
    tmax: config.getConfig('bidderTimeout')
  };
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid = {}) => {
    const { params, bidId, mediaTypes } = bid;
    let valid = Boolean(bidId && params && params.partnerName && params.seat && params.token);

    if (mediaTypes && mediaTypes[BANNER]) {
      valid = valid && Boolean(mediaTypes[BANNER] && mediaTypes[BANNER].sizes);
    } else if (mediaTypes && mediaTypes[VIDEO]) {
      valid = valid && Boolean(mediaTypes[VIDEO] && mediaTypes[VIDEO].playerSize);
    } else if (mediaTypes && mediaTypes[NATIVE]) {
      valid = valid && Boolean(mediaTypes[NATIVE]);
    } else {
      valid = false;
    }
    return valid;
  },

  buildRequests: (validBidRequests = [], bidderRequest = {}) => {
    const tempObj = {};

    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];
      const data = getPlacementReqData(bid);
      tempObj[data.partnerName] = tempObj[data.partnerName] || [];
      tempObj[data.partnerName].push(data);
    }

    return Object.keys(tempObj).map(key => {
      const request = buildRequestParams(bidderRequest, tempObj[key]);
      return {
        method: 'POST',
        url: `https://${key}-prebid.smart-hub.io/pbjs`,
        data: request,
      }
    });
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    for (let i = 0; i < serverResponse.body.length; i++) {
      let resItem = serverResponse.body[i];
      if (isBidResponseValid(resItem)) {
        const advertiserDomains = resItem.adomain && resItem.adomain.length ? resItem.adomain : [];
        resItem.meta = { ...resItem.meta, advertiserDomains };

        response.push(resItem);
      }
    }
    return response;
  }
};

registerBidder(spec);
