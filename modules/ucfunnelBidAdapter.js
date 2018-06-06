import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';

const VER = 'ADGENT_PREBID-2018011501';
const BID_REQUEST_BASE_URL = '//hb.aralego.com/header';
const UCFUNNEL_BIDDER_CODE = 'ucfunnel';

export const spec = {
  code: UCFUNNEL_BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Check if the bid is a valid zone ID in either number or string form
   * @param {object} bid the ucfunnel bid to validate
   * @return boolean for whether or not a bid is valid
   */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.adid && typeof bid.params.adid === 'string');
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    var bidRequests = [];
    for (var i = 0; i < validBidRequests.length; i++) {
      var bid = validBidRequests[i];

      var ucfunnelUrlParams = buildUrlParams(bid, bidderRequest);

      bidRequests.push({
        method: 'GET',
        url: BID_REQUEST_BASE_URL,
        bidRequest: bid,
        data: ucfunnelUrlParams
      });
    }
    return bidRequests;
  },

  /**
   * Format ucfunnel responses as Prebid bid responses
   * @param {ucfunnelResponseObj} ucfunnelResponse A successful response from ucfunnel.
   * @return {Bid[]} An array of formatted bids.
  */
  interpretResponse: function (ucfunnelResponseObj, request) {
    var bidResponses = [];
    var bidRequest = request.bidRequest;
    var responseBody = ucfunnelResponseObj ? ucfunnelResponseObj.body : {};

    bidResponses.push({
      requestId: bidRequest.bidId,
      cpm: responseBody.cpm || 0,
      width: responseBody.width,
      height: responseBody.height,
      creativeId: responseBody.ad_id,
      dealId: responseBody.deal || null,
      currency: 'USD',
      netRevenue: true,
      ttl: 1000,
      mediaType: BANNER,
      ad: responseBody.adm
    });

    return bidResponses;
  }
};
registerBidder(spec);

function buildUrlParams(bid, bidderRequest) {
  const host = utils.getTopWindowLocation().host;
  const page = utils.getTopWindowLocation().pathname;
  const refer = document.referrer;
  const language = navigator.language;
  const dnt = (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0;

  let queryString = [
    'ifr', '0',
    'bl', language,
    'je', '1',
    'dnt', dnt,
    'host', host,
    'u', page,
    'ru', refer,
    'adid', utils.getBidIdParameter('adid', bid.params),
    'ver', VER
  ];

  if (bidderRequest && bidderRequest.gdprConsent) {
    queryString.push('gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
    queryString.push('euconsent', bidderRequest.gdprConsent.consentString);
  }

  return queryString.reduce(
    (memo, curr, index) =>
      index % 2 === 0 && queryString[index + 1] !== undefined ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&' : memo, ''
  ).slice(0, -1);
}
