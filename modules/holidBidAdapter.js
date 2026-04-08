import {
  deepAccess,
  deepSetValue,
  getBidIdParameter,
  isStr,
  logMessage,
  triggerPixel,
} from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'holid';
const GVLID = 1177;

const ENDPOINT = 'https://helloworld.holid.io/openrtb2/auction';
const COOKIE_SYNC_ENDPOINT = 'https://null.holid.io/sync.html';

const TIME_TO_LIVE = 300;

// Keep win URLs in-memory (per page-load)
const wurlMap = {};

/**
 * Resolve tmax for the outgoing ORTB request.
 * Goal: respect publisher's Prebid timeout (bidderRequest.timeout) and allow an optional per-bid override,
 * without hard-forcing an arbitrary 500ms.
 *
 * Rules:
 * - If bid.params.tmax is a positive number, use it, but never exceed bidderRequest.timeout when available.
 * - Else if bidderRequest.timeout is a positive number, use it.
 * - Else omit tmax entirely (PBS will apply its own default / config).
 */
function resolveTmax(bid, bidderRequest) {
  const auctionTimeout = Number(bidderRequest?.timeout);
  const paramTmax = Number(bid?.params?.tmax);

  const hasAuctionTimeout = Number.isFinite(auctionTimeout) && auctionTimeout > 0;
  const hasParamTmax = Number.isFinite(paramTmax) && paramTmax > 0;

  if (hasParamTmax && hasAuctionTimeout) {
    return Math.min(paramTmax, auctionTimeout);
  }
  if (hasParamTmax) {
    return paramTmax;
  }
  if (hasAuctionTimeout) {
    return auctionTimeout;
  }
  return undefined;
}

/**
 * Merge stored request ID into request.ext.prebid.storedrequest.id (without clobbering other ext fields).
 * Keeps behavior consistent with the existing adapter expectation of bid.params.adUnitID.
 */
function mergeStoredRequest(ortbRequest, bid) {
  const storedId = getBidIdParameter('adUnitID', bid.params);
  if (storedId) {
    deepSetValue(ortbRequest, 'ext.prebid.storedrequest.id', storedId);
  }
}

/**
 * Merge schain into request.source.ext.schain (without overwriting request.source / request.ext).
 */
function mergeSchain(ortbRequest, bid) {
  const schain = deepAccess(bid, 'ortb2.source.ext.schain');
  if (schain) {
    deepSetValue(ortbRequest, 'source.ext.schain', schain);
  }
}

/**
 * Build a sync URL for our sync endpoint.
 */
