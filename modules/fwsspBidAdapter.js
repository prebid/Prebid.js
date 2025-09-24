import { logInfo, logError, logWarn, isArray, isFn, deepAccess, formatQS } from '../src/utils.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { getGlobal } from '../src/prebidGlobal.js';

const BIDDER_CODE = 'fwssp';
const GVL_ID = 285;
const USER_SYNC_URL = 'https://ads.stickyadstv.com/auto-user-sync';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],
  aliases: [ 'freewheel-mrm'], //  aliases for fwssp

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {Object} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid(bid) {
    return !!(bid.params.serverUrl && bid.params.networkId && bid.params.profile && bid.params.siteSectionId && bid.params.videoAssetId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Object[]} bidRequests - an array of bidRequests
   * @param {Object[]} bidderRequest - an array of bidderRequests
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests(bidRequests, bidderRequest) {
    /**
     * Builds a bid request object for FreeWheel Server-Side Prebid adapter
     * @param {Object} currentBidRequest - The bid request object containing bid parameters
     * @param {Object} bidderRequest - The bidder request object containing consent and other global parameters
     * @returns {Object} Request object containing method, url, data and original bid request
     *   - method: HTTP method (GET)
     *   - url: Server URL for the bid request
     *   - data: Query parameters string
     *   - bidRequest: Original bid request object
     * @private
     */
    const buildRequest = (currentBidRequest, bidderRequest) => {
      const globalParams = constructGlobalParams(currentBidRequest);
      const keyValues = constructKeyValues(currentBidRequest, bidderRequest);

      const slotParams = constructSlotParams(currentBidRequest);
      const dataString = constructDataString(globalParams, keyValues, slotParams);
      return {
        method: 'GET',
        url: currentBidRequest.params.serverUrl,
        data: dataString,
        bidRequest: currentBidRequest
      };
    }

    const constructGlobalParams = currentBidRequest => {
      const sdkVersion = getSDKVersion(currentBidRequest);
      const prebidVersion = getGlobal().version;
      return {
        nw: currentBidRequest.params.networkId,
        resp: 'vast4',
        prof: currentBidRequest.params.profile,
        csid: currentBidRequest.params.siteSectionId,
        caid: currentBidRequest.params.videoAssetId,
        pvrn: getRandomNumber(),
        vprn: getRandomNumber(),
        flag: setFlagParameter(currentBidRequest.params.flags),
        mode: currentBidRequest.params.mode ? currentBidRequest.params.mode : 'on-demand',
        vclr: `js-${sdkVersion}-prebid-${prebidVersion}`
      };
    }

    const getRandomNumber = () => {
      return (new Date().getTime() * Math.random()).toFixed(0);
    }

    const setFlagParameter = optionalFlags => {
      logInfo('setFlagParameter, optionalFlags: ', optionalFlags);
      const requiredFlags = '+fwssp+emcr+nucr+aeti+rema+exvt+fwpbjs';
      return optionalFlags ? optionalFlags + requiredFlags : requiredFlags;
    }

    const constructKeyValues = (currentBidRequest, bidderRequest) => {
      const keyValues = currentBidRequest.params.adRequestKeyValues || {};

      // Add bidfloor to keyValues
      const { floor, currency } = getBidFloor(currentBidRequest, config);
      keyValues._fw_bidfloor = floor;
      keyValues._fw_bidfloorcur = currency;

      // Add GDPR flag and consent string
      if (bidderRequest && bidderRequest.gdprConsent) {
        keyValues._fw_gdpr_consent = bidderRequest.gdprConsent.consentString;
        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          keyValues._fw_gdpr = bidderRequest.gdprConsent.gdprApplies;
        }
      }

      if (currentBidRequest.params.gdpr_consented_providers) {
        keyValues._fw_gdpr_consented_providers = currentBidRequest.params.gdpr_consented_providers;
      }

      // Add CCPA consent string
      if (bidderRequest && bidderRequest.uspConsent) {
        keyValues._fw_us_privacy = bidderRequest.uspConsent;
      }

      // Add GPP consent
      if (bidderRequest && bidderRequest.gppConsent) {
        keyValues.gpp = bidderRequest.gppConsent.gppString;
        keyValues.gpp_sid = bidderRequest.gppConsent.applicableSections;
      } else if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.regs && bidderRequest.ortb2.regs.gpp) {
        keyValues.gpp = bidderRequest.ortb2.regs.gpp;
        keyValues.gpp_sid = bidderRequest.ortb2.regs.gpp_sid;
      }

      // Add content object
      if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.site && bidderRequest.ortb2.site.content && typeof bidderRequest.ortb2.site.content === 'object') {
        try {
          keyValues._fw_prebid_content = JSON.stringify(bidderRequest.ortb2.site.content);
        } catch (error) {
          logWarn('PREBID - ' + BIDDER_CODE + ': Unable to stringify the content object: ' + error);
        }
      }

      // Add schain object
      let schain = deepAccess(bidderRequest, 'ortb2.source.schain');
      if (!schain) {
        schain = deepAccess(bidderRequest, 'ortb2.source.ext.schain');
      }
      if (!schain) {
        schain = currentBidRequest.schain;
      }

      if (schain) {
        try {
          keyValues.schain = JSON.stringify(schain);
        } catch (error) {
          logWarn('PREBID - ' + BIDDER_CODE + ': Unable to stringify the schain: ' + error);
        }
      }

      // Add 3rd party user ID
      if (currentBidRequest.userIdAsEids && currentBidRequest.userIdAsEids.length > 0) {
        try {
          keyValues._fw_prebid_3p_UID = JSON.stringify(currentBidRequest.userIdAsEids);
        } catch (error) {
          logWarn('PREBID - ' + BIDDER_CODE + ': Unable to stringify the userIdAsEids: ' + error);
        }
      }

      const location = bidderRequest?.refererInfo?.page;
      if (isValidUrl(location)) {
        keyValues.loc = location;
      }

      let playerSize = [];
      if (currentBidRequest.mediaTypes.video && currentBidRequest.mediaTypes.video.playerSize) {
        // If mediaTypes is video, get size from mediaTypes.video.playerSize per http://prebid.org/blog/pbjs-3
        if (isArray(currentBidRequest.mediaTypes.video.playerSize[0])) {
          playerSize = currentBidRequest.mediaTypes.video.playerSize[0];
        } else {
          playerSize = currentBidRequest.mediaTypes.video.playerSize;
        }
      } else if (currentBidRequest.mediaTypes.banner.sizes) {
        // If mediaTypes is banner, get size from mediaTypes.banner.sizes per http://prebid.org/blog/pbjs-3
        playerSize = getBiggerSizeWithLimit(currentBidRequest.mediaTypes.banner.sizes, currentBidRequest.mediaTypes.banner.minSizeLimit, currentBidRequest.mediaTypes.banner.maxSizeLimit);
      } else {
        // Backward compatible code, in case size still pass by sizes in bid request
        playerSize = getBiggerSize(currentBidRequest.sizes);
      }

      // Add player size to keyValues
      if (playerSize[0] > 0 || playerSize[1] > 0) {
        keyValues._fw_player_width = keyValues._fw_player_width ? keyValues._fw_player_width : playerSize[0];
        keyValues._fw_player_height = keyValues._fw_player_height ? keyValues._fw_player_height : playerSize[1];
      }

      // Add video context and placement in keyValues
      if (currentBidRequest.mediaTypes.video) {
        let videoContext = currentBidRequest.mediaTypes.video.context ? currentBidRequest.mediaTypes.video.context : '';
        let videoPlacement = currentBidRequest.mediaTypes.video.placement ? currentBidRequest.mediaTypes.video.placement : null;
        const videoPlcmt = currentBidRequest.mediaTypes.video.plcmt ? currentBidRequest.mediaTypes.video.plcmt : null;

        if (currentBidRequest.params.format === 'inbanner') {
          videoContext = 'In-Banner';
          videoPlacement = 2;
        }

        keyValues._fw_video_context = videoContext;
        keyValues._fw_placement_type = videoPlacement;
        keyValues._fw_plcmt_type = videoPlcmt;
      }
      return keyValues;
    }

    const constructSlotParams = currentBidRequest => {
      /**
       * Parameters for ad slot configuration
       * @property {number} tpos - Position type (default: 0)
       * @property {string} ptgt - 'a': temporal slot
       *                           's': site section non-temporal slot
       *                           'p': video player non-temporal slot
       * @property {string} slid - Slot ID
       * @property {string} slau - Slot Ad Unit
       * @property {number} mind - Minimum duration for the ad slot
       * @property {number} maxd - Maximum duration for the ad slot
       *
       * Usually we do not suggest to set slid and slau from config,
       * unless the ad targeting slot is not preroll
       */
      const slotParams = {
        tpos: currentBidRequest.params.tpos ? currentBidRequest.params.tpos : 0,
        ptgt: 'a',   // Currently only support temporal slot
        slid: currentBidRequest.params.slid ? currentBidRequest.params.slid : 'Preroll_1',
        slau: currentBidRequest.params.slau ? currentBidRequest.params.slau : 'preroll',
      }
      const video = deepAccess(currentBidRequest, 'mediaTypes.video') || {};
      const mind = video.minduration || currentBidRequest.params.minD;
      const maxd = video.maxduration || currentBidRequest.params.maxD;

      if (mind) {
        slotParams.mind = mind;
      }
      if (maxd) {
        slotParams.maxd = maxd;
      }
      return slotParams
    }

    const constructDataString = (globalParams, keyValues, slotParams) => {
      // Helper function to append parameters to the data string and to not include the last '&' param before ';
      const appendParams = (params) => {
        const keys = Object.keys(params);
        return keys.map((key, index) => {
          const encodedKey = encodeURIComponent(key);
          const encodedValue = encodeURIComponent(params[key]);
          return `${encodedKey}=${encodedValue}${index < keys.length - 1 ? '&' : ''}`;
        }).join('');
      };

      const globalParamsString = appendParams(globalParams) + ';';
      const keyValuesString = appendParams(keyValues) + ';';
      const slotParamsString = appendParams(slotParams) + ';';

      return globalParamsString + keyValuesString + slotParamsString;
    }

    return bidRequests.map(function(currentBidRequest) {
      return buildRequest(currentBidRequest, bidderRequest);
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {object} request the built request object containing the initial bidRequest.
   * @return {object[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {
    const bidrequest = request.bidRequest;
    let playerSize = [];
    if (bidrequest.mediaTypes.video && bidrequest.mediaTypes.video.playerSize) {
      // If mediaTypes is video, get size from mediaTypes.video.playerSize per http://prebid.org/blog/pbjs-3
      if (isArray(bidrequest.mediaTypes.video.playerSize[0])) {
        playerSize = bidrequest.mediaTypes.video.playerSize[0];
      } else {
        playerSize = bidrequest.mediaTypes.video.playerSize;
      }
    } else if (bidrequest.mediaTypes.banner.sizes) {
      // If mediaTypes is banner, get size from mediaTypes.banner.sizes per http://prebid.org/blog/pbjs-3
      playerSize = getBiggerSizeWithLimit(bidrequest.mediaTypes.banner.sizes, bidrequest.mediaTypes.banner.minSizeLimit, bidrequest.mediaTypes.banner.maxSizeLimit);
    } else {
      // Backward compatible code, in case size still pass by sizes in bid request
      playerSize = getBiggerSize(bidrequest.sizes);
    }

    if (typeof serverResponse === 'object' && typeof serverResponse.body === 'string') {
      serverResponse = serverResponse.body;
    }

    let xmlDoc;
    try {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(serverResponse, 'application/xml');
    } catch (err) {
      logWarn('Prebid.js - ' + BIDDER_CODE + ' : ' + err);
      return;
    }

    const bidResponses = [];

    const princingData = getPricing(xmlDoc);
    if (princingData.price) {
      const bidResponse = {
        requestId: bidrequest.bidId,
        cpm: princingData.price,
        width: playerSize[0],
        height: playerSize[1],
        creativeId: getCreativeId(xmlDoc),
        currency: princingData.currency,
        netRevenue: true,
        ttl: 360,
        meta: { advertiserDomains: getAdvertiserDomain(xmlDoc) },
        dealId: getDealId(xmlDoc),
        campaignId: getCampaignId(xmlDoc),
        bannerId: getBannerId(xmlDoc)
      };

      if (bidrequest.mediaTypes.video) {
        bidResponse.mediaType = 'video';
      }

      const topWin = getTopMostWindow();
      if (!topWin.fwssp_cache) {
        topWin.fwssp_cache = {};
      }
      topWin.fwssp_cache[bidrequest.adUnitCode] = {
        response: serverResponse,
        listeners: bidrequest.params.listeners
      };

      bidResponse.vastXml = serverResponse;
      bidResponse.ad = formatAdHTML(bidrequest, playerSize, serverResponse);
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    const params = {};

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params.gdpr = Number(gdprConsent.gdprApplies);
        params.gdpr_consent = gdprConsent.consentString;
      } else {
        params.gdpr_consent = gdprConsent.consentString;
      }
    }

    if (uspConsent) {
      params.us_privacy = uspConsent;
    }

    if (gppConsent) {
      if (typeof gppConsent.gppString === 'string') {
        params.gpp = gppConsent.gppString;
      }
      if (gppConsent.applicableSections) {
        params.gpp_sid = gppConsent.applicableSections;
      }
    }

    let queryString = '';
    if (params) {
      queryString = '?' + `${formatQS(params)}`;
    }

    const syncs = [];
    if (syncOptions && syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: USER_SYNC_URL + queryString
      });
    } else if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: USER_SYNC_URL + queryString
      });
    }

    return syncs;
  }
}

