import {
  deepAccess,
  flatten,
  getWindowTop,
  isGptPubadsDefined,
  logInfo,
  logMessage,
  logWarn,
  parseSizesInput
} from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {isSlotMatchingAdUnitCode} from '../libraries/gptUtils/gptUtils.js';
import { percentInView } from '../libraries/percentInView/percentInView.js';
import {isIframe} from '../libraries/omsUtils/index.js';

const BIDDER_CODE = 'underdogmedia';
const UDM_ADAPTER_VERSION = '7.30V';
const UDM_VENDOR_ID = '159';
const prebidVersion = '$prebid.version$';
const NON_MEASURABLE = -1;
const PRODUCT = {
  standard: 1,
  sticky: 2
}

let USER_SYNCED = false;

logMessage(`Initializing UDM Adapter. PBJS Version: ${prebidVersion} with adapter version: ${UDM_ADAPTER_VERSION}  Updated 2023 01 26`);

// helper function for testing user syncs
export function resetUserSync() {
  USER_SYNCED = false;
}

export const spec = {
  NON_MEASURABLE,
  code: BIDDER_CODE,
  gvlid: UDM_VENDOR_ID,
  bidParams: [],

  isBidRequestValid: function (bid) {
    if (!bid.params) {
      logWarn('[Underdog Media] bid params are missing')
      return false;
    }

    if (!bid.params.siteId) {
      logWarn('[Underdog Media] siteId is missing')
      return false;
    }

    if (bid.params.productId) {
      if (!PRODUCT[bid.params.productId]) {
        logWarn('[Underdog Media] invalid productId')
        return false;
      }
    }

    const bidSizes = bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes ? bid.mediaTypes.banner.sizes : bid.sizes;
    if (!bidSizes || bidSizes.length < 1) {
      logWarn('[Underdog Media] bid sizes are missing')
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    var sizes = [];
    var siteId = 0;

    let userIds = [];
    let thirtyThreeAcrossId;
    let unifiedId;
    let pubcid;
    if (validBidRequests[0].userIdAsEids?.length > 0) {
      userIds = validBidRequests[0].userIdAsEids;
    }
    userIds.forEach(idObj => {
      if (idObj.source === '33across.com') {
        thirtyThreeAcrossId = idObj.uids[0].id;
      } else if (idObj.source === 'adserver.org') {
        unifiedId = idObj.uids[0].id;
      } else if (idObj.source === 'pubcid.org') {
        pubcid = idObj.uids[0].id;
      }
    })

    const data = {
      dt: 10,
      gdpr: {},
      pbTimeout: +config.getConfig('bidderTimeout') || 3001, // KP: convert to number and if NaN we default to 3001. Particular value to let us know that there was a problem in converting pbTimeout
      pbjsVersion: prebidVersion,
      placements: [],
      ref: deepAccess(bidderRequest, 'refererInfo.page') ? bidderRequest.refererInfo.page : undefined,
      usp: {},
      userIds: {
        '33acrossId': thirtyThreeAcrossId,
        pubcid,
        unifiedId
      },
      version: UDM_ADAPTER_VERSION
    }

    validBidRequests.forEach(bidParam => {
      const placementObject = {}
      const bidParamSizes = bidParam.mediaTypes && bidParam.mediaTypes.banner && bidParam.mediaTypes.banner.sizes ? bidParam.mediaTypes.banner.sizes : bidParam.sizes;
      sizes = flatten(sizes, parseSizesInput(bidParamSizes));
      siteId = +bidParam.params.siteId;
      const adUnitCode = bidParam.adUnitCode
      const element = _getAdSlotHTMLElement(adUnitCode)
      const minSize = _getMinSize(bidParamSizes)

      placementObject.sizes = parseSizesInput(bidParamSizes)
      placementObject.adUnitCode = adUnitCode
      placementObject.productId = PRODUCT[bidParam.params.productId] || PRODUCT.standard
      if (deepAccess(bidParam, 'params.productId')) {
        if (bidParam.params.productId === 'standard') {
          placementObject.productId = 1
        } else if (bidParam.params.productId === 'adhesion') {
          placementObject.productId = 2
        }
      } else {
        placementObject.productId = 1
      }
      placementObject.gpid = deepAccess(bidParam, 'ortb2Imp.ext.gpid') ? bidParam.ortb2Imp.ext.gpid : undefined

      if (_isViewabilityMeasurable(element)) {
        const minSizeObj = {
          w: minSize[0],
          h: minSize[1]
        }
        const viewPercentage = Math.round(_getViewability(element, getWindowTop(), minSizeObj))
        placementObject.viewability = viewPercentage
      } else {
        placementObject.viewability = NON_MEASURABLE
      }

      data.placements.push(placementObject)
    });

    data.sid = siteId

    if (bidderRequest && bidderRequest.gdprConsent) {
      if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
        data.gdpr.gdprApplies = !!(bidderRequest.gdprConsent.gdprApplies);
      }
      if (bidderRequest.gdprConsent.vendorData && bidderRequest.gdprConsent.vendorData.vendorConsents &&
        typeof bidderRequest.gdprConsent.vendorData.vendorConsents[UDM_VENDOR_ID] !== 'undefined') {
        data.gdpr.consentGiven = !!(bidderRequest.gdprConsent.vendorData.vendorConsents[UDM_VENDOR_ID]);
      }
      if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
        data.gdpr.consentData = bidderRequest.gdprConsent.consentString;
      }
    }

    if (bidderRequest.uspConsent) {
      data.usp.uspConsent = bidderRequest.uspConsent;
    }

    if (!data.gdpr || !data.gdpr.gdprApplies || data.gdpr.consentGiven) {
      return {
        method: 'POST',
        url: `https://udmserve.net/udm/img.fetch?sid=${siteId}`,
        data: data,
        bidParams: validBidRequests
      };
    }
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    if (!USER_SYNCED && serverResponses.length > 0 && serverResponses[0].body && serverResponses[0].body.userSyncs && serverResponses[0].body.userSyncs.length > 0) {
      USER_SYNCED = true;
      const userSyncs = serverResponses[0].body.userSyncs;
      const syncs = userSyncs.filter(sync => {
        const { type } = sync;
        if (syncOptions.iframeEnabled && type === 'iframe') {
          return true
        }
        if (syncOptions.pixelEnabled && type === 'image') {
          return true
        }
        return false;
      })
      return syncs;
    }
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const mids = serverResponse.body.mids
    mids.forEach(mid => {
      const bidParam = bidRequest.bidParams.find((bidParam) => {
        return mid.ad_unit_code === bidParam.adUnitCode;
      })

      if (!bidParam) {
        return
      }

      const bidResponse = {
        requestId: bidParam.bidId,
        cpm: parseFloat(mid.cpm),
        width: mid.width,
        height: mid.height,
        ad: mid.ad_code_html,
        creativeId: mid.mid,
        currency: 'USD',
        netRevenue: false,
        ttl: mid.ttl || 300,
        meta: {
          advertiserDomains: mid.advertiser_domains || []
        }
      };

      if (bidResponse.cpm <= 0) {
        return;
      }
      if (bidResponse.ad.length <= 0) {
        return;
      }

      bidResponse.ad += makeNotification(bidResponse, mid, bidParam);

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },
};

function _getMinSize(bidParamSizes) {
  return bidParamSizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min)
}

