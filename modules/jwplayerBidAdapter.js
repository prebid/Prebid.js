// import * as utils from 'src/utils';
import { registerBidder } from '../src/adapters/bidderFactory.js';
// import { config } from 'src/config';
import { VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, isFn } from '../src/utils.js';

const BIDDER_CODE = 'jwplayer';
const URL = 'https://ib.adnxs.com/openrtb2/prebid';

const GVLID = 1046;
const SUPPORTED_AD_TYPES = [VIDEO];

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
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequest) {
    if (!bidRequests) {
      return;
    }

    return bidRequests.map(bidRequest => {
      const payload = buildRequest(bidRequest, bidderRequests);

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
  const {params} = bidRequest;

  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams
  }

  const video = {
    w: parseInt(videoParams.playerSize[0][0], 10),
    h: parseInt(videoParams.playerSize[0][1], 10)
  }

  // Bid FLoor
  const bidFloorRequest = {
    currency: bidRequest.params.cur || 'USD',
    mediaType: 'video',
    size: '*'
  };

  let floorData = bidRquest.params;
  if (isFn(bidRequest.getFloor)) {
    floorData = bidRequest.getFloor(bidFloorRequest);
  } else {
    if (params.bidfloor) {
      floorData = {floor: params.bidfloor, currency: params.currency || 'USD'};
    }
  }
  
  // Open RTB Request Object
  const openrtbRequest = {
    id: bidRequest.bidId,
    imp: [
      {
        id: '1',
        video: video,
        secure: isSecure() ? 1 : 0,
        bidfloor: floorData.floor,
        bidfloorcur: floorData.currency
      }
    ],
    site: {
      domain: window.location.hostname,
      page: window.location.href,
      ref: bidRequest.refererInfo ? bidRequest.refererInfo.referer || null : null
    },
    ext: {
      hb: 1,
      prebidver: '$prebid.version$',
      adapterver: spec.VERSION
    }
  }

  // content

  // Attaching GDPR Consent Params
  if (bidderRequest.gdprConsent) {
    deepSetValue(openrtbRequest, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    deepSetValue(openrtbRequest, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
  }

  // CCPA
  if (bidderRequest.uspConsent) {
    deepSetValue(openrtbRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  return JSON.stringify(openrtbRequest);
}

registerBidder(spec);
