import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'pubnx';
const BASE_URI = '//hb.pubnxserv.com/vzhbidder/bid?';

export const spec = {
  code: BIDDER_CODE,
  /**
  * Determines whether or not the given bid request is valid.
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId);
  },
  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} - an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: function(bidRequestsArr) {
    var bidRequests = bidRequestsArr || [];
    return bidRequests.map(bid => {
      let slotBidId = utils.getValue(bid, 'bidId');
      let cb = Math.round(new Date().getTime() / 1000);
      let pnxEndPoint = BASE_URI;
      let reqParams = bid.params || {};
      let placementId = utils.getValue(reqParams, 'placementId');
      let cpm = utils.getValue(reqParams, 'cpmFloor');

      if (utils.isEmptyStr(placementId)) {
        utils.logError('missing params:', BIDDER_CODE, 'Enter valid vzPlacementId');
        return;
      }

      let reqSrc = utils.getTopWindowLocation().href;
      var pnxReq = {
        _vzPlacementId: placementId,
        _rqsrc: reqSrc,
        _cb: cb,
        _slotBidId: slotBidId,
        _cpm: cpm,
        _cbn: ''
      };

      let queryParamValue = encodeURIComponent(JSON.stringify(pnxReq));

      return {
        method: 'POST',
        data: {q: queryParamValue},
        url: pnxEndPoint
      };
    })
  },
  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {ServerResponse} serverResponse A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function(serverResponse) {
    var bidRespObj = serverResponse.body;
    const bidResponses = [];

    if (bidRespObj.cpm) {
      const bidResponse = {
        requestId: bidRespObj.slotBidId,
        cpm: Number(bidRespObj.cpm),
        width: Number(bidRespObj.adWidth),
        height: Number(bidRespObj.adHeight),
        netRevenue: true,
        mediaType: 'banner',
        currency: 'USD',
        dealId: null,
        creativeId: bidRespObj.bid,
        ttl: 300,
        ad: bidRespObj.ad + utils.createTrackPixelHtml(decodeURIComponent(bidRespObj.nurl))
      };
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
}
registerBidder(spec);
