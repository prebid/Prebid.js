import {
  deepAccess,
  logWarn,
  parseQueryStringParameters,
  triggerPixel,
  generateUUID,
  isArray,
  isNumber,
  parseSizesInput,
  getBidIdParameter,
  isGptPubadsDefined
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getStorageManager } from '../src/storageManager.js';
import sha1 from 'crypto-js/sha1';
import { isSlotMatchingAdUnitCode } from '../libraries/gptUtils/gptUtils.js';

const BIDDER_CODE = 'relaido';
const BIDDER_DOMAIN = 'api.relaido.jp';
const ADAPTER_VERSION = '1.2.2';
const DEFAULT_TTL = 300;
const UUID_KEY = 'relaido_uuid';

const storage = getStorageManager({bidderCode: BIDDER_CODE});

function isBidRequestValid(bid) {
  if (!deepAccess(bid, 'params.placementId')) {
    logWarn('placementId param is required.');
    return false;
  }
  if (hasVideoMediaType(bid) && isVideoValid(bid)) {
    return true;
  } else {
    logWarn('Invalid mediaType video.');
  }
  if (hasBannerMediaType(bid) && isBannerValid(bid)) {
    return true;
  } else {
    logWarn('Invalid mediaType banner.');
  }
  return false;
}

function buildRequests(validBidRequests, bidderRequest) {
  const bids = [];
  let bidDomain = null;
  let bidder = null;
  let count = null;
  let isOgUrlOption = false;

  for (let i = 0; i < validBidRequests.length; i++) {
    const bidRequest = validBidRequests[i];
    let mediaType = '';
    let width = 0;
    let height = 0;

    if (hasVideoMediaType(bidRequest) && isVideoValid(bidRequest)) {
      let playerSize = getValidSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize'));
      if (playerSize.length === 0) {
        playerSize = getValidSizes(deepAccess(bidRequest, 'params.video.playerSize'));
      }
      width = playerSize[0][0];
      height = playerSize[0][1];
      mediaType = VIDEO;
    } else if (hasBannerMediaType(bidRequest) && isBannerValid(bidRequest)) {
      const sizes = getValidSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes'));
      width = sizes[0][0];
      height = sizes[0][1];
      mediaType = BANNER;
    }

    if (!bidDomain) {
      bidDomain = bidRequest.params.domain;
    }

    if (!bidder) {
      bidder = bidRequest.bidder;
    }

    if (!bidder) {
      bidder = bidRequest.bidder;
    }

    if (!count) {
      count = bidRequest.bidRequestsCount;
    }

    if (getBidIdParameter('ogUrl', bidRequest.params)) {
      isOgUrlOption = true;
    }

    bids.push({
      bid_id: bidRequest.bidId,
      placement_id: getBidIdParameter('placementId', bidRequest.params),
      transaction_id: bidRequest.ortb2Imp?.ext?.tid,
      bidder_request_id: bidRequest.bidderRequestId,
      ad_unit_code: bidRequest.adUnitCode,
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      auction_id: bidRequest.auctionId,
      player: bidRequest.params.player,
      width: width,
      height: height,
      banner_sizes: getBannerSizes(bidRequest),
      media_type: mediaType,
      userIdAsEids: bidRequest.userIdAsEids || [],
      pagekvt: getTargeting(bidRequest),
    });
  }

  const canonicalUrl = getCanonicalUrl(bidderRequest.refererInfo?.canonicalUrl, isOgUrlOption);

  const data = JSON.stringify({
    version: ADAPTER_VERSION,
    bids: bids,
    timeout_ms: bidderRequest.timeout,
    bidder: bidder,
    bid_requests_count: count,
    uuid: getUuid(),
    pv: '$prebid.version$',
    imuid: null,
    canonical_url: canonicalUrl,
    canonical_url_hash: getCanonicalUrlHash(canonicalUrl),
    ref: bidderRequest.refererInfo.page
  });

  return {
    method: 'POST',
    url: `https://${bidDomain || BIDDER_DOMAIN}/bid/v1/sprebid`,
    options: {
      withCredentials: true
    },
    data: data
  };
}