/**
 * Generates structured HTML for FreeWheel MRM ad integration with Prebid.js
 * @param {Object} bidrequest - Prebid bid request
 * @param {number[]} size - Prebid ad dimensions [width, height]
 * @returns {string} Formatted HTML string for ad rendering
 */
export function formatAdHTML(bidrequest, size) {
  const sdkUrl = getSdkUrl(bidrequest);
  const displayBaseId = 'fwssp_display_base';

  const startMuted = typeof bidrequest.params.isMuted === 'boolean' ? bidrequest.params.isMuted : true
  const showMuteButton = typeof bidrequest.params.showMuteButton === 'boolean' ? bidrequest.params.showMuteButton : false

  let playerParams = null;
  try {
    playerParams = JSON.stringify(bidrequest.params.playerParams);
  } catch (error) {
    logWarn('Error parsing playerParams:', error);
  }

  return `<div id='${displayBaseId}' class='ad-container' style='width:${size[0]}px;height:${size[1]}px;'>
  <script type='text/javascript'>
    const script = document.createElement('script');
    script.src = '${sdkUrl}';
    script.async = true;

    const topWindow = function() {
      let res = window;
      try {
        while (top !== res) {
          if (res.parent.location.href.length) {
            res = res.parent;
          }
        }
      } catch (e) {}
      return res;
    }();
    const cache = topWindow.fwssp_cache ? topWindow.fwssp_cache['${bidrequest.adUnitCode}'] : null;
    const vastResponse = cache ? cache.response : null;
    const listeners = cache ? cache.listeners : null;

    const config = {
      displayBaseId: '${displayBaseId}',
      vastResponse: vastResponse,
      showMuteButton: ${showMuteButton},
      startMuted: ${startMuted},
      playerParams: ${playerParams},
      format: 'outstream',
      listeners: listeners
    };

    const timeoutId = setTimeout(() => {
      console.warn('MRM AdManager load timeout: 5000 ms');
      cleanup();
    }, 5000);

    script.onload = () => {
      clearTimeout(timeoutId);
      this.prebidPlayer = window.tv.freewheel.SDK.newPrebidPlayer(config);
    };

    script.onerror = (err) => {
      cleanup();
      console.warn('MRM AdManager load failed:', err.message);
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      script.remove();
      var displayBase = document.getElementById('${displayBaseId}');
      if (displayBase) {
        displayBase.remove();
      }
    };

    document.head.appendChild(script);
  </script>
</div>`;
}

