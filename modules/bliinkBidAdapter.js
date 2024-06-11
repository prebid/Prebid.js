// eslint-disable-next-line prebid/validate-imports
// eslint-disable-next-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { config } from '../src/config.js'
import { _each, deepAccess, deepSetValue, getWindowSelf, getWindowTop } from '../src/utils.js'
export const BIDDER_CODE = 'bliink'
export const GVL_ID = 658
export const BLIINK_ENDPOINT_ENGINE = 'https://engine.bliink.io/prebid'

export const BLIINK_ENDPOINT_COOKIE_SYNC_IFRAME = 'https://tag.bliink.io/usersync.html'
export const META_KEYWORDS = 'keywords'
export const META_DESCRIPTION = 'description'

const VIDEO = 'video'
const BANNER = 'banner'
window.bliinkBid = window.bliinkBid || {};
const supportedMediaTypes = [BANNER, VIDEO]
const aliasBidderCode = ['bk']
const CURRENCY = 'EUR';

/**
 * @description get coppa value from config
 */
function getCoppa() {
  return config.getConfig('coppa') === true ? 1 : 0;
}

/**
 * Retrieves the effective connection type from the browser's Navigator API.
 * @returns {string} The effective connection type or 'unsupported' if unavailable.
 */
export function getEffectiveConnectionType() {
  /**
   * The effective connection type obtained from the browser's Navigator API.
   * @type {string|undefined}
   */
  const navigatorEffectiveType = navigator?.connection?.effectiveType;

  if (navigatorEffectiveType) {
    return navigatorEffectiveType;
  }

  return 'unsupported';
}

/**
 * Retrieves the user IDs as EIDs from the first valid bid request.
 *
 * @param {Array} validBidRequests - Array of valid bid requests
 * @returns {Array|undefined} - Array of user IDs as EIDs, or undefined if not found
 */
export function getUserIds(validBidRequests) {
  /** @type {Object} */
  if (validBidRequests?.[0]?.userIdAsEids) {
    return validBidRequests[0].userIdAsEids;
  }
}
export function getMetaList(name) {
  if (!name || name.length === 0) return []

  return [
    {
      key: 'name',
      value: name,
    },
    {
      key: 'name*',
      value: name,
    },
    {
      key: 'itemprop*',
      value: name,
    },
    {
      key: 'property',
      value: `'og:${name}'`,
    },
    {
      key: 'property',
      value: `'twitter:${name}'`,
    },
    {
      key: 'property',
      value: `'article:${name}'`,
    },
  ]
}

export function getOneMetaValue(query) {
  const metaEl = document.querySelector(query)

  if (metaEl && metaEl.content) {
    return metaEl.content
  }

  return null;
}

export function getMetaValue(name) {
  const metaList = getMetaList(name)
  for (let i = 0; i < metaList.length; i++) {
    const meta = metaList[i];
    const metaValue = getOneMetaValue(`meta[${meta.key}=${meta.value}]`);
    if (metaValue) {
      return metaValue
    }
  }
  return ''
}

export function getKeywords() {
  const metaKeywords = getMetaValue(META_KEYWORDS)
  if (metaKeywords) {
    const keywords = [
      ...metaKeywords.split(','),
    ]

    if (keywords && keywords.length > 0) {
      return keywords.filter((value) => value).map((value) => value.trim());
    }
  }

  return [];
}