function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];
  const body = serverResponse.body;
  if (!body || body.status !== 'ok') {
    return [];
  }

  for (const res of body.ads) {
    const playerUrl = res.playerUrl || bidRequest.player || body.playerUrl;
    const bidResponse = {
      requestId: res.bidId,
      placementId: res.placementId,
      width: res.width,
      height: res.height,
      cpm: res.price,
      currency: res.currency,
      creativeId: res.creativeId,
      playerUrl: playerUrl,
      dealId: body.dealId || '',
      ttl: body.ttl || DEFAULT_TTL,
      netRevenue: true,
      meta: {
        advertiserDomains: res.adomain || [],
        mediaType: VIDEO
      }
    };

    if (res.vast && res.mediaType === VIDEO) {
      bidResponse.mediaType = VIDEO;
      bidResponse.vastXml = res.vast;
      bidResponse.renderer = newRenderer(res.bidId, playerUrl);
    } else if (res.vast && res.mediaType === BANNER) {
      bidResponse.mediaType = BANNER;
      const playerTag = createPlayerTag(playerUrl);
      const renderTag = createRenderTag(res.width, res.height, res.vast);
      bidResponse.ad = `<div id="rop-prebid">${playerTag}${renderTag}</div>`;
    } else if (res.adTag) {
      bidResponse.mediaType = BANNER;
      bidResponse.ad = decodeURIComponent(res.adTag);
    }
    bidResponses.push(bidResponse);
  }
  return bidResponses;
}

function getUserSyncs(syncOptions, serverResponses) {
  if (!syncOptions.iframeEnabled) {
    return [];
  }
  let syncUrl = `https://${BIDDER_DOMAIN}/tr/v1/prebid/sync.html`;
  if (serverResponses.length > 0) {
    syncUrl = deepAccess(serverResponses, '0.body.syncUrl') || syncUrl;
  }
  return [{
    type: 'iframe',
    url: `${syncUrl}?uu=${getUuid()}`
  }];
}

function onBidWon(bid) {
  const query = parseQueryStringParameters({
    placement_id: deepAccess(bid, 'params.0.placementId'),
    creative_id: deepAccess(bid, 'creativeId'),
    price: deepAccess(bid, 'cpm'),
    auction_id: deepAccess(bid, 'auctionId'),
    bid_id: deepAccess(bid, 'requestId'),
    ad_id: deepAccess(bid, 'adId'),
    ad_unit_code: deepAccess(bid, 'adUnitCode'),
    ref: window.location.href,
  }).replace(/&$/, '');
  const bidDomain = deepAccess(bid, 'params.0.domain') || BIDDER_DOMAIN;
  const burl = `https://${bidDomain}/tr/v1/prebid/win.gif?${query}`;
  triggerPixel(burl);
}

function onTimeout(data) {
  const query = parseQueryStringParameters({
    placement_id: deepAccess(data, '0.params.0.placementId'),
    timeout: deepAccess(data, '0.timeout'),
    auction_id: deepAccess(data, '0.auctionId'),
    bid_id: deepAccess(data, '0.bidId'),
    ad_unit_code: deepAccess(data, '0.adUnitCode'),
    version: ADAPTER_VERSION,
    ref: window.location.href,
  }).replace(/&$/, '');
  const bidDomain = deepAccess(data, '0.params.0.domain') || BIDDER_DOMAIN;
  const timeoutUrl = `https://${bidDomain}/tr/v1/prebid/timeout.gif?${query}`;
  triggerPixel(timeoutUrl);
}

function createPlayerTag(playerUrl) {
  return `<script src="${playerUrl}"></script>`;
}

function createRenderTag(width, height, vast) {
  return `<script>(function(){` +
    `window.RelaidoPlayer.renderAd({` +
    `width: ${width},` +
    `height: ${height},` +
    `vastXml: '${vast.replace(/\r?\n/g, '')}',` +
    `mediaType: 'banner'` +
    `});` +
    `})();</script>`;
};

function newRenderer(bidId, playerUrl) {
  const renderer = Renderer.install({
    id: bidId,
    url: playerUrl,
    loaded: false
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('renderer.setRender Error', err);
  }
  return renderer;
}

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.RelaidoPlayer.renderAd({
      adUnitCode: bid.adUnitCode,
      width: bid.width,
      height: bid.height,
      vastXml: bid.vastXml,
      mediaType: bid.mediaType,
      placementId: bid.placementId,
    });
  });
}

