import { logWarn, logMessage, debugTurnedOn, generateUUID, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { hasPurpose1Consent } from '../src/utils/gpdr.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'concert';
const CONCERT_ENDPOINT = 'https://bids.concert.io';

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

    const eids = [];

    let payload = {
      meta: {
        prebidVersion: '$prebid.version$',
        pageUrl: bidderRequest.refererInfo.page,
        screen: [window.screen.width, window.screen.height].join('x'),
        browserLanguage: window.navigator.language,
        debug: debugTurnedOn(),
        uid: getUid(bidderRequest, validBidRequests),
        optedOut: hasOptedOutOfPersonalization(),
        adapterVersion: '1.2.0',
        uspConsent: bidderRequest.uspConsent,
        gdprConsent: bidderRequest.gdprConsent,
        gppConsent: bidderRequest.gppConsent,
        tdid: getTdid(bidderRequest, validBidRequests),
      }
    };

    if (!payload.meta.gppConsent && bidderRequest.ortb2?.regs?.gpp) {
      payload.meta.gppConsent = {
        gppString: bidderRequest.ortb2.regs.gpp,
        applicableSections: bidderRequest.ortb2.regs.gpp_sid
      }
    }

    payload.slots = validBidRequests.map(bidRequest => {
      collectEid(eids, bidRequest);
      const adUnitElement = document.getElementById(bidRequest.adUnitCode)
      const coordinates = getOffset(adUnitElement)

      let slot = {
        name: bidRequest.adUnitCode,
        bidId: bidRequest.bidId,
        transactionId: bidRequest.ortb2Imp?.ext?.tid,
        sizes: bidRequest.params.sizes || bidRequest.sizes,
        partnerId: bidRequest.params.partnerId,
        slotType: bidRequest.params.slotType,
        adSlot: bidRequest.params.slot || bidRequest.adUnitCode,
        placementId: bidRequest.params.placementId || '',
        site: bidRequest.params.site || bidderRequest.refererInfo.page,
        ref: bidderRequest.refererInfo.ref,
        offsetCoordinates: { x: coordinates?.left, y: coordinates?.top }
      }

      return slot;
    });

    payload.meta.eids = eids.filter(Boolean);

    logMessage(payload);

    return {
      method: 'POST',
      url: `${CONCERT_ENDPOINT}/bids/prebid`,
      data: JSON.stringify(payload)
    };
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
        currency: bid.currency,
        ...(bid.dealid && { dealId: bid.dealid }),
      };
    });

    if (debugTurnedOn() && serverBody.debug) {
      logMessage(`CONCERT`, serverBody.debug);
    }

    logMessage(bidResponses);
    return bidResponses;
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

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

/**
 * Check or generate a UID for the current user.
 */
function getUid(bidderRequest, validBidRequests) {
  if (hasOptedOutOfPersonalization() || !consentAllowsPpid(bidderRequest)) {
    return false;
  }

  /**
   * check for shareId or pubCommonId before generating a new one
   * sharedId: @see https://docs.prebid.org/dev-docs/modules/userId.html
   * pubCid (no longer supported): @see https://docs.prebid.org/dev-docs/modules/pubCommonId.html#adapter-integration
   */
  const sharedId =
    deepAccess(validBidRequests[0], 'userId.sharedid.id') ||
    deepAccess(validBidRequests[0], 'userId.pubcid')
  const pubCid = deepAccess(validBidRequests[0], 'crumbs.pubcid');

  if (sharedId) return sharedId;
  if (pubCid) return pubCid;

  const LEGACY_CONCERT_UID_KEY = 'c_uid';
  const CONCERT_UID_KEY = 'vmconcert_uid';

  const legacyUid = storage.getDataFromLocalStorage(LEGACY_CONCERT_UID_KEY);
  let uid = storage.getDataFromLocalStorage(CONCERT_UID_KEY);

  if (legacyUid) {
    uid = legacyUid;
    storage.setDataInLocalStorage(CONCERT_UID_KEY, uid);
    storage.removeDataFromLocalStorage(LEGACY_CONCERT_UID_KEY);
  }

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
  let uspConsentAllows = true;

  // if a us privacy string was provided, but they explicitly opted out
  if (
    typeof bidderRequest?.uspConsent === 'string' &&
    bidderRequest?.uspConsent[0] === '1' &&
    bidderRequest?.uspConsent[2].toUpperCase() === 'Y' // user has opted-out
  ) {
    uspConsentAllows = false;
  }

  /*
   * True if the gdprConsent is null-y; or GDPR does not apply; or if purpose 1 consent was given.
   * Much more nuanced GDPR requirements are tested on the bid server using the @iabtcf/core npm module;
   */
  const gdprConsentAllows = hasPurpose1Consent(bidderRequest?.gdprConsent);

  return (uspConsentAllows && gdprConsentAllows);
}

function collectEid(eids, bid) {
  if (bid.userId) {
    const eid = getUserId(bid.userId.uid2 && bid.userId.uid2.id, 'uidapi.com', undefined, 3)
    eids.push(eid)
  }
}

function getUserId(id, source, uidExt, atype) {
  if (id) {
    const uid = { id, atype };

    if (uidExt) {
      uid.ext = uidExt;
    }

    return {
      source,
      uids: [ uid ]
    };
  }
}

function getOffset(el) {
  if (el) {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY
    };
  }
}

function getTdid(bidderRequest, validBidRequests) {
  if (hasOptedOutOfPersonalization() || !consentAllowsPpid(bidderRequest)) {
    return null;
  }

  return deepAccess(validBidRequests[0], 'userId.tdid') || null;
}
