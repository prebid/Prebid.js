/**
 * @module modules/panxoBidAdapter
 * @description Bid Adapter for Prebid.js - AI-referred traffic monetization
 * @see https://docs.panxo.ai for Signal script installation
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { deepAccess, logWarn, isFn, isPlainObject } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'panxo';
const ENDPOINT_URL = 'https://panxo-sys.com/openrtb/2.5/bid';
const USER_ID_KEY = 'panxo_uid';
const SYNC_URL = 'https://panxo-sys.com/usersync';
const DEFAULT_CURRENCY = 'USD';
const TTL = 300;
const NET_REVENUE = true;

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export function getPanxoUserId() {
  try {
    return storage.getDataFromLocalStorage(USER_ID_KEY);
  } catch (e) {
    // storageManager handles errors internally
  }
  return null;
}

function buildBanner(bid) {
  const sizes = deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes || [];
  if (sizes.length === 0) return null;

  return {
    format: sizes.map(size => ({ w: size[0], h: size[1] })),
    w: sizes[0][0],
    h: sizes[0][1]
  };
}

function getFloorPrice(bid, size) {
  if (isFn(bid.getFloor)) {
    try {
      const floorInfo = bid.getFloor({
        currency: DEFAULT_CURRENCY,
        mediaType: BANNER,
        size: size
      });
      if (floorInfo && floorInfo.floor) {
        return floorInfo.floor;
      }
    } catch (e) {
      // Floor module error
    }
  }
  return deepAccess(bid, 'params.floor') || 0;
}

function buildUser(panxoUid, bidderRequest) {
  const user = { buyeruid: panxoUid };

  // GDPR consent
  const gdprConsent = deepAccess(bidderRequest, 'gdprConsent');
  if (gdprConsent && gdprConsent.consentString) {
    user.ext = { consent: gdprConsent.consentString };
  }

  // First Party Data - user
  const fpd = deepAccess(bidderRequest, 'ortb2.user');
  if (isPlainObject(fpd)) {
    user.ext = { ...user.ext, ...fpd.ext };
    if (fpd.data) user.data = fpd.data;
  }

  return user;
}

function buildRegs(bidderRequest) {
  const regs = { ext: {} };

  // GDPR - only set when gdprApplies is explicitly true or false, not undefined
  const gdprConsent = deepAccess(bidderRequest, 'gdprConsent');
  if (gdprConsent && typeof gdprConsent.gdprApplies === 'boolean') {
    regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
  }

  // CCPA / US Privacy
  const uspConsent = deepAccess(bidderRequest, 'uspConsent');
  if (uspConsent) {
    regs.ext.us_privacy = uspConsent;
  }

  // GPP
  const gppConsent = deepAccess(bidderRequest, 'gppConsent');
  if (gppConsent) {
    regs.ext.gpp = gppConsent.gppString;
    regs.ext.gpp_sid = gppConsent.applicableSections;
  }

  // COPPA
  const coppa = deepAccess(bidderRequest, 'ortb2.regs.coppa');
  if (coppa) {
    regs.coppa = 1;
  }

  return regs;
}

function buildDevice() {
  const device = {
    ua: navigator.userAgent,
    language: navigator.language,
    js: 1,
    dnt: navigator.doNotTrack === '1' ? 1 : 0
  };

  if (typeof screen !== 'undefined') {
    device.w = screen.width;
    device.h = screen.height;
  }

  return device;
}

function buildSite(bidderRequest) {
  const site = {
    page: deepAccess(bidderRequest, 'refererInfo.page') || '',
    domain: deepAccess(bidderRequest, 'refererInfo.domain') || '',
    ref: deepAccess(bidderRequest, 'refererInfo.ref') || ''
  };

  // First Party Data - site
  const fpd = deepAccess(bidderRequest, 'ortb2.site');
  if (isPlainObject(fpd)) {
    Object.assign(site, {
      name: fpd.name,
      cat: fpd.cat,
      sectioncat: fpd.sectioncat,
      pagecat: fpd.pagecat,
      content: fpd.content
    });
    if (fpd.ext) site.ext = fpd.ext;
  }

  return site;
}

function buildSource(bidderRequest) {
  const source = {
    tid: deepAccess(bidderRequest, 'ortb2.source.tid') || bidderRequest.auctionId
  };

  // Supply Chain (schain) - read from ortb2 where Prebid normalizes it
  const schain = deepAccess(bidderRequest, 'ortb2.source.ext.schain');
  if (isPlainObject(schain)) {
    source.ext = { schain: schain };
  }

  return source;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 1527, // IAB TCF Global Vendor List ID
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    const propertyKey = deepAccess(bid, 'params.propertyKey');
    if (!propertyKey) {
      logWarn('Panxo: Missing required param "propertyKey"');
      return false;
    }
    if (!deepAccess(bid, 'mediaTypes.banner')) {
      logWarn('Panxo: Only banner mediaType is supported');
      return false;
    }
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const panxoUid = getPanxoUserId();
    if (!panxoUid) {
      logWarn('Panxo: panxo_uid not found. Ensure Signal script is loaded before Prebid.');
      return [];
    }

    // Group bids by propertyKey to handle multiple properties on same page
    const bidsByPropertyKey = {};
    validBidRequests.forEach(bid => {
      const key = deepAccess(bid, 'params.propertyKey');
      if (!bidsByPropertyKey[key]) {
        bidsByPropertyKey[key] = [];
      }
      bidsByPropertyKey[key].push(bid);
    });

    // Build one request per propertyKey
    const requests = [];
    Object.keys(bidsByPropertyKey).forEach(propertyKey => {
      const bidsForKey = bidsByPropertyKey[propertyKey];

      const impressions = bidsForKey.map((bid) => {
        const banner = buildBanner(bid);
        if (!banner) return null;

        const sizes = deepAccess(bid, 'mediaTypes.banner.sizes') || [];
        const primarySize = sizes[0] || [300, 250];

        // Build impression object
        const imp = {
          id: bid.bidId,
          banner: banner,
          bidfloor: getFloorPrice(bid, primarySize),
          bidfloorcur: DEFAULT_CURRENCY,
          secure: 1,
          tagid: bid.adUnitCode
        };

        // Merge full ortb2Imp object (instl, pmp, ext, etc.)
        const ortb2Imp = deepAccess(bid, 'ortb2Imp');
        if (isPlainObject(ortb2Imp)) {
          Object.keys(ortb2Imp).forEach(key => {
            if (key === 'ext') {
              imp.ext = { ...imp.ext, ...ortb2Imp.ext };
            } else if (imp[key] === undefined) {
              imp[key] = ortb2Imp[key];
            }
          });
        }

        return imp;
      }).filter(Boolean);

      if (impressions.length === 0) return;

      const openrtbRequest = {
        id: bidderRequest.bidderRequestId,
        imp: impressions,
        site: buildSite(bidderRequest),
        device: buildDevice(),
        user: buildUser(panxoUid, bidderRequest),
        regs: buildRegs(bidderRequest),
        source: buildSource(bidderRequest),
        at: 1,
        cur: [DEFAULT_CURRENCY],
        tmax: bidderRequest.timeout || 1000
      };

      requests.push({
        method: 'POST',
        url: `${ENDPOINT_URL}?key=${encodeURIComponent(propertyKey)}&source=prebid`,
        data: openrtbRequest,
        options: { contentType: 'text/plain', withCredentials: false },
        bidderRequest: bidderRequest
      });
    });

    return requests;
  },

  interpretResponse(serverResponse, request) {
    const bids = [];
    const response = serverResponse.body;

    if (!response || !response.seatbid) return bids;

    const bidRequestMap = {};
    if (request.bidderRequest && request.bidderRequest.bids) {
      request.bidderRequest.bids.forEach(bid => {
        bidRequestMap[bid.bidId] = bid;
      });
    }

    response.seatbid.forEach(seatbid => {
      if (!seatbid.bid) return;

      seatbid.bid.forEach(bid => {
        const originalBid = bidRequestMap[bid.impid];
        if (!originalBid) return;

        bids.push({
          requestId: bid.impid,
          cpm: bid.price,
          currency: response.cur || DEFAULT_CURRENCY,
          width: bid.w,
          height: bid.h,
          creativeId: bid.crid || bid.id,
          dealId: bid.dealid || null,
          netRevenue: NET_REVENUE,
          ttl: bid.exp || TTL,
          ad: bid.adm,
          nurl: bid.nurl,
          meta: {
            advertiserDomains: bid.adomain || [],
            mediaType: BANNER
          }
        });
      });
    });

    return bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];

    if (syncOptions.pixelEnabled) {
      let syncUrl = SYNC_URL + '?source=prebid';

      // GDPR - only include when gdprApplies is explicitly true or false
      if (gdprConsent) {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          syncUrl += `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}`;
        }
        if (gdprConsent.consentString) {
          syncUrl += `&gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`;
        }
      }

      // US Privacy
      if (uspConsent) {
        syncUrl += `&us_privacy=${encodeURIComponent(uspConsent)}`;
      }

      // GPP
      if (gppConsent) {
        if (gppConsent.gppString) {
          syncUrl += `&gpp=${encodeURIComponent(gppConsent.gppString)}`;
        }
        if (gppConsent.applicableSections) {
          syncUrl += `&gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`;
        }
      }

      syncs.push({ type: 'image', url: syncUrl });
    }

    return syncs;
  },

  onBidWon(bid) {
    if (bid.nurl) {
      const winUrl = bid.nurl.replace(/\$\{AUCTION_PRICE\}/g, bid.cpm);
      const img = document.createElement('img');
      img.src = winUrl;
      img.style.display = 'none';
      document.body.appendChild(img);
    }
  },

  onTimeout(timeoutData) {
    logWarn('Panxo: Bid timeout', timeoutData);
  }
};

registerBidder(spec);
