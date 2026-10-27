import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  buildUrl,
  logInfo,
  logMessage,
  parseSizesInput,
  triggerPixel,
  deepSetValue,
  deepAccess,
  deepClone
} from '../src/utils.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { keyCompare, simpleCompare, tiebreakCompare } from '../src/utils/reducers.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const ADQUERY_GVLID = 902;
const ADQUERY_BIDDER_CODE = 'adquery';
const ADQUERY_BIDDER_DOMAIN_PROTOCOL = 'https';
const ADQUERY_BIDDER_DOMAIN = 'bidder.adquery.io';
const ADQUERY_STATIC_DOMAIN_PROTOCOL = 'https';
const ADQUERY_STATIC_DOMAIN = 'api.adquery.io';
const ADQUERY_USER_SYNC_DOMAIN = ADQUERY_BIDDER_DOMAIN;
const ADQUERY_DEFAULT_CURRENCY = 'PLN';
const ADQUERY_NET_REVENUE = true;
const ADQUERY_TTL = 360;
const ADQUERY_EID_SOURCE = 'adquery.io';
const ADQUERY_MAX_EID_UIDS = 50;

/** @type {BidderSpec} */
export const spec = {
  code: ADQUERY_BIDDER_CODE,
  gvlid: ADQUERY_GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    const video = bid.mediaTypes && bid.mediaTypes.video;
    if (video && ['instream', 'outstream'].includes(video.context)) {
      return !!(video.playerSize);
    }

    return !!(bid && bid.params && bid.params.placementId && bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes);
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    const requests = [];

    const adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/bid',
    });

    // Core gives every bid of a bidder request the same ortb2, so userIdAsEids is the same list
    // for all of them; it is processed once per call.
    const userIds = getUserIds(bidRequests[0]);

    for (let i = 0, len = bidRequests.length; i < len; i++) {
      const bid = bidRequests[i];
      const isVideo = bid.mediaTypes && bid.mediaTypes.video && ['instream', 'outstream'].includes(bid.mediaTypes.video.context);

      let requestUrl = adqueryRequestUrl;

      if (isVideo) {
        requestUrl = buildUrl({
          protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
          hostname: ADQUERY_BIDDER_DOMAIN,
          pathname: '/openrtb2/auction2',
        });
      }

      const request = {
        method: 'POST',
        url: requestUrl,
        data: buildRequest(bid, bidderRequest, userIds, isVideo),
        options: {
          withCredentials: false,
          crossOrigin: true
        },
        bidId: bid.bidId
      };

      requests.push(request);
    }
    return requests;
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    const bidResponses = [];

    const seatbids = deepAccess(response, 'body.seatbid');
    if (seatbids) {
      seatbids.forEach(seat => {
        seat.bid.forEach(bid => {
          logMessage('bidObj', bid);

          bidResponses.push({
            requestId: bid.impid,
            mediaType: VIDEO,
            cpm: bid.price,
            currency: deepAccess(response, 'body.cur') || 'USD',
            ttl: 3600,
            creativeId: bid.crid || bid.id,
            netRevenue: true,
            dealId: bid.dealid,
            nurl: bid.nurl,
            vastXml: bid.adm || null,
            vastUrl: bid.admurl || null,
            width: bid.w || 640,
            height: bid.h || 360,
            meta: {
              advertiserDomains: deepAccess(bid, 'adomain') || [],
              networkName: seat.seat,
              mediaType: VIDEO,
            },
          });
        });
      });
    }

    const res = deepAccess(response, 'body.data');
    if (!res) return bidResponses;

    bidResponses.push({
      requestId: res.requestId,
      cpm: res.cpm,
      width: deepAccess(res, 'mediaType.width'),
      height: deepAccess(res, 'mediaType.height'),
      creativeId: res.creationId,
      dealId: res.dealid || '',
      currency: res.currency || ADQUERY_DEFAULT_CURRENCY,
      netRevenue: ADQUERY_NET_REVENUE,
      ttl: ADQUERY_TTL,
      ad: `<script src="${res.adqLib}"></script>${res.tag}`,
      mediaType: deepAccess(res, 'mediaType.name') || BANNER,
      meta: {
        advertiserDomains: deepAccess(res, 'adDomains') || [],
        mediaType: deepAccess(res, 'mediaType.name') || BANNER,
      },
    });

    logInfo('bidResponses', bidResponses);
    return bidResponses;
  },

  /**
   * @param {TimedOutBid} timeoutData
   */
  onTimeout: (timeoutData) => {
    if (timeoutData == null || (Array.isArray(timeoutData) && timeoutData.length === 0)) {
      return;
    }
    logInfo('onTimeout ', timeoutData);
    const timedOutBids = Array.isArray(timeoutData) ? timeoutData : [timeoutData];
    timedOutBids.forEach((timedOutBid) => {
      if (!timedOutBid) {
        return;
      }
      const params = {
        bidder: timedOutBid.bidder,
        bId: timedOutBid.bidId,
        adUnitCode: timedOutBid.adUnitCode,
        timeout: timedOutBid.timeout,
        auctionId: timedOutBid.auctionId,
      };
      const adqueryRequestUrl = buildUrl({
        protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
        hostname: ADQUERY_BIDDER_DOMAIN,
        pathname: '/prebid/eventTimeout',
        search: params
      });
      triggerPixel(adqueryRequestUrl);
    });
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
    logInfo('onBidWon', bid);

    if (bid.nurl) {
      triggerPixel(bid.nurl);
      return;
    }

    const copyOfBid = { ...bid };

    const uuidMatch = copyOfBid.ad && typeof copyOfBid.ad === 'string' ? copyOfBid.ad.match(/data-uuid="([^"]*)"/) : null;
    copyOfBid.uuid = uuidMatch ? uuidMatch[1] : null;
    delete copyOfBid.ad;
    const shortBidString = JSON.stringify(copyOfBid);
    const encodedBuf = window.btoa(shortBidString);

    const params = {
      q: encodedBuf,
    };
    const adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventBidWon',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },

  /**
   * @param {Bid} bid
   */
  onSetTargeting: (bid) => {
    logInfo('onSetTargeting', bid);

    const params = {
      bidder: bid.bidder,
      width: bid.width,
      height: bid.height,
      bid: bid.adId,
      mediaType: bid.mediaType,
      cpm: bid.cpm,
      requestId: bid.requestId,
      adUnitCode: bid.adUnitCode
    };

    const adqueryRequestUrl = buildUrl({
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_BIDDER_DOMAIN,
      pathname: '/prebid/eventSetTargeting',
      search: params
    });
    triggerPixel(adqueryRequestUrl);
  },
  /**
   * Retrieves user synchronization URLs based on provided options and consents.
   *
   * @param {object} syncOptions - Options for synchronization.
   * @param {object[]} serverResponses - Array of server responses.
   * @param {object} gdprConsent - GDPR consent object.
   * @param {object} uspConsent - USP consent object.
   * @returns {object[]} - Array of synchronization URLs.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    logMessage('getUserSyncs', syncOptions, serverResponses, gdprConsent, uspConsent);
    if (!gdprConsent?.gdprApplies || !hasPurpose1Consent(gdprConsent)) {
      logMessage('no gdpr or purpose1 consent, no syncs');
      return [];
    }
    const qid = Array.isArray(serverResponses) ? serverResponses.map(r => deepAccess(r, 'body.data.qid')).find(Boolean) : null;
    if (!qid) {
      logMessage('no qid found in server responses');
      return [];
    }
    const syncData = {
      'gdpr': gdprConsent && gdprConsent.gdprApplies ? 1 : 0,
      'gdpr_consent': gdprConsent && gdprConsent.consentString ? gdprConsent.consentString : '',
      'ccpa_consent': uspConsent || '',
      'qid': qid,
    };

    const syncUrlObject = {
      protocol: ADQUERY_BIDDER_DOMAIN_PROTOCOL,
      hostname: ADQUERY_USER_SYNC_DOMAIN,
      pathname: '/prebid/userSync',
      search: syncData
    };

    if (syncOptions.iframeEnabled) {
      syncUrlObject.protocol = ADQUERY_STATIC_DOMAIN_PROTOCOL;
      syncUrlObject.hostname = ADQUERY_STATIC_DOMAIN;
      syncUrlObject.pathname = '/user-sync-iframe.html';

      return [{
        type: 'iframe',
        url: buildUrl(syncUrlObject)
      }];
    }

    return [{
      type: 'image',
      url: buildUrl(syncUrlObject)
    }];
  }
};

// The helpers below mirror the Prebid Server adQuery adapter field by field, so client- and
// server-side requests sort, dedupe and cap the same EIDs the same way. Strings are compared by
// code unit (simpleCompare, not localeCompare, so the order does not depend on the browser
// locale); a missing string/number counts as ''/0 and ext is compared as its JSON text. The only
// known difference: strings with characters above U+FFFF sort by UTF-16 here and by UTF-8 in Go,
// which does not matter for EID sources (domains) and ids (ASCII).

function isNonEmptyString(value) {
  return typeof value === 'string' && value !== '';
}

function isNonZeroNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value !== 0;
}

function extKey(ext) {
  return ext === undefined ? '' : JSON.stringify(ext);
}

const compareUids = tiebreakCompare(
  keyCompare(uid => uid.id),
  keyCompare(uid => uid.atype ?? 0),
  keyCompare(uid => extKey(uid.ext))
);

function compareUidLists(a, b) {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const result = compareUids(a[i], b[i]);
    if (result) {
      return result;
    }
  }
  return simpleCompare(a.length, b.length);
}

// adquery.io first, then by source, uids, inserter, matcher, mm and ext.
const compareEids = tiebreakCompare(
  keyCompare(eid => (eid.source === ADQUERY_EID_SOURCE ? 0 : 1)),
  keyCompare(eid => eid.source),
  (a, b) => compareUidLists(a.uids, b.uids),
  keyCompare(eid => eid.inserter ?? ''),
  keyCompare(eid => eid.matcher ?? ''),
  keyCompare(eid => eid.mm ?? 0),
  keyCompare(eid => extKey(eid.ext))
);

// Returns a sorted copy without entries that compare equal to the previous one. Only known ORTB
// fields are kept (see cleanEid) and all of them are compared, so those entries are identical
// duplicates.
function sortUnique(items, compare) {
  const sorted = [...items].sort(compare);
  const result = [];
  for (const item of sorted) {
    if (!result.length || compare(result[result.length - 1], item) !== 0) {
      result.push(item);
    }
  }
  return result;
}

// Only the ORTB fields of a uid, the way Prebid Server serializes them (zero atype and missing ext
// are left out). ext still points into the input; every request deep-copies the list.
function copyUid(uid) {
  const copy = { id: uid.id };
  if (isNonZeroNumber(uid.atype)) {
    copy.atype = uid.atype;
  }
  if (uid.ext != null) {
    copy.ext = uid.ext;
  }
  return copy;
}

// One EID with only its ORTB fields and its uids that have a non-empty string id, sorted and
// without identical duplicates; null when no uid is left. Unknown fields are dropped, like
// Prebid Server does.
function cleanEid(eid) {
  const uids = [];
  for (const uid of eid.uids) {
    if (isNonEmptyString(uid?.id)) {
      uids.push(copyUid(uid));
    }
  }
  if (!uids.length) {
    return null;
  }
  const copy = { source: eid.source, uids: sortUnique(uids, compareUids) };
  if (isNonEmptyString(eid.inserter)) {
    copy.inserter = eid.inserter;
  }
  if (isNonEmptyString(eid.matcher)) {
    copy.matcher = eid.matcher;
  }
  if (isNonZeroNumber(eid.mm)) {
    copy.mm = eid.mm;
  }
  if (eid.ext != null) {
    copy.ext = eid.ext;
  }
  return copy;
}

// EIDs the bidder receives (already limited by userId `bidders` config and, when tcfControl is
// in the build, by transmitEids consent), with their original source so the adQuery backend can
// tell them apart. Only adquery.io is ever used as bidQid; the other sources are just forwarded.
// Entries without a source and uids without a non-empty string id are dropped, only ORTB fields
// are kept, and identical duplicates are removed. The order does not depend on user ID module
// order: adquery.io first (its lowest uid, the one also sent as bidQid, at the very front, which
// is what the video endpoint reads from user.ext.eids), then by source and uids, ties broken by
// the remaining fields. The ADQUERY_MAX_EID_UIDS cap is applied after sorting, so it never drops
// the adquery.io uid. The input is not modified.
function getEids(eids) {
  const cleaned = [];
  for (const eid of eids) {
    if (!isNonEmptyString(eid?.source) || !Array.isArray(eid.uids)) {
      continue;
    }
    const cleanedEid = cleanEid(eid);
    if (cleanedEid) {
      cleaned.push(cleanedEid);
    }
  }

  const capped = [];
  let budget = ADQUERY_MAX_EID_UIDS;
  for (const eid of sortUnique(cleaned, compareEids)) {
    if (budget <= 0) {
      break;
    }
    const uids = eid.uids.slice(0, budget);
    capped.push({ ...eid, uids });
    budget -= uids.length;
  }
  // Cutting uids can turn an EID into a copy of another one, so the capped list is sorted and
  // deduplicated again; adquery.io still sorts first.
  return sortUnique(capped, compareEids);
}

// The EIDs of the bid: userIdAsEids when the userId module is in the build (it is an alias of
// ortb2.user.ext.eids), otherwise the normalized ortb2.user.ext.eids, so EIDs passed through ORTB2
// first party data are not lost in builds without the userId module.
function getBidEids(bid) {
  if (Array.isArray(bid?.userIdAsEids)) {
    return bid.userIdAsEids;
  }
  const ortb2Eids = bid?.ortb2?.user?.ext?.eids;
  return Array.isArray(ortb2Eids) ? ortb2Eids : [];
}

// bidQid comes only from the adquery.io EID: after sorting, the lowest adquery.io uid is the very
// first uid of eids. Other vendors' ids are never sent as bidQid; without an adquery.io uid
// bidQid stays empty and the adQuery bidder assigns its own user id.
function getUserIds(bid) {
  const eids = getEids(getBidEids(bid));
  const bidQid = eids[0]?.source === ADQUERY_EID_SOURCE ? eids[0].uids[0].id : '';
  return { bidQid, eids };
}

// Deep copy of bid.ortb2 without user.ext.eids and user.eids (the cleaned list is sent in
// user.ext.eids instead); user and user.ext are left out when nothing else is in them.
// bid.ortb2 is shared by every bid of the bidder request, so the video request must not write
// into it (site.ext.bidder, user.consent) through a shallow copy.
function cloneOrtb2WithoutEids(ortb2) {
  const { user, ...rest } = ortb2 || {};
  const copy = deepClone(rest);
  if (user) {
    const { ext, eids: _userEids, ...userRest } = user;
    const userCopy = deepClone(userRest);
    if (ext) {
      const { eids: _eids, ...extRest } = ext;
      if (Object.keys(extRest).length) {
        userCopy.ext = deepClone(extRest);
      }
    }
    if (Object.keys(userCopy).length) {
      copy.user = userCopy;
    }
  }
  return copy;
}

function buildRequest(bid, bidderRequest, userIds, isVideo = false) {
  let pageUrl = '';
  if (bidderRequest && bidderRequest.refererInfo) {
    pageUrl = bidderRequest.refererInfo.page || '';
  }

  if (isVideo) {
    const videoRequest = {
      ...cloneOrtb2WithoutEids(bid.ortb2),
      imp: [{
        id: bid.bidId,
        video: deepClone(bid.ortb2Imp?.video || {}),
      }]
    };

    deepSetValue(videoRequest, 'site.ext.bidder', bid.params);
    videoRequest.id = bid.bidId;

    // Each request gets its own copy, so requests of the same call never share EID objects.
    if (userIds.eids.length) {
      deepSetValue(videoRequest, 'user.ext.eids', deepClone(userIds.eids));
    }

    if (bidderRequest?.gdprConsent?.gdprApplies != null) {
      deepSetValue(videoRequest, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
    }
    if (bidderRequest?.gdprConsent?.consentString) {
      deepSetValue(videoRequest, 'user.consent', bidderRequest.gdprConsent.consentString);
    }
    if (bidderRequest?.uspConsent) {
      deepSetValue(videoRequest, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    let currency = bid?.ortb2?.ext?.prebid?.adServerCurrency || "PLN";
    videoRequest.cur = [currency];

    let floorInfo;
    if (typeof bid.getFloor === 'function') {
      floorInfo = bid.getFloor({
        currency: currency,
        mediaType: "video",
        size: "*"
      });
    }
    const bidfloor = floorInfo?.floor;
    const bidfloorcur = floorInfo?.currency;

    if (bidfloor && bidfloorcur) {
      videoRequest.imp[0].video.bidfloor = bidfloor;
      videoRequest.imp[0].video.bidfloorcur = bidfloorcur;
    }

    return videoRequest;
  }

  return {
    v: '$prebid.version$',
    placementCode: bid.params.placementId,
    auctionId: null,
    type: bid.params.type,
    adUnitCode: bid.adUnitCode,
    bidQid: userIds.bidQid,
    ...(userIds.eids.length ? { eids: deepClone(userIds.eids) } : {}),
    bidId: bid.bidId,
    bidder: bid.bidder,
    bidPageUrl: pageUrl,
    bidderRequestId: bid.bidderRequestId,
    bidRequestsCount: bid.bidRequestsCount,
    bidderRequestsCount: bid.bidderRequestsCount,
    sizes: parseSizesInput(bid.mediaTypes.banner.sizes).toString(),
    gdpr: bidderRequest?.gdprConsent?.gdprApplies ? 1 : 0,
    gdpr_consent: bidderRequest?.gdprConsent?.consentString || '',
    us_privacy: bidderRequest?.uspConsent || '',
  };
}

registerBidder(spec);
