import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'wipes';
const ALIAS_BIDDER_CODE = ['wi'];
const SUPPORTED_MEDIA_TYPES = [BANNER]
const ENDPOINT_URL = 'https://adn-srv.reckoner-api.com/v1/prebid';

function isBidRequestValid(bid) {
  switch (true) {
    case !!(bid.params.asid):
      break;
    default:
      utils.logWarn(`isBidRequestValid Error. ${bid.params}, please check your implementation.`);
      return false;
  }
  return true;
}

function buildRequests(validBidRequests, bidderRequest) {
  return validBidRequests.map(bidRequest => {
    const bidId = bidRequest.bidId
    const params = bidRequest.params;
    const asid = params.asid;
    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: {
        asid: asid,
        bid_id: bidId,
      }
    }
  });
}

function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];
  const response = serverResponse.body;
  const cpm = response.cpm || 0;
  if (cpm !== 0) {
    const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
    const bidResponse = {
      requestId: response.bid_id,
      cpm: cpm,
      width: response.width,
      height: response.height,
      creativeId: response.video_creative_id || 0,
      dealId: response.deal_id,
      currency: 'JPY',
      netRevenue: netRevenue,
      ttl: config.getConfig('_bidderTimeout'),
      referrer: bidRequest.data.r || '',
      mediaType: BANNER,
      ad: response.ad_tag,
    };
    bidResponses.push(bidResponse);
  }
  return bidResponses;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ALIAS_BIDDER_CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES
}
registerBidder(spec);
