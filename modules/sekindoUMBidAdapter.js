import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
export const spec = {
  code: 'sekindoUM',
  supportedMediaTypes: ['banner', 'video'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (bid.mediaType == 'video' || (typeof bid.mediaTypes == 'object' && typeof bid.mediaTypes.video == 'object')) {
      if (typeof bid.params.video != 'object' || typeof bid.params.video.playerWidth == 'undefined' || typeof bid.params.video.playerHeight == 'undefined') {
        return false;
      }
    }
    return !!(bid.params.spaceId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    var pubUrl = null;
    try {
      if (window.top == window) {
        pubUrl = window.location.href;
      } else {
        try {
          pubUrl = window.top.location.href;
        } catch (e2) {
          pubUrl = document.referrer;
        }
      }
    } catch (e1) {}

    return validBidRequests.map(bidRequest => {
      var subId = utils.getBidIdParameter('subId', bidRequest.params);
      var spaceId = utils.getBidIdParameter('spaceId', bidRequest.params);
      var bidfloor = utils.getBidIdParameter('bidfloor', bidRequest.params);
      var protocol = (document.location.protocol === 'https:' ? 's' : '');
      var queryString = '';

      queryString = utils.tryAppendQueryString(queryString, 's', spaceId);
      queryString = utils.tryAppendQueryString(queryString, 'subId', subId);
      queryString = utils.tryAppendQueryString(queryString, 'pubUrl', pubUrl);
      queryString = utils.tryAppendQueryString(queryString, 'hbTId', bidRequest.transactionId);
      queryString = utils.tryAppendQueryString(queryString, 'hbBidId', bidRequest.bidId);
      queryString = utils.tryAppendQueryString(queryString, 'hbver', '4');
      queryString = utils.tryAppendQueryString(queryString, 'hbcb', '1');/// legasy
      queryString = utils.tryAppendQueryString(queryString, 'dcpmflr', bidfloor);
      queryString = utils.tryAppendQueryString(queryString, 'protocol', protocol);
      queryString = utils.tryAppendQueryString(queryString, 'x', bidRequest.params.width);
      queryString = utils.tryAppendQueryString(queryString, 'y', bidRequest.params.height);
      if (bidderRequest && bidderRequest.gdprConsent) {
        queryString = utils.tryAppendQueryString(queryString, 'gdprConsent', bidderRequest.gdprConsent.consentString);
        queryString = utils.tryAppendQueryString(queryString, 'gdpr', (bidderRequest.gdprConsent.gdprApplies) ? '1' : '0');
      }
      if (bidRequest.mediaType === 'video' || (typeof bidRequest.mediaTypes == 'object' && typeof bidRequest.mediaTypes.video == 'object')) {
        queryString = utils.tryAppendQueryString(queryString, 'x', bidRequest.params.playerWidth);
        queryString = utils.tryAppendQueryString(queryString, 'y', bidRequest.params.playerHeight);
        if (typeof vid_vastType != 'undefined') { // eslint-disable-line camelcase
          queryString = utils.tryAppendQueryString(queryString, 'vid_vastType', bidRequest.params.vid_vastType);
        }
        if (typeof bidRequest.mediaTypes == 'object' && typeof bidRequest.mediaTypes.video == 'object' && typeof bidRequest.mediaTypes.video.context == 'string') {
          queryString = utils.tryAppendQueryString(queryString, 'vid_context', bidRequest.mediaTypes.video.context);
        }
      }

      var endpointUrl = 'https' + '://hb.sekindo.com/live/liveView.php';

      return {
        method: 'GET',
        url: endpointUrl,
        data: queryString,
      };
    });
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    if (typeof serverResponse !== 'object') {
      return [];
    }

    let bidResponses = [];
    var bidResponse = {
      requestId: serverResponse.body.id,
      bidderCode: spec.code,
      cpm: serverResponse.body.cpm,
      width: serverResponse.body.width,
      height: serverResponse.body.height,
      creativeId: serverResponse.body.creativeId,
      currency: serverResponse.body.currency,
      netRevenue: serverResponse.body.netRevenue,
      ttl: serverResponse.body.ttl
    };
    if (bidRequest.mediaType == 'video') {
      if (typeof serverResponse.body.vastUrl != 'undefined') {
        bidResponse.vastUrl = serverResponse.body.vastUrl;
      } else {
        bidResponse.vastXml = serverResponse.body.vastXml;
      }
    } else {
      bidResponse.ad = serverResponse.body.ad;
    }

    bidResponses.push(bidResponse);
    return bidResponses;
  }
}
registerBidder(spec);
