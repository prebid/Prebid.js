import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  deepAccess,
  deepSetValue,
  logInfo,
  triggerPixel,
  getWindowTop
} from '../src/utils.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { config } from '../src/config.js';
import { getBoundingBox, percentInView } from '../libraries/percentInView/percentInView.js';
import {isIframe} from '../libraries/omsUtils/index.js';

const BIDDER_CODE = 'valuad';
const GVL_ID = 1478;
const AD_URL = 'https://rtb.valuad.io/adapter';
const WON_URL = 'https://hb-dot-valuad.appspot.com/adapter/win';

function _isViewabilityMeasurable(element) {
  return !isIframe() && element !== null;
}

function _getViewability(element, topWin, { w, h } = {}) {
  return (element && topWin.document.visibilityState === 'visible' && percentInView(element, { w, h })) || 0;
}

// Enhanced ORTBConverter with additional data
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    const gdpr = deepAccess(bidderRequest, 'gdprConsent') || {};
    const uspConsent = deepAccess(bidderRequest, 'uspConsent') || '';
    const coppa = config.getConfig('coppa') === true ? 1 : 0;
    const { gpp, gpp_sid: gppSid } = deepAccess(bidderRequest, 'ortb2.regs', {});
    const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');

    deepSetValue(request, 'regs', {
      gdpr: gdpr.gdprApplies ? 1 : 0,
      coppa: coppa,
      us_privacy: uspConsent,
      ext: {
        gdpr_consent: gdpr.consentString || '',
        gpp: gpp || '',
        gpp_sid: gppSid || [],
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

    const size = {w: adSize[0], h: adSize[1]};

    const element = document.getElementById(bid.adUnitCode) || document.getElementById(getGptSlotInfoForAdUnitCode(bid.adUnitCode)?.divId);
    const viewabilityAmount = _isViewabilityMeasurable(element) ? _getViewability(element, getWindowTop(), size) : 0;

    const rect = element && getBoundingBox(element, size);
    const position = rect ? `${Math.round(rect.left + window.pageXOffset)}x${Math.round(rect.top + window.pageYOffset)}` : '0x0';

    deepSetValue(imp, 'ext.data.viewability', viewabilityAmount);
    deepSetValue(imp, 'ext.data.position', position);

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
  // Handle null or missing response body
  if (!response || !response.body) {
    return [];
  }

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
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
};
registerBidder(spec);
