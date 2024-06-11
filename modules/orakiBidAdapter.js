import { logMessage, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'oraki';
const AD_URL = 'https://eu1.oraki.io/pbjs';
const SYNC_URL = 'https://sync.oraki.io';

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
  const { params, bidId, mediaTypes, transactionId, userIdAsEids } = bid;
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
    placement.plcmt = mediaTypes[VIDEO].plcmt;
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

  if (transactionId) {
    placement.ext = placement.ext || {};
    placement.ext.tid = transactionId;
  }

  if (userIdAsEids && userIdAsEids.length) {
    placement.eids = userIdAsEids;
  }

  return placement;
}

function getBidFloor(bid) {
  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch {
    return 0;
  }
}

export const spec = {
  code: BIDDER_CODE,
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
    const device = deepAccess(bidderRequest, 'ortb2.device');
    const page = deepAccess(bidderRequest, 'refererInfo.page', '');

    let pageURL;
    try {
      pageURL = page && new URL(page);
    } catch (e) {
      logMessage(e);
    }

    const placements = [];
    const request = {
      deviceWidth: device?.w || 0,
      deviceHeight: device?.h || 0,
      language: device?.language?.split('-')[0] || '',
      secure: pageURL.protocol === 'https:' ? 1 : 0,
      host: pageURL.host,
      page: pageURL.href,
      placements,
      coppa: deepAccess(bidderRequest, 'ortb2.regs.coppa') ? 1 : 0,
      tmax: bidderRequest.timeout
    };

    if (bidderRequest.uspConsent) {
      request.ccpa = bidderRequest.uspConsent;
    }

    if (bidderRequest.gdprConsent) {
      request.gdpr = {
        consentString: bidderRequest.gdprConsent.consentString
      };
    }

    if (bidderRequest.gppConsent) {
      request.gpp = bidderRequest.gppConsent.gppString;
      request.gpp_sid = bidderRequest.gppConsent.applicableSections;
    } else if (bidderRequest.ortb2?.regs?.gpp) {
      request.gpp = bidderRequest.ortb2.regs.gpp;
      request.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
    }

    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];
      placements.push(getPlacementReqData(bid));
    }

    return {
      method: 'POST',
      url: AD_URL,
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
    let syncType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let syncUrl = SYNC_URL + `/${syncType}?pbjs=1`;

    if (gdprConsent && gdprConsent.consentString) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        syncUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        syncUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (uspConsent && uspConsent.consentString) {
      syncUrl += `&ccpa_consent=${uspConsent.consentString}`;
    }

    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      syncUrl += '&gpp=' + gppConsent.gppString;
      syncUrl += '&gpp_sid=' + gppConsent.applicableSections.join(',');
    }

    const coppa = config.getConfig('coppa') ? 1 : 0;
    syncUrl += `&coppa=${coppa}`;

    return [{
      type: syncType,
      url: syncUrl
    }];
  }
};

registerBidder(spec);
