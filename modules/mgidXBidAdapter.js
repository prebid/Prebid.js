import {
  isFn,
  deepAccess,
  logMessage,
  logError,
  isPlainObject,
  isNumber,
  isArray,
  isStr
} from '../src/utils.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { USERSYNC_DEFAULT_CONFIG } from '../src/userSync.js';

const BIDDER_CODE = 'mgidX';
const GVLID = 358;
const AD_URL = 'https://#{REGION}#.mgid.com/pbjs';
const PIXEL_SYNC_URL = 'https://cm.mgid.com/i.gif';
const IFRAME_SYNC_URL = 'https://cm.mgid.com/i.html';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency) {
    return false;
  }

  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl || bid.vastXml);
    case NATIVE:
      return Boolean(bid.native && bid.native.impressionTrackers && bid.native.impressionTrackers.length);
    default:
      return false;
  }
}

function getPlacementReqData(bid) {
  const { params, bidId, mediaTypes } = bid;
  const schain = bid.schain || {};
  const { placementId, endpointId } = params;
  const bidfloor = getBidFloor(bid);

  const placement = {
    bidId,
    schain,
    bidfloor
  };

  if (placementId) {
    placement.placementId = placementId;
    placement.type = 'publisher';
  } else if (endpointId) {
    placement.endpointId = endpointId;
    placement.type = 'network';
  }

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
  } catch (err) {
    logError(err);
    return 0;
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid = {}) => {
    const { params, bidId, mediaTypes } = bid;
    let valid = Boolean(bidId && params && (params.placementId || params.endpointId));

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
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

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
    const placements = [];
    const request = {
      deviceWidth,
      deviceHeight,
      language,
      secure,
      host,
      page,
      placements,
      coppa: config.getConfig('coppa') === true ? 1 : 0,
      ccpa: bidderRequest.uspConsent || undefined,
      tmax: bidderRequest.timeout
    };

    if (bidderRequest.gdprConsent) {
      request.gdpr = {
        consentString: bidderRequest.gdprConsent.consentString
      };
    }

    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];
      placements.push(getPlacementReqData(bid));
    }

    const region = validBidRequests[0].params?.region;

    let url;
    if (region === 'eu') {
      url = AD_URL.replace('#{REGION}#', 'eu');
    } else {
      url = AD_URL.replace('#{REGION}#', 'us-east-x');
    }

    return {
      method: 'POST',
      url: url,
      data: request
    };
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
  },

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    const spb = isPlainObject(config.getConfig('userSync')) &&
    isNumber(config.getConfig('userSync').syncsPerBidder)
      ? config.getConfig('userSync').syncsPerBidder : USERSYNC_DEFAULT_CONFIG.syncsPerBidder;

    if (spb > 0 && isPlainObject(syncOptions) && (syncOptions.iframeEnabled || syncOptions.pixelEnabled)) {
      let pixels = [];
      if (serverResponses &&
        isArray(serverResponses) &&
        serverResponses.length > 0 &&
        isPlainObject(serverResponses[0].body) &&
        isPlainObject(serverResponses[0].body.ext) &&
        isArray(serverResponses[0].body.ext.cm) &&
        serverResponses[0].body.ext.cm.length > 0) {
        pixels = serverResponses[0].body.ext.cm;
      }

      const syncs = [];
      const query = [];
      query.push('cbuster={cbuster}');
      query.push('gdpr_consent=' + encodeURIComponent(isPlainObject(gdprConsent) && isStr(gdprConsent?.consentString) ? gdprConsent.consentString : ''));
      if (isPlainObject(gdprConsent) && typeof gdprConsent?.gdprApplies === 'boolean' && gdprConsent.gdprApplies) {
        query.push('gdpr=1');
      } else {
        query.push('gdpr=0');
      }
      if (isPlainObject(uspConsent) && uspConsent?.consentString) {
        query.push(`us_privacy=${encodeURIComponent(uspConsent?.consentString)}`);
      }
      if (isPlainObject(gppConsent) && gppConsent?.gppString) {
        query.push(`gppString=${encodeURIComponent(gppConsent?.gppString)}`);
      }
      if (config.getConfig('coppa')) {
        query.push('coppa=1')
      }
      const q = query.join('&')
      if (syncOptions.iframeEnabled) {
        syncs.push({
          type: 'iframe',
          url: IFRAME_SYNC_URL + '?' + q.replace('{cbuster}', Math.round(new Date().getTime()))
        });
      } else if (syncOptions.pixelEnabled) {
        if (pixels.length === 0) {
          for (let i = 0; i < spb; i++) {
            syncs.push({
              type: 'image',
              url: PIXEL_SYNC_URL + '?' + q.replace('{cbuster}', Math.round(new Date().getTime())) // randomly selects partner if sync required
            });
          }
        } else {
          for (let i = 0; i < spb && i < pixels.length; i++) {
            syncs.push({
              type: 'image',
              url: pixels[i] + (pixels[i].indexOf('?') > 0 ? '&' : '?') + q.replace('{cbuster}', Math.round(new Date().getTime()))
            });
          }
        }
      }
      return syncs;
    }
  }
};

registerBidder(spec);
