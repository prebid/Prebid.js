import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  cleanObj,
  deepAccess,
  deepSetValue,
  logInfo,
  triggerPixel,
  getWinDimensions,
} from '../src/utils.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { config } from '../src/config.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';

const BIDDER_CODE = 'valuad';
const AD_URL = 'https://rtb.valuad.io/adapter';
const WON_URL = 'https://hb-dot-valuad.appspot.com/adapter/win';

function detectAdUnitPosition(adUnitCode, adSize) {
  const element = document.getElementById(adUnitCode) || document.getElementById(getGptSlotInfoForAdUnitCode(adUnitCode)?.divId);
  if (!element) return null;

  const rect = getBoundingClientRect(element);
  const docElement = document.documentElement;
  const pageWidth = docElement.clientWidth;
  const pageHeight = docElement.scrollHeight;

  return {
    unitSize: `${rect.width}x${rect.height}`,
    position: `${Math.round(rect.left + window.pageXOffset)}x${Math.round(rect.top + window.pageYOffset)}`,
    viewportVisibility: calculateVisibility(rect, adSize),
    pageSize: `${pageWidth}x${pageHeight}`,
  };
}

function calculateVisibility(rect, adSize) {
  const { innerWidth: windowWidth, innerHeight: windowHeight } = getWinDimensions();

  // Element is not in viewport
  if (rect.bottom < 0 || rect.right < 0 || rect.top > windowHeight || rect.left > windowWidth) {
    return 0;
  }

  // Calculate visible area
  let visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
  let visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);

  if (visibleHeight == 0 && visibleWidth == 0) {
    visibleHeight = Math.min(rect.top + adSize[1], windowHeight) - Math.max(rect.top, 0);
    visibleWidth = Math.min(rect.left + adSize[0], windowWidth) - Math.max(rect.left, 0);
  }

  const visibleArea = visibleHeight * visibleWidth;
  const totalArea = rect.height * rect.width;

  return totalArea > 0 ? visibleArea / totalArea : 0;
}

function getGdprConsent(bidderRequest) {
  if (!deepAccess(bidderRequest, 'gdprConsent')) {
    return false;
  }

  const {
    apiVersion,
    gdprApplies,
    consentString,
    allowAuctionWithoutConsent
  } = bidderRequest.gdprConsent;

  return cleanObj({
    apiVersion,
    consentString,
    consentRequired: gdprApplies ? 1 : 0,
    allowAuctionWithoutConsent: allowAuctionWithoutConsent ? 1 : 0
  });
}

