import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepClone, deepAccess, logWarn, logError, triggerPixel } from '../src/utils.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'revantage';
const ENDPOINT_URL = 'https://bid.revantage.io/bid';
const SYNC_URL = 'https://sync.revantage.io/sync';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.feedId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    // Handle null/empty bid requests
    if (!validBidRequests || validBidRequests.length === 0) {
      return [];
    }

    // All bid requests in a batch must have the same feedId
    // If not, we log a warning and return an empty array
    const feedId = validBidRequests[0]?.params?.feedId;
    const allSameFeedId = validBidRequests.every(bid => bid.params.feedId === feedId);
    if (!allSameFeedId) {
      logWarn('Revantage: All bid requests in a batch must have the same feedId');
      return [];
    }

    try {
      const openRtbBidRequest = makeOpenRtbRequest(validBidRequests, bidderRequest);
      return {
        method: 'POST',
        url: ENDPOINT_URL + '?feed=' + encodeURIComponent(feedId),
        data: JSON.stringify(openRtbBidRequest),
        options: {
          contentType: 'text/plain',
          withCredentials: false
        },
        bidRequests: validBidRequests
      };
    } catch (e) {
      logError('Revantage: buildRequests failed', e);
      return [];
    }
  },

  interpretResponse: function(serverResponse, request) {
    const bids = [];
    const resp = serverResponse.body;
    const originalBids = request.bidRequests || [];
    const bidIdMap = {};
    originalBids.forEach(b => { bidIdMap[b.bidId] = b; });

    if (!resp || !Array.isArray(resp.seatbid)) return bids;

    resp.seatbid.forEach(seatbid => {
      if (Array.isArray(seatbid.bid)) {
        seatbid.bid.forEach(rtbBid => {
          const originalBid = bidIdMap[rtbBid.impid];
          if (!originalBid || !rtbBid.price || rtbBid.price <= 0) return;

          // Check for ad markup
          const hasAdMarkup = !!(rtbBid.adm || rtbBid.vastXml || rtbBid.vastUrl);
          if (!hasAdMarkup) {
            logWarn('Revantage: No ad markup in bid');
            return;
          }

          const bidResponse = {
            requestId: originalBid.bidId,
            cpm: rtbBid.price,
            width: rtbBid.w || getFirstSize(originalBid, 0, 300),
            height: rtbBid.h || getFirstSize(originalBid, 1, 250),
            creativeId: rtbBid.crid || rtbBid.id || rtbBid.adid || 'revantage-' + Date.now(),
            dealId: rtbBid.dealid,
            currency: resp.cur || 'USD',
            netRevenue: true,
            ttl: 300,
            meta: {
              advertiserDomains: rtbBid.adomain || [],
              dsp: seatbid.seat || 'unknown',
              networkName: 'Revantage'
            }
          };

          // Add burl for server-side win notification
          if (rtbBid.burl) {
            bidResponse.burl = rtbBid.burl;
          }

          // Determine if this is a video bid
          // FIX: Check for VAST content in adm even for multi-format ad units
          const isVideo = (rtbBid.ext && rtbBid.ext.mediaType === 'video') ||
                         rtbBid.vastXml || rtbBid.vastUrl ||
                         isVastAdm(rtbBid.adm) ||
                         (originalBid.mediaTypes && originalBid.mediaTypes.video &&
                          !originalBid.mediaTypes.banner);

          if (isVideo) {
            bidResponse.mediaType = VIDEO;
            bidResponse.vastXml = rtbBid.vastXml || rtbBid.adm;
            bidResponse.vastUrl = rtbBid.vastUrl;

            if (!bidResponse.vastUrl && !bidResponse.vastXml) {
              logWarn('Revantage: Video bid missing VAST content');
              return;
            }
          } else {
            bidResponse.mediaType = BANNER;
            bidResponse.ad = rtbBid.adm;

            if (!bidResponse.ad) {
              logWarn('Revantage: Banner bid missing ad markup');
              return;
            }
          }

          // Add DSP price if available
          if (rtbBid.ext && rtbBid.ext.dspPrice) {
            bidResponse.meta.dspPrice = rtbBid.ext.dspPrice;
          }

          bids.push(bidResponse);
        });
      }
    });

    return bids;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    let params = '?cb=' + new Date().getTime();

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      }
      if (typeof gdprConsent.consentString === 'string') {
        params += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString);
      }
    }

    if (uspConsent && typeof uspConsent === 'string') {
      params += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    if (gppConsent) {
      if (gppConsent.gppString) {
        params += '&gpp=' + encodeURIComponent(gppConsent.gppString);
      }
      if (gppConsent.applicableSections) {
        params += '&gpp_sid=' + encodeURIComponent(gppConsent.applicableSections.join(','));
      }
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({ type: 'iframe', url: SYNC_URL + params });
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({ type: 'image', url: SYNC_URL + params + '&tag=img' });
    }

    return syncs;
  },

  onBidWon: function(bid) {
    if (bid.burl) {
      triggerPixel(bid.burl);
    }
  }
};