function _getAdSlotHTMLElement(adUnitCode) {
  return document.getElementById(adUnitCode) ||
    document.getElementById(_mapAdUnitPathToElementId(adUnitCode));
}

function _mapAdUnitPathToElementId(adUnitCode) {
  if (isGptPubadsDefined()) {
    // eslint-disable-next-line no-undef
    const adSlots = googletag.pubads().getSlots();
    const isMatchingAdSlot = isSlotMatchingAdUnitCode(adUnitCode);

    for (let i = 0; i < adSlots.length; i++) {
      if (isMatchingAdSlot(adSlots[i])) {
        const id = adSlots[i].getSlotElementId();

        logInfo(`[Underdogmedia Adapter] Map ad unit path to HTML element id: '${adUnitCode}' -> ${id}`);

        return id;
      }
    }
  }

  logWarn(`[Underdogmedia Adapter] Unable to locate element for ad unit code: '${adUnitCode}'`);

  return null;
}

function _isViewabilityMeasurable(element) {
  return !isIframe() && element !== null
}

function _getViewability(element, topWin, {
  w,
  h
} = {}) {
  return topWin.document.visibilityState === 'visible'
    ? percentInView(element, {
      w,
      h
    })
    : 0
}

function makeNotification(bid, mid, bidParam) {
  let url = mid.notification_url;

  const versionIndex = url.indexOf(';version=')
  if (versionIndex + 1) {
    url = url.substring(0, versionIndex)
  }

  url += `;version=${UDM_ADAPTER_VERSION}`;
  url += ';cb=' + Math.random();
  url += ';qqq=' + (1 / bid.cpm);
  url += ';hbt=' + config.getConfig('bidderTimeout');
  url += ';style=adapter';
  url += ';vis=' + encodeURIComponent(document.visibilityState);

  url += ';traffic_info=' + encodeURIComponent(JSON.stringify(getUrlVars()));
  if (bidParam.params.subId) {
    url += ';subid=' + encodeURIComponent(bidParam.params.subId);
  }
  return '<script async src="' + url + '"></script>';
}

function getUrlVars() {
  var vars = {};
  var hash;
  var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    if (hash[0].match(/^utm_/)) {
      vars[hash[0]] = hash[1].substr(0, 150);
    }
  }
  return vars;
}

registerBidder(spec);