// Enhanced ORTBConverter with additional data
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    const gdpr = getGdprConsent(bidderRequest);
    const uspConsent = deepAccess(bidderRequest, 'uspConsent') || '';
    const coppa = config.getConfig('coppa') === true ? 1 : 0;
    const { gpp, gpp_sid: gppSid } = deepAccess(bidderRequest, 'ortb2.regs', {});
    const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');

    deepSetValue(request, 'regs', {
      gdpr: gdpr.consentRequired || 0,
      coppa: coppa,
      us_privacy: uspConsent,
      ext: {
        gdpr_conset: gdpr.consentString || '',
        gpp: gpp || '',
        gppSid: gppSid || [],
        dsa: dsa,
      }
    });

    deepSetValue(request, 'device.js', 1);
    deepSetValue(request, 'device.geo', {});

    // Add bid parameters
    if (bidderRequest && bidderRequest.bids && bidderRequest.bids.length) {
      deepSetValue(request, 'ext.params', bidderRequest.bids[0].params);
    }

    // Set currency to USD
    deepSetValue(request, 'cur', ['USD']);

    // Add schain if present
    const schain = deepAccess(bidderRequest.bids[0], 'schain');
    if (schain) {
      deepSetValue(request, 'source.ext.schain', schain);
    }

    // Add eids if present
    const eids = deepAccess(bidderRequest.bids[0], 'userIdAsEids');
    if (eids) {
      deepSetValue(request, 'user.ext.eids', eids);
    }

    const ortb2 = bidderRequest.ortb2 || {};
    if (ortb2.site?.ext?.data) {
      deepSetValue(request, 'site.ext.data', {
        ...request.site.ext.data,
        ...ortb2.site.ext.data
      });
    }

    const tmax = bidderRequest.timeout;
    if (tmax) {
      deepSetValue(request, 'tmax', tmax);
    }

    return request;
  },

  imp(buildImp, bid, context) {
    const imp = buildImp(bid, context);

    const mediaType = Object.keys(bid.mediaTypes)[0];
    let adSize;

    if (mediaType === BANNER) {
      adSize = bid.mediaTypes.banner.sizes && bid.mediaTypes.banner.sizes[0];
    }

    if (!adSize) { adSize = [0, 0]; }

    // Add additional impression data
    const positionData = detectAdUnitPosition(bid.adUnitCode, adSize);
    if (positionData) {
      deepSetValue(imp, 'ext.data.position', positionData);
      deepSetValue(imp, 'ext.data.viewability', positionData.viewportVisibility);
    }

    // Handle price floors
    if (typeof bid.getFloor === 'function') {
      try {
        let size;

        if (mediaType === BANNER) {
          size = bid.mediaTypes.banner.sizes && bid.mediaTypes.banner.sizes[0];
        }

        if (size) {
          const floor = bid.getFloor({
            currency: 'USD',
            mediaType,
            size
          });

          if (floor && !isNaN(floor.floor) && floor.currency === 'USD') {
            imp.bidfloor = floor.floor;
            imp.bidfloorcur = 'USD';
          }
        }
      } catch (e) {
        logInfo('Valuad: Error getting floor', e);
      }
    }

    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    let bidResponse;
    try {
      bidResponse = buildBidResponse(bid, context);

      if (bidResponse) {
        if (bid.vbid) {
          bidResponse.vbid = bid.vbid;
        }
        if (context.bidRequest?.params?.placementId) {
          bidResponse.vid = context.bidRequest.params.placementId;
        }
      }
    } catch (e) {
      logInfo('[VALUAD CONVERTER] Error calling buildBidResponse:', e, 'Bid:', bid);
      return;
    }
    return bidResponse;
  },
});

function isBidRequestValid(bid = {}) {
  const { params, bidId, mediaTypes } = bid;

  const foundKeys = bid && bid.params && bid.params.placementId;
  let valid = Boolean(bidId && params && foundKeys);

  if (mediaTypes && mediaTypes[BANNER]) {
    valid = valid && Boolean(mediaTypes[BANNER] && mediaTypes[BANNER].sizes);
  } else {
    valid = false;
  }

  return valid;
}

function buildRequests(validBidRequests = [], bidderRequest = {}) {
  const data = converter.toORTB({ validBidRequests, bidderRequest });

  return [{
    method: 'POST',
    url: AD_URL,
    data
  }];
}

function interpretResponse(response, request) {
  // Restore original call, remove logging and safe navigation
  const bidResponses = converter.fromORTB({response: response.body, request: request.data}).bids;

  return bidResponses;
}

function getUserSyncs(syncOptions, serverResponses) {
  if (!serverResponses.length || serverResponses[0].body === '' || !serverResponses[0].body.userSyncs) {
    return false;
  }

  return serverResponses[0].body.userSyncs.map(sync => ({
    type: sync.type === 'iframe' ? 'iframe' : 'image',
    url: sync.url
  }));
}

function onBidWon(bid) {
  const {
    adUnitCode, adUnitId, auctionId, bidder, cpm, currency, originalCpm, originalCurrency, size, vbid, vid,
  } = bid;
  const bidStr = JSON.stringify({
    adUnitCode, adUnitId, auctionId, bidder, cpm, currency, originalCpm, originalCurrency, size, vbid, vid,
  });
  const encodedBidStr = window.btoa(bidStr);
  triggerPixel(WON_URL + '?b=' + encodedBidStr);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
};
registerBidder(spec);