function canAccessTopWindow() {
  try {
    if (getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

/**
 * domLoading feature is computed on window.top if reachable.
 */
export function getDomLoadingDuration() {
  let domLoadingDuration = -1;
  let performance;

  performance = (canAccessTopWindow()) ? getWindowTop().performance : getWindowSelf().performance;

  if (performance && performance.timing && performance.timing.navigationStart > 0) {
    const val = performance.timing.domLoading - performance.timing.navigationStart;
    if (val > 0) {
      domLoadingDuration = val;
    }
  }

  return domLoadingDuration;
}

/**
 * @param bidResponse
 * @return {({cpm, netRevenue: boolean, requestId, width: number, currency, ttl: number, creativeId, height: number}&{mediaType: string, vastXml})|null}
 */
export const buildBid = (bidResponse) => {
  const mediaType = deepAccess(bidResponse, 'creative.media_type');
  if (!mediaType) return null;

  let bid;
  switch (mediaType) {
    case VIDEO:
      const vastXml = deepAccess(bidResponse, 'creative.video.content');
      bid = {
        vastXml,
        mediaType: 'video',
        vastUrl: 'data:text/xml;charset=utf-8;base64,' + btoa(vastXml.replace(/\\"/g, '"'))
      };
      break;
    case BANNER:
      bid = {
        ad: deepAccess(bidResponse, 'creative.banner.adm'),
        mediaType: 'banner',
      };
      break;
    default:
      return null;
  }
  return Object.assign(bid, {
    cpm: bidResponse.price,
    currency: bidResponse.currency || CURRENCY,
    creativeId: deepAccess(bidResponse, 'extras.deal_id'),
    requestId: deepAccess(bidResponse, 'extras.transaction_id'),
    width: deepAccess(bidResponse, `creative.${bid.mediaType}.width`) || 1,
    height: deepAccess(bidResponse, `creative.${bid.mediaType}.height`) || 1,
    ttl: 300,
    netRevenue: true,
  });
};

/**
 * @description Verify the the AdUnits.bids, respond with true (valid) or false (invalid).
 *
 * @param bid
 * @return boolean
 */
export const isBidRequestValid = (bid) => {
  return !!deepAccess(bid, 'params.tagId');
};

/**
 * @description Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
 *
 * @param validBidRequests
 * @param bidderRequest
 * @returns {null|{method: string, data: {gdprConsent: string, keywords: string, pageTitle: string, pageDescription: (*|string), pageUrl, gdpr: boolean, tags: *}, url: string}}
 */
export const buildRequests = (validBidRequests, bidderRequest) => {
  if (!validBidRequests || !bidderRequest || !bidderRequest.bids) return null
  const domLoadingDuration = getDomLoadingDuration().toString();
  const tags = bidderRequest.bids.map((bid) => {
    let bidFloor;
    const sizes = bid.sizes.map((size) => ({ w: size[0], h: size[1] }));
    const mediaTypes = Object.keys(bid.mediaTypes)
    if (typeof bid.getFloor === 'function') {
      bidFloor = bid.getFloor({
        currency: CURRENCY,
        mediaType: mediaTypes[0],
        size: sizes[0]
      });
    }
    const id = bid.params.tagId
    const request = {
      sizes: bid.sizes.map((size) => ({ w: size[0], h: size[1] })),
      id,
      // TODO: bidId is globally unique, is it a good choice for transaction ID (vs ortb2Imp.ext.tid)?
      transactionId: bid.bidId,
      mediaTypes: mediaTypes,
      imageUrl: deepAccess(bid, 'params.imageUrl', ''),
      videoUrl: deepAccess(bid, 'params.videoUrl', ''),
      refresh: (window.bliinkBid[id] = (window.bliinkBid[id] ?? -1) + 1) || undefined,
    }
    if (bidFloor) {
      request.bidFloor = bidFloor
    }
    return request;
  });

  let request = {
    tags,
    pageTitle: document.title,
    pageUrl: deepAccess(bidderRequest, 'refererInfo.page').replace(/\?.*$/, ''),
    pageDescription: getMetaValue(META_DESCRIPTION),
    keywords: getKeywords().join(','),
    ect: getEffectiveConnectionType(),
  };

  const schain = deepAccess(validBidRequests[0], 'schain')
  const eids = getUserIds(validBidRequests)
  const device = bidderRequest.ortb2?.device
  if (schain) {
    request.schain = schain
  }
  if (domLoadingDuration > -1) {
    request.domLoadingDuration = domLoadingDuration
  }
  if (device) {
    request.device = device
  }
  if (eids) {
    request.eids = eids
  }
  const gdprConsent = deepAccess(bidderRequest, 'gdprConsent');
  if (!!gdprConsent && gdprConsent.gdprApplies) {
    request.gdpr = true
    deepSetValue(request, 'gdprConsent', gdprConsent.consentString);
  }
  if (config.getConfig('coppa')) {
    request.coppa = 1
  }
  if (bidderRequest.uspConsent) {
    deepSetValue(request, 'uspConsent', bidderRequest.uspConsent);
  }
  return {
    method: 'POST',
    url: BLIINK_ENDPOINT_ENGINE,
    data: request,
  };
};

/**
 * @description Parse the response (from buildRequests) and generate one or more bid objects.
 *
 * @param serverResponse
 * @return
 */
const interpretResponse = (serverResponse) => {
  const bodyResponse = deepAccess(serverResponse, 'body.bids')
  if (!serverResponse.body || !bodyResponse) return []
  const bidResponses = [];
  _each(bodyResponse, function (response) {
    return bidResponses.push(buildBid(response));
  });
  return bidResponses.filter(bid => !!bid)
};

/**
 * @description  If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs. For more information, see Registering User Syncs below
 * @param syncOptions
 * @param serverResponses
 * @param gdprConsent
 * @return {[{type: string, url: string}]|*[]}
 */
const getUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent) => {
  let syncs = [];
  if (syncOptions.pixelEnabled && serverResponses.length > 0) {
    let gdprParams = ''
    let uspConsentStr = ''
    let apiVersion
    let gdpr = false
    if (gdprConsent) {
      gdprParams = `&gdprConsent=${gdprConsent.consentString}`;
      apiVersion = `&apiVersion=${gdprConsent.apiVersion}`
      gdpr = Number(
        gdprConsent.gdprApplies)
    }
    if (uspConsent) {
      uspConsentStr = `&uspConsent=${uspConsent}`;
    }
    let sync;
    if (syncOptions.iframeEnabled) {
      sync = [
        {
          type: 'iframe',
          url: `${BLIINK_ENDPOINT_COOKIE_SYNC_IFRAME}?gdpr=${gdpr}&coppa=${getCoppa()}${uspConsentStr}${gdprParams}${apiVersion}`,
        },
      ];
    } else {
      sync = deepAccess(serverResponses[0], 'body.userSyncs');
    }

    return sync;
  }

  return syncs;
};

/**
 * @type {{interpretResponse: interpretResponse, code: string, aliases: string[], getUserSyncs: getUserSyncs, buildRequests: buildRequests, onTimeout: onTimeout, onSetTargeting: onSetTargeting, isBidRequestValid: isBidRequestValid, onBidWon: onBidWon}}
 */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  aliases: aliasBidderCode,
  supportedMediaTypes: supportedMediaTypes,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
