import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { Renderer } from '../src/Renderer';
import { VIDEO, BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'grid';
const ENDPOINT_URL = '//grid.bidswitch.net/hb';
const TIME_TO_LIVE = 360;
const RENDERER_URL = '//cdn.adnxs.com/renderer/video/ANOutstreamVideo.js';

const LOG_ERROR_MESS = {
  noAuid: 'Bid from response has no auid parameter - ',
  noAdm: 'Bid from response has no adm parameter - ',
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
  supportedMediaTypes: [ BANNER, VIDEO ],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!bid.params.uid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {bidderRequest} bidderRequest bidder request object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const auids = [];
    const bidsMap = {};
    const bids = validBidRequests || [];
    let reqId;

    bids.forEach(bid => {
      reqId = bid.bidderRequestId;
      if (!bidsMap[bid.params.uid]) {
        bidsMap[bid.params.uid] = [bid];
        auids.push(bid.params.uid);
      } else {
        bidsMap[bid.params.uid].push(bid);
      }
    });

    const payload = {
      u: utils.getTopWindowUrl(),
      auids: auids.join(','),
      r: reqId
    };

    if (bidderRequest) {
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
    }

    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: utils.parseQueryStringParameters(payload).replace(/\&$/, ''),
      bidsMap: bidsMap,
    };
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
    const bidsMap = bidRequest.bidsMap;

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(respItem => {
        _addBidResponse(_getBidFromResponse(respItem), bidsMap, bidResponses);
      });
    }
    if (errorMessage) utils.logError(errorMessage);
    return bidResponses;
  }
}

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

function _addBidResponse(serverBid, bidsMap, bidResponses) {
  if (!serverBid) return;
  let errorMessage;
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
  if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
  else {
    const awaitingBids = bidsMap[serverBid.auid];
    if (awaitingBids) {
      awaitingBids.forEach(bid => {
        const size = bid.sizes[0];
        if (serverBid.w && serverBid.h) {
          size[0] = serverBid.w;
          size[1] = serverBid.h;
        }
        const bidResponse = {
          requestId: bid.bidId, // bid.bidderRequestId,
          bidderCode: spec.code,
          cpm: serverBid.price,
          width: size[0],
          height: size[1],
          creativeId: serverBid.auid, // bid.bidId,
          currency: 'USD',
          netRevenue: false,
          ttl: TIME_TO_LIVE,
          dealId: serverBid.dealid
        };
        if (serverBid.content_type === 'video') {
          bidResponse.vastXml = serverBid.adm;
          bidResponse.mediaType = VIDEO;
          bidResponse.adResponse = {
            content: bidResponse.vastXml
          };
          if (!bid.renderer && (!bid.mediaTypes || !bid.mediaTypes.video || bid.mediaTypes.video.context === 'outstream')) {
            bidResponse.renderer = createRenderer(bidResponse, {
              id: bid.bidId,
              url: RENDERER_URL
            });
          }
        } else {
          bidResponse.ad = serverBid.adm;
          bidResponse.mediaType = BANNER;
        }
        bidResponses.push(bidResponse);
      });
    } else {
      errorMessage = LOG_ERROR_MESS.noPlacementCode + serverBid.auid;
    }
  }
  if (errorMessage) {
    utils.logError(errorMessage);
  }
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

registerBidder(spec);
