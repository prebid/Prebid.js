import { logWarn, logMessage, debugTurnedOn, generateUUID, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { getViewportCoordinates } from '../libraries/viewport/viewport.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'concert';
const CONCERT_ENDPOINT = 'https://bids.concert.io';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
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
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {Object} bidderRequest - the bidder request object
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    logMessage(validBidRequests);
    logMessage(bidderRequest);

    const eids = [];

    const payload = {
      meta: {
        prebidVersion: '$prebid.version$',
        pageUrl: bidderRequest.refererInfo.page,
        screen: [window.screen.width, window.screen.height].join('x'),
        browserLanguage: window.navigator.language,
        debug: debugTurnedOn(),
        uid: getUid(bidderRequest, validBidRequests),
        optedOut: hasOptedOutOfPersonalization(),
        adapterVersion: '1.3.0',
        uspConsent: bidderRequest.uspConsent,
        gdprConsent: bidderRequest.gdprConsent,
        gppConsent: bidderRequest.gppConsent,
        tdid: getTdid(bidderRequest, validBidRequests),
      },
    };

    if (!payload.meta.gppConsent && bidderRequest.ortb2?.regs?.gpp) {
      payload.meta.gppConsent = {
        gppString: bidderRequest.ortb2.regs.gpp,
        applicableSections: bidderRequest.ortb2.regs.gpp_sid,
      };
    }

    payload.slots = validBidRequests.map((bidRequest) => {
      eids.push(...(bidRequest.userIdAsEids || []));
      const adUnitElement = document.getElementById(bidRequest.adUnitCode);
      const coordinates = getOffset(adUnitElement);

      const slot = {
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
        offsetCoordinates: { x: coordinates?.left, y: coordinates?.top },
      };

      return slot;
    });

    payload.meta.eids = eids.filter(Boolean);

    logMessage(payload);

    return {
      method: 'POST',
      url: `${CONCERT_ENDPOINT}/bids/prebid`,
      data: JSON.stringify(payload),
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

    bidResponses = serverBody.bids.map((bid) => {
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
   */
  onTimeout: function(data) {
    logMessage('concert bidder timed out');
    logMessage(data);
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function(bid) {
    logMessage('concert bidder won bid');
    logMessage(bid);
  },
};

registerBidder(spec);

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/**
 * Check or generate a UID for the current user.
 */
function getUid(bidderRequest, validBidRequests) {
  if (hasOptedOutOfPersonalization() || !consentAllowsPpid(bidderRequest)) {
    return false;
  }

  const { sharedId, pubcId } = getUserIdsFromEids(validBidRequests[0]);

  if (sharedId) return sharedId;
  if (pubcId) return pubcId;
  if (deepAccess(validBidRequests[0], 'crumbs.pubcid')) {
    return deepAccess(validBidRequests[0], 'crumbs.pubcid');
  }

  const CONCERT_UID_KEY = 'vmconcert_uid';
  let uid = storage.getDataFromLocalStorage(CONCERT_UID_KEY);

  if (!uid) {
    uid = generateUUID();
    storage.setDataInLocalStorage(CONCERT_UID_KEY, uid);
  }

  return uid;
}

function getUserIdsFromEids(bid) {
  const sourceMapping = {
    'sharedid.org': 'sharedId',
    'pubcid.org': 'pubcId',
    'adserver.org': 'tdid',
  };

  const defaultUserIds = { sharedId: null, pubcId: null, tdid: null };

  if (!bid?.userIdAsEids) return defaultUserIds;

  return bid.userIdAsEids.reduce((userIds, eid) => {
    const key = sourceMapping[eid.source];
    if (key && eid.uids?.[0]?.id) {
      userIds[key] = eid.uids[0].id;
    }
    return userIds;
  }, defaultUserIds);
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
 * @param {Object} bidderRequest Object which contains any data consent signals
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

  return uspConsentAllows && gdprConsentAllows;
}

function getOffset(el) {
  if (el) {
    const rect = getBoundingClientRect(el);
    const viewport = getViewportCoordinates();
    return {
      left: rect.left + (viewport.left || 0),
      top: rect.top + (viewport.top || 0)
    };
  }
}

function getTdid(bidderRequest, validBidRequests) {
  if (hasOptedOutOfPersonalization() || !consentAllowsPpid(bidderRequest)) {
    return null;
  }

  return getUserIdsFromEids(validBidRequests[0]).tdid;
}