function buildSyncUrl({ bidders, gdprConsent, uspConsent, type }) {
  const queryParams = [];

  queryParams.push('bidders=' + bidders);

  if (gdprConsent) {
    queryParams.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
    queryParams.push(
      'gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '')
    );
  } else {
    queryParams.push('gdpr=0');
  }

  if (typeof uspConsent !== 'undefined') {
    queryParams.push('us_privacy=' + encodeURIComponent(uspConsent));
  }

  queryParams.push('type=' + encodeURIComponent(type));

  return COOKIE_SYNC_ENDPOINT + '?' + queryParams.join('&');
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  // Validate bid: requires adUnitID parameter
  isBidRequestValid: function (bid) {
    return !!bid.params.adUnitID;
  },

  // Build request payload including GDPR, GPP, and US Privacy data if available
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map((bid) => {
      // Start from ortb2 (publisher modules may have populated site/user/device/ext/etc)
      const requestData = {
        ...bid.ortb2,
        id: bidderRequest.bidderRequestId,
        imp: [getImp(bid)],
      };

      // Merge (don’t overwrite) schain + storedrequest
      mergeSchain(requestData, bid);
      mergeStoredRequest(requestData, bid);

      // Resolve and set tmax (don’t hard-force)
      const tmax = resolveTmax(bid, bidderRequest);
      if (tmax) {
        requestData.tmax = tmax;
      }

      // GDPR
      if (bidderRequest && bidderRequest.gdprConsent) {
        deepSetValue(
          requestData,
          'regs.ext.gdpr',
          bidderRequest.gdprConsent.gdprApplies ? 1 : 0
        );
        deepSetValue(
          requestData,
          'user.ext.consent',
          bidderRequest.gdprConsent.consentString
        );
      }

      // GPP
      if (bidderRequest && bidderRequest.gpp) {
        deepSetValue(requestData, 'regs.ext.gpp', bidderRequest.gpp);
      }
      if (bidderRequest && bidderRequest.gppSids) {
        deepSetValue(requestData, 'regs.ext.gpp_sid', bidderRequest.gppSids);
      }

      // US Privacy
      if (bidderRequest && bidderRequest.usPrivacy) {
        deepSetValue(
          requestData,
          'regs.ext.us_privacy',
          bidderRequest.usPrivacy
        );
      }

      // User IDs
      if (bid.userIdAsEids) {
        deepSetValue(requestData, 'user.ext.eids', bid.userIdAsEids);
      }

      return {
        method: 'POST',
        url: ENDPOINT,
        data: JSON.stringify(requestData),
        bidId: bid.bidId,
      };
    });
  },

  // Interpret response: group bids by unique impid and select the highest CPM bid per imp
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponsesMap = {}; // Maps impid -> highest bid object

    if (!serverResponse.body || !serverResponse.body.seatbid) {
      return [];
    }

    serverResponse.body.seatbid.forEach((seatbid) => {
      seatbid.bid.forEach((bid) => {
        const impId = bid.impid; // Unique identifier matching getImp(bid).id

        // --- MINIMAL CHANGE START ---
        // Build meta object and propagate advertiser domains for hb_adomain
        const meta = deepAccess(bid, 'ext.prebid.meta', {}) || {};

        // Read ORTB adomain; normalize to array of clean strings
        let advertiserDomains = deepAccess(bid, 'adomain', []);
        advertiserDomains = Array.isArray(advertiserDomains)
          ? advertiserDomains
            .filter(Boolean)
            .map((d) =>
              String(d)
                .toLowerCase()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .trim()
            )
          : [];

        if (advertiserDomains.length > 0) {
          meta.advertiserDomains = advertiserDomains; // <-- Prebid uses this to set hb_adomain
        }

        const networkId = deepAccess(bid, 'ext.prebid.meta.networkId');
        if (networkId) {
          meta.networkId = networkId;
        }

        // Keep writing back for completeness (preserves existing behavior)
        deepSetValue(bid, 'ext.prebid.meta', meta);
        // --- MINIMAL CHANGE END ---

        const currentBidResponse = {
          requestId: impId, // Using imp.id as the unique request identifier
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ad: bid.adm,
          creativeId: bid.crid,
          currency: serverResponse.body.cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          meta: meta, // includes advertiserDomains now
        };

        // For each imp, only keep the bid with the highest CPM
        if (
          !bidResponsesMap[impId] ||
          currentBidResponse.cpm > bidResponsesMap[impId].cpm
        ) {
          bidResponsesMap[impId] = currentBidResponse;
        }

        // Store win notification URL (if provided) using the impid as key
        const wurl = deepAccess(bid, 'ext.prebid.events.win');
        if (wurl) {
          addWurl(impId, wurl);
        }
      });
    });

    return Object.values(bidResponsesMap);
  },

  // User syncs: supports both image and iframe syncing with privacy parameters if available
  getUserSyncs(optionsType, serverResponse, gdprConsent, uspConsent) {
    const syncs = [
      {
        type: 'image',
        url: 'https://track.adform.net/Serving/TrackPoint/?pm=2992097&lid=132720821',
      },
    ];

    if (
      !serverResponse ||
      (Array.isArray(serverResponse) && serverResponse.length === 0)
    ) {
      return syncs;
    }

    const responses = Array.isArray(serverResponse) ? serverResponse : [serverResponse];
    const bidders = getBidders(responses);

    // Prefer iframe when allowed
    if (optionsType.iframeEnabled && bidders) {
      syncs.push({
        type: 'iframe',
        url: buildSyncUrl({
          bidders,
          gdprConsent,
          uspConsent,
          type: 'iframe',
        }),
      });
      return syncs;
    }

    // Fallback: if iframe is disabled but pixels are enabled, attempt a pixel-based sync call
    // (Your sync endpoint must support this mode for it to be effective.)
    if (optionsType.pixelEnabled && bidders) {
      syncs.push({
        type: 'image',
        url: buildSyncUrl({
          bidders,
          gdprConsent,
          uspConsent,
          type: 'image',
        }),
      });
    }

    return syncs;
  },

  // On bid win, trigger win notification via an image pixel if available
  onBidWon(bid) {
    const wurl = getWurl(bid.requestId);
    if (wurl) {
      logMessage(`Invoking image pixel for wurl on BID_WIN: "${wurl}"`);
      triggerPixel(wurl);
      removeWurl(bid.requestId);
    }
  },
};

// Create a unique impression object with bid id as the identifier
function getImp(bid) {
  const imp = buildStoredRequest(bid);
  imp.id = bid.bidId; // Ensure imp.id is unique to match the bid response correctly

  const sizes = bid.sizes && !Array.isArray(bid.sizes[0]) ? [bid.sizes] : bid.sizes;

  if (deepAccess(bid, 'mediaTypes.banner')) {
    imp.banner = {
      format: sizes.map((size) => {
        return { w: size[0], h: size[1] };
      }),
    };
  }

  // Include bid floor if defined in bid.params
  if (bid.params.floor) {
    imp.bidfloor = bid.params.floor;
  }

  return imp;
}

// Build stored request object using bid parameters
function buildStoredRequest(bid) {
  return {
    ext: {
      prebid: {
        storedrequest: {
          id: getBidIdParameter('adUnitID', bid.params),
        },
      },
    },
  };
}

// Helper: Extract unique bidders from responses for user syncs
// Primary source: ext.responsetimemillis (PBS), fallback: seatbid[].seat
function getBidders(responses) {
  const bidderSet = new Set();

  responses.forEach((res) => {
    const rtm = deepAccess(res, 'body.ext.responsetimemillis');
    if (rtm && typeof rtm === 'object') {
      Object.keys(rtm).forEach((k) => bidderSet.add(k));
    }

    const seatbid = deepAccess(res, 'body.seatbid', []);
    if (Array.isArray(seatbid)) {
      seatbid.forEach((sb) => {
        if (sb && sb.seat) bidderSet.add(sb.seat);
      });
    }
  });

  if (bidderSet.size) {
    return encodeURIComponent(JSON.stringify([...bidderSet]));
  }
}

// Win URL helper functions
function addWurl(requestId, wurl) {
  if (isStr(requestId)) {
    wurlMap[requestId] = wurl;
  }
}

function removeWurl(requestId) {
  delete wurlMap[requestId];
}

function getWurl(requestId) {
  if (isStr(requestId)) {
    return wurlMap[requestId];
  }
}

registerBidder(spec);
