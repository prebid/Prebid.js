import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { deepAccess, logMessage } from '../../src/utils.js';
import { config } from '../../src/config.js';

const isBidResponseValid = (bid) => {
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
};

const getPlacementReqData = (bid) => {
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
};

const getBidFloor = (bid) => {
  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });

    return bidFloor.floor;
  } catch (err) {
    return 0;
  }
};

export const isBidRequestValid = (bid = {}) => {
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
};

export const buildRequests = (adUrl) => (validBidRequests = [], bidderRequest = {}) => {
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
    url: adUrl,
    data: request
  };
};

export const interpretResponse = (serverResponse) => {
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
};

export const getUserSyncs = (syncUrl) => (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  let type = syncOptions.iframeEnabled ? 'iframe' : 'image';
  let url = syncUrl + `/${type}?pbjs=1`;

  if (gdprConsent && gdprConsent.consentString) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      url += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      url += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
    }
  }

  if (uspConsent && uspConsent.consentString) {
    url += `&ccpa_consent=${uspConsent.consentString}`;
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    url += '&gpp=' + gppConsent.gppString;
    url += '&gpp_sid=' + gppConsent.applicableSections.join(',');
  }

  const coppa = config.getConfig('coppa') ? 1 : 0;
  url += `&coppa=${coppa}`;

  return [{
    type,
    url
  }];
};