function isBannerValid(bid) {
  const sizes = getValidSizes(deepAccess(bid, 'mediaTypes.banner.sizes'));
  if (sizes.length > 0) {
    return true;
  }
  return false;
}

function isVideoValid(bid) {
  let playerSize = getValidSizes(deepAccess(bid, 'mediaTypes.video.playerSize'));
  if (playerSize.length === 0) {
    playerSize = getValidSizes(deepAccess(bid, 'params.video.playerSize'));
  }
  if (playerSize.length > 0) {
    const context = deepAccess(bid, 'mediaTypes.video.context');
    if (context && context === 'outstream') {
      return true;
    }
  }
  return false;
}

function getUuid() {
  const id = storage.getCookie(UUID_KEY)
  if (id) return id;
  const newId = generateUUID();
  storage.setCookie(UUID_KEY, newId);
  return newId;
}

function getOgUrl() {
  try {
    const ogURLElement = window.top.document.querySelector('meta[property="og:url"]');
    return ogURLElement ? ogURLElement.content : null;
  } catch (e) {
    const ogURLElement = document.querySelector('meta[property="og:url"]');
    return ogURLElement ? ogURLElement.content : null;
  }
}

function getCanonicalUrl(canonicalUrl, isOgUrlOption) {
  if (!canonicalUrl) {
    return (isOgUrlOption) ? getOgUrl() : null;
  }
  return canonicalUrl;
}

function getCanonicalUrlHash(canonicalUrl) {
  return (canonicalUrl) ? sha1(canonicalUrl).toString() : null;
}

function hasBannerMediaType(bid) {
  return !!deepAccess(bid, 'mediaTypes.banner');
}

function hasVideoMediaType(bid) {
  return !!deepAccess(bid, 'mediaTypes.video');
}

function getValidSizes(sizes) {
  const result = [];
  if (sizes && isArray(sizes) && sizes.length > 0) {
    for (let i = 0; i < sizes.length; i++) {
      if (isArray(sizes[i]) && sizes[i].length === 2) {
        const width = sizes[i][0];
        const height = sizes[i][1];
        if (width === 1 && height === 1) {
          return [[1, 1]];
        }
        if ((width >= 300 && height >= 250)) {
          result.push([width, height]);
        }
      } else if (isNumber(sizes[i])) {
        const width = sizes[0];
        const height = sizes[1];
        if (width === 1 && height === 1) {
          return [[1, 1]];
        }
        if ((width >= 300 && height >= 250)) {
          return [[width, height]];
        }
      }
    }
  }
  return result;
}

function getBannerSizes(bidRequest) {
  if (!hasBannerMediaType(bidRequest)) {
    return null;
  }
  const sizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
  if (!isArray(sizes)) {
    return null;
  }
  return parseSizesInput(sizes).join(',');
}

function getTargeting(bidRequest) {
  const targetings = {};
  const pubads = getPubads();
  if (pubads) {
    const keys = pubads.getTargetingKeys();
    for (const key of keys) {
      const values = pubads.getTargeting(key);
      targetings[key] = values;
    }
  }
  const adUnitSlot = getAdUnit(bidRequest.adUnitCode);
  if (adUnitSlot) {
    const keys = adUnitSlot.getTargetingKeys();
    for (const key of keys) {
      const values = adUnitSlot.getTargeting(key);
      targetings[key] = values;
    }
  }
  return targetings;
}

function getPubads() {
  return (isGptPubadsDefined()) ? window.googletag.pubads() : null;
}

function getAdUnit(adUnitCode) {
  if (isGptPubadsDefined()) {
    const adSlots = window.googletag.pubads().getSlots();
    const isMatchingAdSlot = isSlotMatchingAdUnitCode(adUnitCode);
    for (let i = 0; i < adSlots.length; i++) {
      if (isMatchingAdSlot(adSlots[i])) {
        return adSlots[i];
      }
    }
  }
  return null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs,
  onBidWon,
  onTimeout
}

registerBidder(spec);