// === MAIN RTB BUILDER ===
function makeOpenRtbRequest(validBidRequests, bidderRequest) {
  const imp = validBidRequests.map(bid => {
    const sizes = getSizes(bid);
    const floor = getBidFloorEnhanced(bid);

    const impression = {
      id: bid.bidId,
      tagid: bid.adUnitCode,
      bidfloor: floor,
      ext: {
        feedId: deepAccess(bid, 'params.feedId'),
        bidder: {
          placementId: deepAccess(bid, 'params.placementId'),
          publisherId: deepAccess(bid, 'params.publisherId')
        }
      }
    };

    // Add banner specs
    if (bid.mediaTypes && bid.mediaTypes.banner) {
      impression.banner = {
        w: sizes[0][0],
        h: sizes[0][1],
        format: sizes.map(size => ({ w: size[0], h: size[1] }))
      };
    }

    // Add video specs
    if (bid.mediaTypes && bid.mediaTypes.video) {
      const video = bid.mediaTypes.video;
      impression.video = {
        mimes: video.mimes || ['video/mp4', 'video/webm'],
        minduration: video.minduration || 0,
        maxduration: video.maxduration || 60,
        protocols: video.protocols || [2, 3, 5, 6],
        w: getVideoSize(video.playerSize, 0, 640),
        h: getVideoSize(video.playerSize, 1, 360),
        placement: video.placement || 1,
        playbackmethod: video.playbackmethod || [1, 2],
        api: video.api || [1, 2],
        skip: video.skip || 0,
        skipmin: video.skipmin || 0,
        skipafter: video.skipafter || 0,
        pos: video.pos || 0,
        startdelay: video.startdelay || 0,
        linearity: video.linearity || 1
      };
    }

    return impression;
  });

  let user = {};
  if (validBidRequests[0] && validBidRequests[0].userIdAsEids) {
    user.eids = deepClone(validBidRequests[0].userIdAsEids);
  }

  const ortb2 = bidderRequest.ortb2 || {};
  const site = {
    domain: typeof window !== 'undefined' ? window.location.hostname : '',
    page: typeof window !== 'undefined' ? window.location.href : '',
    ref: typeof document !== 'undefined' ? document.referrer : ''
  };

  // Merge ortb2 site data
  if (ortb2.site) {
    Object.assign(site, deepClone(ortb2.site));
  }

  const device = deepClone(ortb2.device) || {};
  // Add basic device info if not present
  if (!device.ua) {
    device.ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  }
  if (!device.language) {
    device.language = typeof navigator !== 'undefined' ? navigator.language : '';
  }
  if (!device.w) {
    device.w = typeof screen !== 'undefined' ? screen.width : 0;
  }
  if (!device.h) {
    device.h = typeof screen !== 'undefined' ? screen.height : 0;
  }
  if (!device.devicetype) {
    device.devicetype = getDeviceType();
  }

  const regs = { ext: {} };
  if (bidderRequest.gdprConsent) {
    regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    user.ext = { consent: bidderRequest.gdprConsent.consentString };
  }
  if (bidderRequest.uspConsent) {
    regs.ext.us_privacy = bidderRequest.uspConsent;
  }

  // Add GPP consent
  if (bidderRequest.gppConsent) {
    if (bidderRequest.gppConsent.gppString) {
      regs.ext.gpp = bidderRequest.gppConsent.gppString;
    }
    if (bidderRequest.gppConsent.applicableSections) {
      // Send as array, not comma-separated string
      regs.ext.gpp_sid = bidderRequest.gppConsent.applicableSections;
    }
  }

  // Get supply chain
  const schain = bidderRequest.schain || (validBidRequests[0] && validBidRequests[0].schain);

  return {
    id: bidderRequest.auctionId,
    imp: imp,
    site: site,
    device: device,
    user: user,
    regs: regs,
    schain: schain,
    tmax: bidderRequest.timeout || 1000,
    cur: ['USD'],
    ext: {
      prebid: {
        version: '$prebid.version$'
      }
    }
  };
}

