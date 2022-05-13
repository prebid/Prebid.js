// import * as utils from 'src/utils';
import { registerBidder } from '../src/adapters/bidderFactory.js';
// import { config } from 'src/config';
import { VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, isFn } from '../src/utils.js';

const BIDDER_CODE = 'jwplayer';
const URL = 'https://ib.adnxs.com/openrtb2/prebid';

const GVLID = 1046;
const SUPPORTED_AD_TYPES = [VIDEO];

const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) {
      return false;
    }

    return !!bid.params.placementId && !!bid.params.pubId;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests, or ad units, which should be sent to the server.
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    if (!bidRequests) {
      return;
    }

    return bidRequests.map(bidRequest => {
      const payload = buildRequest(bidRequest, bidderRequest);

      return {
        method: 'POST',
        url: URL,
        data: payload
      }
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {},
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {},

  // Optional?
  // onTimeout: function(timeoutData) {},
  // onBidWon: function(bid) {},
  // onSetTargeting: function(bid) {},
  // onBidderError: function({ error, bidderRequest }) {}
};

function buildRequest(bidRequest, bidderRequest) {
  // bidRequest.mediaTypes.video
  // bidRequest.params (bid parameters)

  // bidderRequest.gdprConsent
  // bidderRequest.uspConsent
  
  // Open RTB Request Object
  const openrtbRequest = {
    id: params.bidId,
    imp: buildRequestImpression(bidRequest, bidderRequest),
    site: buildRequestSite(),
    device: buildRequestDevice()
  };

  // Attaching GDPR Consent Params
  if (bidderRequest.gdprConsent) {
    deepSetValue(openrtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    deepSetValue(openrtbRequest, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
  }

  // CCPA
  if (bidderRequest.uspConsent) {
    deepSetValue(openrtbRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  return JSON.stringify(openrtbRequest);;
}

function buildRequestImpression(bidRequest, bidderRequest) {
  const impressions = [];

  const impressionObject = {
    id: bidRequest.adUnitCode,
    secure: isSecure() ? 1 : 0
  };

  impressionObject.video = buildImpressionVideo(bidRequest);

  const bidFloorData = buildBidFloorData(bidRequest);
  impressionObject.bidfloor = bidFloorData.floor;
  impressionObject.bidfloorcur = bidFloorData.currency;
  
  impressionObject.ext = buildImpressionExtension(); // TODO: Complete

  impressions.push(impressionObject);

  return impressions;
}

function buildImpressionVideo(bidRequest) {
  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video', {});

  const playerSize = videoAdUnit.playerSize;

  const contentWidth = playerSize[0][0];
  const contentHeight = playerSize[0][1];

  const video = {
    w: parseInt(contentWidth, 10),
    h: parseInt(contentHeight, 10)
  }

  // Obtain all ORTB params related video from Ad Unit
  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoAdUnit.hasOwnProperty(param)) {
      video[param] = videoAdUnit[param];
    }
  });

  // Placement Inference Rules:
  // - If no placement is defined then default to 1 (In Stream)
  video.placement = video.placement || 2;

  // - If product is instream (for instream context) then override placement to 1
  if (params.context === 'instream') {
    video.startdelay = video.startdelay || 0;
    video.placement = 1;
  }
}

function buildBidFloorData(bidRequest) {
  const {params} = bidRequest;
  // Bid Floor
  const bidFloorRequest = {
    currency: params.currency || 'USD',
    mediaType: 'video',
    size: '*'
  };

  let floorData;
  if (isFn(bidRequest.getFloor)) {
    floorData = bidRequest.getFloor(bidFloorRequest);
  } else if (params.bidfloor) {
    floorData = {floor: params.bidfloor, currency: params.currency || 'USD'};
  }

  return floorData;
}

function buildRequestSite(bidRequest) {
  const site = {
    domain: window.location.hostname,
    page: window.location.href,
    ref: bidRequest.refererInfo ? bidRequest.refererInfo.referer || null : null
  };

  // Site Content
  /*
  if (videoAdUnit.content && isPlainObject(videoAdUnit.content)) {
    openrtbRequest.site.content = {};
    const contentStringKeys = ['id', 'title', 'series', 'season', 'genre', 'contentrating', 'language', 'url'];
    const contentNumberkeys = ['episode', 'prodq', 'context', 'livestream', 'len'];
    const contentArrayKeys = ['cat'];
    const contentObjectKeys = ['ext'];
    for (const contentKey in videoBidderParams.content) {
      if (
        (contentStringKeys.indexOf(contentKey) > -1 && isStr(videoAdUnit.content[contentKey])) ||
        (contentNumberkeys.indexOf(contentKey) > -1 && isNumber(videoAdUnit.content[contentKey])) ||
        (contentObjectKeys.indexOf(contentKey) > -1 && isPlainObject(videoAdUnit.content[contentKey])) ||
        (contentArrayKeys.indexOf(contentKey) > -1 && isArray(videoAdUnit.content[contentKey]) &&
          videoAdUnit.content[contentKey].every(catStr => isStr(catStr)))) {
        site.content[contentKey] = videoAdUnit.content[contentKey];
      } else {
        logMessage('JWPlayer bid adapter validation error: ', contentKey, ' is either not supported is OpenRTB V2.5 or value is undefined');
      }
    }
  }
  */

  return site;
}

function buildRequestDevice() {
  return {
    ua: navigator.userAgent,
    ip: ''
  };
}

registerBidder(spec);
