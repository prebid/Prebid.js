// eslint-disable-next-line prebid/validate-imports
import * as utils from 'src/utils'
// eslint-disable-next-line prebid/validate-imports
import { registerBidder } from 'src/adapters/bidderFactory'

const BIDDER_CODE = 'bliink'
const BLIINK_ENDPOINT_ENGINE = 'https://engine.bliink.io/delivery'

/**
 * @return {{}}
 * @param bidRequest
 * @param bliinkCreative
 */
const buildBid = (bidRequest, bliinkCreative) => {
  delete bidRequest['bids']
  return {
    requestId: bidRequest.bidId,
    cpm: 1,
    currency: 'EUR',
    width: bidRequest.sizes[0],
    height: bidRequest.sizes[1],
    creativeId: bliinkCreative.id,
    netRevenue: true,
    ad: bliinkCreative.adm,
    ttl: 360,
    meta: {
      mediaType: bidRequest.params.placement
    }
  };
}

/**
 * @description Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
 *
 * @return boolean
 */
const isBidRequestValid = () => {
  return true
}

/**
 * @description Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
 *
 * @param validBidRequests[]
 * @param bidderRequest
 * @return {{ method: string, url: string }}
 */
const buildRequests = (validBidRequests, bidderRequest) => {
  return {
    method: 'GET',
    url: `${BLIINK_ENDPOINT_ENGINE}/${bidderRequest.bids[0].params.tagId}`,
    data: {
      bidderRequestId: bidderRequest.bidderRequestId,
      bidderCode: bidderRequest.bidderCode,
      bids: bidderRequest.bids,
      refererInfo: bidderRequest.refererInfo,
    }
  }
}

/**
 * @description Parse the response (from buildRequests) and generate one or more bid objects.
 *
 * @param serverResponse
 * @param request
 * @return []
 */
const interpretResponse = (serverResponse, request) => {
  const serverBody = request.data;
  if (serverBody && serverBody.bids && utils.isArray(serverBody.bids)) {
    return utils._map(serverBody.bids, (bid) => {
      return buildBid(bid, serverResponse.body.creative);
    });
  } else {
    return [];
  }
}

/**
 * @description  If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs. For more information, see Registering User Syncs below
 *
 * @return void
 */
const getUserSyncs = () => {}

/**
 * @description If the adapter timed out for an auction, the platform will call this function and the adapter may register timeout. For more information, see Registering User Syncs below.
 *
 * @return void
 */
const onTimeout = () => {}

/**
 * @param bid
 * @return bid
 */
const onBidWon = (bid) => {
  return bid
}

/**
 * @type {{interpretResponse: interpretResponse, code: string, aliases: string[], getUserSyncs: getUserSyncs, buildRequests: buildRequests, onTimeout: onTimeout, onSetTargeting: onSetTargeting, isBidRequestValid: isBidRequestValid, onBidWon: onBidWon}}
 */
export const spec = {
  code: BIDDER_CODE,
  aliases: ['bk'],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onTimeout,
  onBidWon,
}

registerBidder(spec)