function getSdkUrl(bidrequest) {
  const isStg = bidrequest.params.env && bidrequest.params.env.toLowerCase() === 'stg';
  const host = isStg ? 'adm.stg.fwmrm.net' : 'mssl.fwmrm.net';
  const sdkVersion = getSDKVersion(bidrequest);
  return `https://${host}/libs/adm/${sdkVersion}/AdManager-prebid.js`
}

/**
 * Determines the SDK version to use based on the bid request parameters.
 * Returns the higher version between the provided version and default version.
 * @param {Object} bidRequest - The bid request object containing parameters
 * @returns {string} The SDK version to use, defaults to '7.10.0' if version parsing fails
 */
export function getSDKVersion(bidRequest) {
  const DEFAULT = '7.11.0';

  try {
    const paramVersion = getSdkVersionFromBidRequest(bidRequest);
    if (!paramVersion) {
      return DEFAULT;
    }
    // Compare versions and return the higher one
    return compareVersions(paramVersion, DEFAULT) > 0 ? paramVersion : DEFAULT;
  } catch (error) {
    logError('Version parsing failed, using default version:', error);
    return DEFAULT;
  }
};

/**
 * Retrieves the sdkVersion from bidRequest.params and removes the leading v if present.
 * @param {Object} bidRequest - The bid request object containing parameters
 * @returns {string} The sdkVersion from bidRequest.params
 */
