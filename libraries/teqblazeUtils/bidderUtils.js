import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';

import { config } from '../../src/config.js';

const PROTOCOL_PATTERN = /^[a-z0-9.+-]+:/i;

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

const getBidFloor = (bid) => {
  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });

    return bidFloor?.floor;
  } catch (err) {
    return 0;
  }
};

const createBasePlacement = (bid, bidderRequest) => {
  const { bidId, mediaTypes, transactionId, userIdAsEids, ortb2Imp } = bid;
  const schain = bidderRequest?.ortb2?.source?.ext?.schain || {};
  const bidfloor = getBidFloor(bid);

  const placement = {
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

  if (ortb2Imp?.ext?.gpid) {
    placement.gpid = ortb2Imp.ext.gpid;
  }

  return placement;
};

const defaultPlacementType = (bid, bidderRequest, placement) => {
  const { placementId, endpointId } = bid.params;

  if (placementId) {
    placement.placementId = placementId;
    placement.type = 'publisher';
  } else if (endpointId) {
    placement.endpointId = endpointId;
    placement.type = 'network';
  }
};

const checkIfObjectHasKey = (keys, obj, mode = 'some') => {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = obj[key];

    if (mode === 'some' && val) return true;
    if (mode === 'every' && !val) return false;
  }

  return mode === 'every';
}

export const isBidRequestValid = (keys = ['placementId', 'endpointId'], mode) => (bid = {}) => {
  const { params, bidId, mediaTypes } = bid;
  let valid = Boolean(bidId && params && checkIfObjectHasKey(keys, params, mode));

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

/**
 * @param {{ adUrl, validBidRequests, bidderRequest, placementProcessingFunction }} config
 * @returns {function}
 */
export const buildRequestsBase = (config) => {
  const { adUrl, validBidRequests, bidderRequest } = config;
  const placementProcessingFunction = config.placementProcessingFunction || buildPlacementProcessingFunction();
  const device = bidderRequest?.ortb2?.device;
  const page = bidderRequest?.refererInfo?.page || '';

  const proto = PROTOCOL_PATTERN.exec(page);
  const protocol = proto?.[0];

  const placements = [];
  const request = {
    deviceWidth: device?.w || 0,
    deviceHeight: device?.h || 0,
    language: device?.language?.split('-')[0] || '',
    secure: protocol === 'https:' ? 1 : 0,
    host: bidderRequest?.refererInfo?.domain || '',
    page,
    placements,
    coppa: bidderRequest?.ortb2?.regs?.coppa ? 1 : 0,
    tmax: bidderRequest.timeout,
    bcat: bidderRequest?.ortb2?.bcat,
    badv: bidderRequest?.ortb2?.badv,
    bapp: bidderRequest?.ortb2?.bapp,
    battr: bidderRequest?.ortb2?.battr
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

  if (bidderRequest?.ortb2?.device) {
    request.device = bidderRequest.ortb2.device;
  }

  const len = validBidRequests.length;
  for (let i = 0; i < len; i++) {
    const bid = validBidRequests[i];
    placements.push(placementProcessingFunction(bid, bidderRequest));
  }

  return {
    method: 'POST',
    url: adUrl,
    data: request
  };
};

export const buildRequests = (adUrl) => (validBidRequests = [], bidderRequest = {}) => {
  const placementProcessingFunction = buildPlacementProcessingFunction();

  return buildRequestsBase({ adUrl, validBidRequests, bidderRequest, placementProcessingFunction });
};

export function interpretResponseBuilder({addtlBidValidation = (bid) => true} = {}) {
  return function (serverResponse) {
    const response = [];
    for (let i = 0; i < serverResponse.body.length; i++) {
      const resItem = serverResponse.body[i];
      if (isBidResponseValid(resItem) && addtlBidValidation(resItem)) {
        const advertiserDomains = resItem.adomain && resItem.adomain.length ? resItem.adomain : [];
        resItem.meta = { ...resItem.meta, advertiserDomains };

        response.push(resItem);
      }
    }

    return response;
  }
}

export const interpretResponse = interpretResponseBuilder();

export const getUserSyncs = (syncUrl) => (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
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

/**
 *
 * @param {{ addPlacementType?: function, addCustomFieldsToPlacement?: function }} [config]
 * @returns {function(object, object): object}
 */
export const buildPlacementProcessingFunction = (config) => (bid, bidderRequest) => {
  const addPlacementType = config?.addPlacementType ?? defaultPlacementType;

  const placement = createBasePlacement(bid, bidderRequest);

  addPlacementType(bid, bidderRequest, placement);

  if (config?.addCustomFieldsToPlacement) {
    config.addCustomFieldsToPlacement(bid, bidderRequest, placement);
  }

  return placement;
};
