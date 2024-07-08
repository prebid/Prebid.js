import {deepAccess, isFn, logError, logMessage} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import { interpretResponse, isBidRequestValid } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'smarthub';
const ALIASES = [
  {code: 'markapp', skipPbsAliasing: true},
  {code: 'jdpmedia', skipPbsAliasing: true},
  {code: 'tredio', skipPbsAliasing: true},
  {code: 'vimayx', skipPbsAliasing: true},
];
const BASE_URLS = {
  smarthub: 'https://prebid.smart-hub.io/pbjs',
  markapp: 'https://markapp-prebid.smart-hub.io/pbjs',
  jdpmedia: 'https://jdpmedia-prebid.smart-hub.io/pbjs',
  tredio: 'https://tredio-prebid.smart-hub.io/pbjs',
  vimayx: 'https://vimayx-prebid.smart-hub.io/pbjs',
};

const _getUrl = (partnerName) => {
  const aliases = ALIASES.map(el => el.code);
  if (aliases.includes(partnerName)) {
    return BASE_URLS[partnerName];
  }

  return `${BASE_URLS[BIDDER_CODE]}?partnerName=${partnerName}`;
}

const _isBidResponseValid = (bid) => {
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

const _getPlacementReqData = (bid) => {
  const { params, bidId, mediaTypes, bidder } = bid;
  const schain = bid.schain || {};
  const { partnerName, seat, token, iabCat, minBidfloor, pos } = params;
  const bidfloor = _getBidFloor(bid);

  const plcmt = {
    partnerName: String(partnerName || bidder).toLowerCase(),
    seat,
    token,
    iabCat,
    minBidfloor,
    pos,
    bidId,
    schain,
    bidfloor,
  };

  if (mediaTypes && mediaTypes[BANNER]) {
    plcmt.adFormat = BANNER;
    plcmt.sizes = mediaTypes[BANNER].sizes;
  } else if (mediaTypes && mediaTypes[VIDEO]) {
    plcmt.adFormat = VIDEO;
    plcmt.playerSize = mediaTypes[VIDEO].playerSize;
    plcmt.minduration = mediaTypes[VIDEO].minduration;
    plcmt.maxduration = mediaTypes[VIDEO].maxduration;
    plcmt.mimes = mediaTypes[VIDEO].mimes;
    plcmt.protocols = mediaTypes[VIDEO].protocols;
    plcmt.startdelay = mediaTypes[VIDEO].startdelay;
    plcmt.placement = mediaTypes[VIDEO].plcmt;
    plcmt.plcmt = mediaTypes[VIDEO].plcmt; // https://github.com/prebid/Prebid.js/issues/10452
    plcmt.skip = mediaTypes[VIDEO].skip;
    plcmt.skipafter = mediaTypes[VIDEO].skipafter;
    plcmt.minbitrate = mediaTypes[VIDEO].minbitrate;
    plcmt.maxbitrate = mediaTypes[VIDEO].maxbitrate;
    plcmt.delivery = mediaTypes[VIDEO].delivery;
    plcmt.playbackmethod = mediaTypes[VIDEO].playbackmethod;
    plcmt.api = mediaTypes[VIDEO].api;
    plcmt.linearity = mediaTypes[VIDEO].linearity;
  } else if (mediaTypes && mediaTypes[NATIVE]) {
    plcmt.native = mediaTypes[NATIVE];
    plcmt.adFormat = NATIVE;
  }

  return plcmt;
}

const _getBidFloor = (bid) => {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  let bidFloor = 0;
  try {
    const bidFloorObj = bid.getFloor({ currency: 'USD', mediaType: '*', size: '*' });
    bidFloor = bidFloorObj.floor;
    return bidFloor;
  } catch (e) {
    logError(e);
    return bidFloor;
  }
}

const _buildRequestParams = (bidderRequest = {}, placements = []) => {
  let width = 0;
  let height = 0;

  let windowLocation;
  try {
    const windowTop = window.top;
    width = windowTop.screen.width;
    height = windowTop.screen.height;
    windowLocation = windowTop.location;
  } catch (e) {
    logMessage(e);
    windowLocation = window.location;
  }

  const refererUrl = bidderRequest.refererInfo && bidderRequest.refererInfo.page;
  let referLocation;
  try {
    referLocation = refererUrl && new URL(refererUrl);
  } catch (e) {
    logMessage(e);
  }

  let location = referLocation || windowLocation;
  const isNavigator = navigator && navigator.language;
  const language = isNavigator ? navigator.language.split('-')[0] : '';
  const locationHost = location.host;
  const locationPath = location.pathname;
  const locationSecure = location.protocol === 'https:' ? 1 : 0;
  const coppaStatus = config.getConfig('coppa') ? 1 : 0;
  return {
    deviceWidth: width,
    deviceHeight: height,
    language,
    secure: locationSecure,
    host: locationHost,
    page: locationPath,
    placements,
    coppa: coppaStatus,
    ccpa: bidderRequest.uspConsent || undefined,
    gdpr: bidderRequest.gdprConsent || undefined,
    tmax: bidderRequest.timeout
  };
}

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  // convert Native ORTB definition to old-style prebid native definition
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  const tempObj = {};

  const len = validBidRequests.length;
  for (let i = 0; i < len; i++) {
    const bid = validBidRequests[i];
    const data = _getPlacementReqData(bid);
    tempObj[data.partnerName] = tempObj[data.partnerName] || [];
    tempObj[data.partnerName].push(data);
  }

  return Object.keys(tempObj).map(key => {
    const request = _buildRequestParams(bidderRequest, tempObj[key]);
    return {
      method: 'POST',
      url: _getUrl(key),
      data: request,
    }
  });
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid,
  buildRequests,
  interpretResponse
};

registerBidder(spec);