// === UTILS ===
function getSizes(bid) {
  if (bid.mediaTypes && bid.mediaTypes.banner && Array.isArray(bid.mediaTypes.banner.sizes) && bid.mediaTypes.banner.sizes.length > 0) {
    return bid.mediaTypes.banner.sizes;
  }
  if (bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.playerSize && bid.mediaTypes.video.playerSize.length > 0) {
    return bid.mediaTypes.video.playerSize;
  }
  if (bid.sizes && bid.sizes.length > 0) {
    return bid.sizes;
  }
  return [[300, 250]];
}

function getFirstSize(bid, index, defaultVal) {
  const sizes = getSizes(bid);
  return (sizes && sizes[0] && sizes[0][index]) || defaultVal;
}

/**
 * Safely extract video dimensions from playerSize.
 * Handles both nested [[640, 480]] and flat [640, 480] formats.
 * @param {Array} playerSize - video.playerSize from mediaTypes config
 * @param {number} index - 0 for width, 1 for height
 * @param {number} defaultVal - fallback value
 * @returns {number}
 */
function getVideoSize(playerSize, index, defaultVal) {
  if (!playerSize || !Array.isArray(playerSize) || playerSize.length === 0) {
    return defaultVal;
  }
  // Nested: [[640, 480]] or [[640, 480], [320, 240]]
  if (Array.isArray(playerSize[0])) {
    return playerSize[0][index] || defaultVal;
  }
  // Flat: [640, 480]
  if (typeof playerSize[0] === 'number') {
    return playerSize[index] || defaultVal;
  }
  return defaultVal;
}

/**
 * Detect if adm content is VAST XML (for multi-format video detection).
 * @param {string} adm - ad markup string
 * @returns {boolean}
 */
function isVastAdm(adm) {
  if (typeof adm !== 'string') return false;
  const trimmed = adm.trim();
  return trimmed.startsWith('<VAST') || trimmed.startsWith('<?xml');
}

function getBidFloorEnhanced(bid) {
  let floor = 0;
  if (typeof bid.getFloor === 'function') {
    const mediaType = (bid.mediaTypes && bid.mediaTypes.video) ? 'video' : 'banner';
    const sizes = getSizes(bid);

    // Try size-specific floors first
    for (let i = 0; i < sizes.length; i++) {
      try {
        const floorInfo = bid.getFloor({
          currency: 'USD',
          mediaType: mediaType,
          size: sizes[i]
        });
        if (floorInfo && floorInfo.floor > floor && floorInfo.currency === 'USD' && !isNaN(floorInfo.floor)) {
          floor = floorInfo.floor;
        }
      } catch (e) {
        // Continue to next size
      }
    }

    // Fallback to general floor
    if (floor === 0) {
      try {
        const floorInfo = bid.getFloor({ currency: 'USD', mediaType: mediaType, size: '*' });
        if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(floorInfo.floor)) {
          floor = floorInfo.floor;
        }
      } catch (e) {
        logWarn('Revantage: getFloor threw error', e);
      }
    }
  }
  return floor;
}

function getDeviceType() {
  if (typeof screen === 'undefined') return 1;
  const width = screen.width;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  if (/iPhone|iPod/i.test(ua) || (width < 768 && /Mobile/i.test(ua))) return 2; // Mobile
  if (/iPad/i.test(ua) || (width >= 768 && width < 1024)) return 5; // Tablet
  return 1; // Desktop/PC
}

// === REGISTER ===
registerBidder(spec);