function getSdkVersionFromBidRequest(bidRequest) {
  if (bidRequest.params.sdkVersion && bidRequest.params.sdkVersion.startsWith('v')) {
    return bidRequest.params.sdkVersion.substring(1);
  }
  return bidRequest.params.sdkVersion;
}

/**
 * Compares two version strings in semantic versioning format.
 * Handles versions with trailing build metadata.
 * @param {string} versionA - First version string to compare
 * @param {string} versionB - Second version string to compare
 * @returns {number} Returns 1 if versionA is greater, -1 if versionB is greater, 0 if equal
 */
function compareVersions(versionA, versionB) {
  if (!versionA || !versionB) {
    return 0;
  }

  const normalize = (v) => v.split('.').map(Number);

  const partsA = normalize(versionA);
  const partsB = normalize(versionB);

  // compare parts
  const maxLength = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLength; i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }

  return 0;
};

export function getBidFloor(bid, config) {
  logInfo('PREBID -: getBidFloor called with:', bid);
  let floor = deepAccess(bid, 'params.bidfloor', 0); // fallback bid params
  let currency = deepAccess(bid, 'params.bidfloorcur', 'USD'); // fallback bid params

  if (isFn(bid.getFloor)) {
    logInfo('PREBID - : getFloor() present and use it to retrieve floor and currency.');
    try {
      const floorInfo = bid.getFloor({
        currency: config.getConfig('floors.data.currency') || 'USD',
        mediaType: bid.mediaTypes.banner ? 'banner' : 'video',
        size: '*',
      }) || {};

      // Use getFloor's results if valid
      if (typeof floorInfo.floor === 'number') {
        floor = floorInfo.floor;
      }

      if (floorInfo.currency) {
        currency = floorInfo.currency;
      }
      logInfo('PREBID - : getFloor() returned floor:', floor, 'currency:', currency);
    } catch (e) {
      // fallback to static bid.params.bidfloor
      floor = deepAccess(bid, 'params.bidfloor', 0);
      currency = deepAccess(bid, 'params.bidfloorcur', 'USD');
      logInfo('PREBID - : getFloor() exception, fallback to static bid.params.bidfloor:', floor, 'currency:', currency);
    }
  }
  return { floor, currency };
}

