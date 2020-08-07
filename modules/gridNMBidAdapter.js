import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'gridNM';
const ENDPOINT_URL = 'https://grid.bidswitch.net/hbnm';
const SYNC_URL = 'https://x.bidswitch.net/sync?ssp=themediagrid';
const TIME_TO_LIVE = 360;
const RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

let hasSynced = false;

const LOG_ERROR_MESS = {
  noAdm: 'Bid from response has no adm parameter - ',
  noPrice: 'Bid from response has no price parameter - ',
  wrongContentType: 'Bid from response has wrong content_type parameter - ',
  noBid: 'Array of bid objects is empty',
  noPlacementCode: 'Can\'t find in requested bids the bid with auid - ',
  emptyUids: 'Uids should be not empty',
  emptySeatbid: 'Seatbid array from response has empty item',
  emptyResponse: 'Response is empty',
  hasEmptySeatbidArray: 'Response has empty seatbid array',
  hasNoArrayOfBids: 'Seatbid from response has no array of bid objects - '
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ VIDEO ],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let invalid =
      !bid.params.source || !utils.isStr(bid.params.source) ||
      !bid.params.secid || !utils.isStr(bid.params.secid) ||
      !bid.params.pubid || !utils.isStr(bid.params.pubid);

    if (!invalid) {
      invalid = !bid.params.video || !bid.params.video.protocols || !bid.params.video.mimes;
    }
    if (!invalid) {
      const {protocols, mimes} = bid.params.video;
      invalid = !utils.isArray(mimes) || !mimes.length || mimes.filter((it) => !(it && utils.isStr(it))).length;
      if (!invalid) {
        invalid = !utils.isArray(protocols) || !protocols.length || protocols.filter((it) => !(utils.isNumber(it) && it > 0 && !(it % 1))).length;
      }
    }
    return !invalid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {bidderRequest} bidderRequest bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests || [];
    const requests = [];

    bids.forEach(bid => {
      const {params, bidderRequestId, sizes} = bid;
      const payload = {
        sizes: utils.parseSizesInput(sizes).join(','),
        r: bidderRequestId,
        wrapperType: 'Prebid_js',
        wrapperVersion: '$prebid.version$'
      };

      if (bidderRequest) {
        if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
          payload.u = bidderRequest.refererInfo.referer;
        }
        if (bidderRequest.timeout) {
          payload.wtimeout = bidderRequest.timeout;
        }
        if (bidderRequest.gdprConsent) {
          if (bidderRequest.gdprConsent.consentString) {
            payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
          }
          payload.gdpr_applies =
            (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean')
              ? Number(bidderRequest.gdprConsent.gdprApplies) : 1;
        }
        if (bidderRequest.uspConsent) {
          payload.us_privacy = bidderRequest.uspConsent;
        }
      }

      requests.push({
        method: 'POST',
        url: ENDPOINT_URL + '?' + utils.parseQueryStringParameters(payload).replace(/\&$/, ''),
        bid: bid,
        data: params // content
      });
    });

    return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    serverResponse = serverResponse && serverResponse.body;
    const bidResponses = [];

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      const serverBid = _getBidFromResponse(serverResponse.seatbid[0]);
      if (serverBid) {
        if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
        else if (!serverBid.price) errorMessage = LOG_ERROR_MESS.noPrice + JSON.stringify(serverBid);
        else if (serverBid.content_type !== 'video') errorMessage = LOG_ERROR_MESS.wrongContentType + serverBid.content_type;
        if (!errorMessage) {
          const bid = bidRequest.bid;
          if (!serverBid.w || !serverBid.h) {
            const size = utils.parseSizesInput(bid.sizes)[0].split('x');
            serverBid.w = size[0];
            serverBid.h = size[1];
          }
          const bidResponse = {
            requestId: bid.bidId,
            bidderCode: spec.code,
            cpm: serverBid.price,
            width: serverBid.w,
            height: serverBid.h,
            creativeId: serverBid.auid || bid.bidderRequestId,
            currency: 'USD',
            netRevenue: false,
            ttl: TIME_TO_LIVE,
            dealId: serverBid.dealid,
            vastXml: serverBid.adm,
            mediaType: VIDEO,
            adResponse: {
              content: serverBid.adm
            }
          };

          if (!bid.renderer && (!bid.mediaTypes || !bid.mediaTypes.video || bid.mediaTypes.video.context === 'outstream')) {
            bidResponse.renderer = createRenderer(bidResponse, {
              id: bid.bidId,
              url: RENDERER_URL
            });
          }
          bidResponses.push(bidResponse);
        }
      }
    }
    if (errorMessage) utils.logError(errorMessage);
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!hasSynced && syncOptions.pixelEnabled) {
      let params = '';

      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params += `&gdpr_consent=${gdprConsent.consentString}`;
        }
      }
      if (uspConsent) {
        params += `&us_privacy=${uspConsent}`;
      }

      hasSynced = true;
      return {
        type: 'image',
        url: SYNC_URL + params
      };
    }
  }
};

function _getBidFromResponse(respItem) {
  if (!respItem) {
    utils.logError(LOG_ERROR_MESS.emptySeatbid);
  } else if (!respItem.bid) {
    utils.logError(LOG_ERROR_MESS.hasNoArrayOfBids + JSON.stringify(respItem));
  } else if (!respItem.bid[0]) {
    utils.logError(LOG_ERROR_MESS.noBid);
  }
  return respItem && respItem.bid && respItem.bid[0];
}

function outstreamRender (bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse
    });
  });
}

function createRenderer (bid, rendererParams) {
  const renderer = Renderer.install({
    id: rendererParams.id,
    url: rendererParams.url,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

export function resetUserSync() {
  hasSynced = false;
}

export function getSyncUrl() {
  return SYNC_URL;
}

registerBidder(spec);
