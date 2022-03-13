import { logWarn, logMessage, debugTurnedOn, generateUUID } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js'

const BIDDER_CODE = 'concert';
const CONCERT_ENDPOINT = 'https://bids.concert.io';
const USER_SYNC_URL = 'https://cdn.concert.io/lib/bids/sync.html';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (!bid.params.partnerId) {
      logWarn('Missing partnerId bid parameter');
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @param {bidderRequest} -
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    logMessage(validBidRequests);
    logMessage(bidderRequest);
    let payload = {
      meta: {
        prebidVersion: '$prebid.version$',
        pageUrl: bidderRequest.refererInfo.referer,
        screen: [window.screen.width, window.screen.height].join('x'),
        debug: debugTurnedOn(),
        uid: getUid(bidderRequest),
        optedOut: hasOptedOutOfPersonalization(),
        adapterVersion: '1.1.1',
        uspConsent: bidderRequest.uspConsent,
        gdprConsent: bidderRequest.gdprConsent
      }
    }

    payload.slots = validBidRequests.map(bidRequest => {
      let slot = {
        name: bidRequest.adUnitCode,
        bidId: bidRequest.bidId,
        transactionId: bidRequest.transactionId,
        sizes: bidRequest.params.sizes || bidRequest.sizes,
        partnerId: bidRequest.params.partnerId,
        slotType: bidRequest.params.slotType,
        adSlot: bidRequest.params.slot || bidRequest.adUnitCode,
        placementId: bidRequest.params.placementId || '',
        site: bidRequest.params.site || bidderRequest.refererInfo.referer
      }

      return slot;
    });

    logMessage(payload);

    return {
      method: 'POST',
      url: `${CONCERT_ENDPOINT}/bids/prebid`,
      data: JSON.stringify(payload)
    }
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    logMessage(serverResponse);
    logMessage(bidRequest);

    const serverBody = serverResponse.body;

    if (!serverBody || typeof serverBody !== 'object') {
      return [];
    }

    let bidResponses = [];

    bidResponses = serverBody.bids.map(bid => {
      return {
        requestId: bid.bidId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        ad: bid.ad,
        ttl: bid.ttl,
        meta: { advertiserDomains: bid && bid.adomain ? bid.adomain : [] },
        creativeId: bid.creativeId,
        netRevenue: bid.netRevenue,
        currency: bid.currency
      }
    });

    if (debugTurnedOn() && serverBody.debug) {
      logMessage(`CONCERT`, serverBody.debug);
    }

    logMessage(bidResponses);
    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @param {gdprConsent} object GDPR consent object.
   * @param {uspConsent} string US Privacy String.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
    if (syncOptions.iframeEnabled && !hasOptedOutOfPersonalization()) {
      let params = [];

      if (gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean')) {
        params.push(`gdpr_applies=${gdprConsent.gdprApplies ? '1' : '0'}`);
      }
      if (gdprConsent && (typeof gdprConsent.consentString === 'string')) {
        params.push(`gdpr_consent=${gdprConsent.consentString}`);
      }
      if (uspConsent && (typeof uspConsent === 'string')) {
        params.push(`usp_consent=${uspConsent}`);
      }

      syncs.push({
        type: 'iframe',
        url: USER_SYNC_URL + (params.length > 0 ? `?${params.join('&')}` : '')
      });
    }
    return syncs;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function(data) {
    logMessage('concert bidder timed out');
    logMessage(data);
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    logMessage('concert bidder won bid');
    logMessage(bid);
  }

}

registerBidder(spec);

const storage = getStorageManager({bidderCode: BIDDER_CODE});

/**
 * Check or generate a UID for the current user.
 */
function getUid(bidderRequest) {
  if (hasOptedOutOfPersonalization() || !consentAllowsPpid(bidderRequest)) {
    return false;
  }

  const CONCERT_UID_KEY = 'c_uid';

  let uid = storage.getDataFromLocalStorage(CONCERT_UID_KEY);

  if (!uid) {
    uid = generateUUID();
    storage.setDataInLocalStorage(CONCERT_UID_KEY, uid);
  }

  return uid;
}

/**
 * Whether the user has opted out of personalization.
 */
function hasOptedOutOfPersonalization() {
  const CONCERT_NO_PERSONALIZATION_KEY = 'c_nap';

  return storage.getDataFromLocalStorage(CONCERT_NO_PERSONALIZATION_KEY) === 'true';
}

/**
 * Whether the privacy consent strings allow personalization.
 *
 * @param {BidderRequest} bidderRequest Object which contains any data consent signals
 */
function consentAllowsPpid(bidderRequest) {
  /* NOTE: We cannot easily test GDPR consent, without the
   * `consent-string` npm module; so will have to rely on that
   * happening on the bid-server. */
  return !(bidderRequest.uspConsent === 'string' &&
           bidderRequest.uspConsent.toUpperCase().substring(0, 2) === '1YY')
}
