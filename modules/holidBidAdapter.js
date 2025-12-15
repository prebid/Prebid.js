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
const TMAX = 500;
const wurlMap = {};

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
      const requestData = {
        ...bid.ortb2,
        source: {
          ext: {
            schain: bid?.ortb2?.source?.ext?.schain
          }
        },
        id: bidderRequest.bidderRequestId,
        imp: [getImp(bid)],
        tmax: TMAX,
        ...buildStoredRequest(bid),
      };

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
        deepSetValue(requestData, 'regs.ext.us_privacy', bidderRequest.usPrivacy);
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
            .map(d => String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').trim())
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

    if (!serverResponse || (Array.isArray(serverResponse) && serverResponse.length === 0)) {
      return syncs;
    }

    const responses = Array.isArray(serverResponse)
      ? serverResponse
      : [serverResponse];
    const bidders = getBidders(responses);

    if (optionsType.iframeEnabled && bidders) {
      const queryParams = [];
      queryParams.push('bidders=' + bidders);

      if (gdprConsent) {
        queryParams.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
        queryParams.push(
          'gdpr_consent=' +
          encodeURIComponent(gdprConsent.consentString || '')
        );
      } else {
        queryParams.push('gdpr=0');
      }

      if (typeof uspConsent !== 'undefined') {
        queryParams.push('us_privacy=' + encodeURIComponent(uspConsent));
      }

      queryParams.push('type=iframe');
      const strQueryParams = '?' + queryParams.join('&');

      syncs.push({
        type: 'iframe',
        url: COOKIE_SYNC_ENDPOINT + strQueryParams,
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
  const sizes =
    bid.sizes && !Array.isArray(bid.sizes[0]) ? [bid.sizes] : bid.sizes;

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
function getBidders(responses) {
  const bidders = responses
    .map((res) => Object.keys(res.body.ext?.responsetimemillis || {}))
    .flat();

  if (bidders.length) {
    return encodeURIComponent(JSON.stringify([...new Set(bidders)]));
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