function isValidUrl(str) {
  let url = null;
  try {
    url = new URL(str);
  } catch (_) {}
  return url != null;
}

function getBiggerSize(array) {
  let result = [0, 0];
  for (let i = 0; i < array.length; i++) {
    if (array[i][0] * array[i][1] > result[0] * result[1]) {
      result = array[i];
    }
  }
  return result;
}

function getBiggerSizeWithLimit(array, minSizeLimit, maxSizeLimit) {
  const minSize = minSizeLimit || [0, 0];
  const maxSize = maxSizeLimit || [Number.MAX_VALUE, Number.MAX_VALUE];
  const candidates = [];

  for (let i = 0; i < array.length; i++) {
    if (array[i][0] * array[i][1] >= minSize[0] * minSize[1] && array[i][0] * array[i][1] <= maxSize[0] * maxSize[1]) {
      candidates.push(array[i]);
    }
  }

  return getBiggerSize(candidates);
}

/*
* read the pricing extension with this format: <Extension type='StickyPricing'><Price currency='EUR'>1.0000</Price></Extension>
* @return {object} pricing data in format: {currency: 'EUR', price:'1.000'}
*/
function getPricing(xmlNode) {
  let pricingExtNode;
  let princingData = {};

  const extensions = xmlNode.querySelectorAll('Extension');
  extensions.forEach(node => {
    if (node.getAttribute('type') === 'StickyPricing') {
      pricingExtNode = node;
    }
  });

  if (pricingExtNode) {
    const priceNode = pricingExtNode.querySelector('Price');
    princingData = {
      currency: priceNode.getAttribute('currency'),
      price: priceNode.textContent
    };
  } else {
    logWarn('PREBID - ' + BIDDER_CODE + ': No bid received or missing pricing extension.');
  }

  return princingData;
}

