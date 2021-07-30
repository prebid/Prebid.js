// eslint-disable-next-line prebid/validate-imports
import * as utils from 'src/utils'
// eslint-disable-next-line prebid/validate-imports
import { registerBidder } from 'src/adapters/bidderFactory'

export const BIDDER_CODE = 'bliink'
export const BLIINK_ENDPOINT_ENGINE = 'https://engine.bliink.io/delivery'

/**
 * @param bidRequest
 * @param bliinkCreative
 * @return {
 *  {
 *    cpm: number,
 *    netRevenue: boolean,
 *    ad, requestId,
 *    meta: {mediaType},
 *    width,
 *    currency: string,
 *    ttl: number,
 *    creativeId,
 *    height
 *    } |null
 *   }
 */
export const buildBid = (bidRequest, bliinkCreative) => {
  if (!bidRequest && !bliinkCreative) return null
  if (
    !bidRequest.bidId ||
    !bidRequest.sizes ||
    !bliinkCreative.id ||
    !bliinkCreative.adm ||
    !bidRequest.params ||
    !(bidRequest.params.placement)
  ) return null

  delete bidRequest['bids']

  const width = 300
  const height = 250
  const mediaType = (bidRequest.params && bidRequest.params.placement) || 'banner'

  return {
    requestId: bidRequest.bidId,
    cpm: 1,
    currency: 'EUR',
    width,
    height,
    creativeId: bliinkCreative.id,
    netRevenue: true,
    ad: bliinkCreative.adm,
    ttl: 360,
    meta: {
      mediaType
    }
  };
}

/**
 * @description Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
 *
 * @param bid
 * @return boolean
 */
export const isBidRequestValid = (bid) => {
  return !(!bid || !bid.params || !bid.params.placement || !bid.params.tagId)
}

/**
 * @description Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
 *
 * @param _[]
 * @param bidderRequest
 * @return {{ method: string, url: string } | null}
 */
export const buildRequests = (_, bidderRequest) => {
  if (!bidderRequest) return null

  return {
    method: 'GET',
    url: `${BLIINK_ENDPOINT_ENGINE}/${bidderRequest.bids[0].params.tagId}`,
    data: {
      gdpr: bidderRequest.gdprConsent.gdprApplies,
      gdpr_consent: bidderRequest.gdprConsent.consentString,
      width: bidderRequest.bids[0].sizes[0][0],
      height: bidderRequest.bids[0].sizes[0][1]
    },
    params: {
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
 * @return
 */
const interpretResponse = (serverResponse, request) => {
  if (serverResponse && serverResponse.mode === 'no-ad') {
    return []
  }

  const serverBody = request.params;

  if (serverBody && serverBody.bids && utils.isArray(serverBody.bids)) {
    return utils._map(serverBody.bids, (bid) => {
      return buildBid(bid, serverResponse.body.creative);
    })
  }

  return []
}

/**
 * @description  If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs. For more information, see Registering User Syncs below
 * @param syncOptions
 * @param serverResponses
 * @param gdprConsent
 * @return {[{type: string, url: string}]|*[]}
 */
const getUserSyncs = (syncOptions, serverResponses, gdprConsent) => {
  const syncs = []

  let gdprParams;
  if (typeof gdprConsent.gdprApplies === 'boolean') {
    gdprParams = `hasConsent=${Number(gdprConsent.gdprApplies)}&consentString=${gdprConsent.consentString}`;
  } else {
    gdprParams = `consentString=${gdprConsent.consentString}`;
  }

  if (syncOptions.iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html?' + gdprParams
    });
  }
  if (syncOptions.pixelEnabled && serverResponses.length > 0) {
    syncs.push({
      type: 'image',
      url: `${BLIINK_ENDPOINT_ENGINE}/14f30eca-85d2-11e8-9eed-0242ac120007?${gdprParams}`
    });
  }

  return syncs;
}

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