/*
* Read the StickyBrand extension with following format:
* <Extension type='StickyBrand'>
*   <Domain><![CDATA[minotaur.com]]></Domain>
*   <Sector><![CDATA[BEAUTY & HYGIENE]]></Sector>
*   <Advertiser><![CDATA[James Bond Trademarks]]></Advertiser>
*   <Brand><![CDATA[007 Seven]]></Brand>
* </Extension>
* @return {object} pricing data in format: {currency: 'EUR', price:'1.000'}
*/
function getAdvertiserDomain(xmlNode) {
  const domain = [];
  let brandExtNode;
  const extensions = xmlNode.querySelectorAll('Extension');
  extensions.forEach(node => {
    if (node.getAttribute('type') === 'StickyBrand') {
      brandExtNode = node;
    }
  });

  // Currently we only return one Domain
  if (brandExtNode) {
    const domainNode = brandExtNode.querySelector('Domain');
    domain.push(domainNode.textContent);
  } else {
    logWarn('PREBID - ' + BIDDER_CODE + ': No bid received or missing StickyBrand extension.');
  }

  return domain;
}

function getCreativeId(xmlNode) {
  let creaId = '';
  const adNodes = xmlNode.querySelectorAll('Creative');
  adNodes.forEach(el => {
    creaId += '[' + el.getAttribute('id') + ']';
  });

  return creaId;
}

function getValueFromKeyInImpressionNode(xmlNode, key) {
  let value = '';
  const impNodes = xmlNode.querySelectorAll('Impression');
  let isRootViewKeyPresent = false;
  let isAdsDisplayStartedPresent = false;

  impNodes.forEach(el => {
    if (isRootViewKeyPresent && isAdsDisplayStartedPresent) {
      return value;
    }
    isRootViewKeyPresent = false;
    isAdsDisplayStartedPresent = false;
    const text = el.textContent;
    const queries = text.substring(el.textContent.indexOf('?') + 1).split('&');
    let tempValue = '';
    queries.forEach(item => {
      const split = item.split('=');
      if (split[0] === key) {
        tempValue = split[1];
      }
      if (split[0] === 'reqType' && split[1] === 'AdsDisplayStarted') {
        isAdsDisplayStartedPresent = true;
      }
      if (split[0] === 'rootViewKey') {
        isRootViewKeyPresent = true;
      }
    });
    if (isAdsDisplayStartedPresent) {
      value = tempValue;
    }
  });

  return value;
}

function getDealId(xmlNode) {
  return getValueFromKeyInImpressionNode(xmlNode, 'dealId');
}

function getBannerId(xmlNode) {
  return getValueFromKeyInImpressionNode(xmlNode, 'adId');
}

function getCampaignId(xmlNode) {
  return getValueFromKeyInImpressionNode(xmlNode, 'campaignId');
}

/**
 * returns the top most accessible window
 */
function getTopMostWindow() {
  let res = window;

  try {
    while (top !== res) {
      if (res.parent.location.href.length) {
        res = res.parent;
      }
    }
  } catch (e) {}

  return res;
}

registerBidder(spec);
