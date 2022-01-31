import { deepAccess, logWarn, getBidIdParameter, parseQueryStringParameters, triggerPixel, generateUUID, isArray } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'relaido';
const BIDDER_DOMAIN = 'api.relaido.jp';
const ADAPTER_VERSION = '1.0.6';
const DEFAULT_TTL = 300;
const UUID_KEY = 'relaido_uuid';

const storage = getStorageManager();

function isBidRequestValid(bid) {
  if (!deepAccess(bid, 'params.placementId')) {
    logWarn('placementId param is reqeuired.');
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
  let bidRequests = [];

  for (let i = 0; i < validBidRequests.length; i++) {
    const bidRequest = validBidRequests[i];
    const placementId = getBidIdParameter('placementId', bidRequest.params);
    const bidDomain = bidRequest.params.domain || BIDDER_DOMAIN;
    const bidUrl = `https://${bidDomain}/bid/v1/prebid/${placementId}`;
    const uuid = getUuid();
    let mediaType = '';
    let width = 0;
    let height = 0;

    if (hasVideoMediaType(bidRequest) && isVideoValid(bidRequest)) {
      const playerSize = getValidSizes(deepAccess(bidRequest, 'mediaTypes.video.playerSize'));
      width = playerSize[0][0];
      height = playerSize[0][1];
      mediaType = VIDEO;
    } else if (hasBannerMediaType(bidRequest) && isBannerValid(bidRequest)) {
      const sizes = getValidSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes'));
      width = sizes[0][0];
      height = sizes[0][1];
      mediaType = BANNER;
    }

    let payload = {
      version: ADAPTER_VERSION,
      timeout_ms: bidderRequest.timeout,
      ad_unit_code: bidRequest.adUnitCode,
      auction_id: bidRequest.auctionId,
      bidder: bidRequest.bidder,
      bidder_request_id: bidRequest.bidderRequestId,
      bid_requests_count: bidRequest.bidRequestsCount,
      bid_id: bidRequest.bidId,
      transaction_id: bidRequest.transactionId,
      media_type: mediaType,
      uuid: uuid,
      width: width,
      height: height,
      pv: '$prebid.version$'
    };

    const imuid = deepAccess(bidRequest, 'userId.imuid');
    if (imuid) {
      payload.imuid = imuid;
    }

    // It may not be encoded, so add it at the end of the payload
    payload.ref = bidderRequest.refererInfo.referer;

    bidRequests.push({
      method: 'GET',
      url: bidUrl,
      data: payload,
      options: {
        withCredentials: true
      },
      bidId: bidRequest.bidId,
      player: bidRequest.params.player,
      width: payload.width,
      height: payload.height,
      mediaType: payload.media_type
    });
  }
  return bidRequests;
}

function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];
  const body = serverResponse.body;
  if (!body || body.status != 'ok') {
    return [];
  }

  const playerUrl = bidRequest.player || body.playerUrl;
  const mediaType = bidRequest.mediaType || VIDEO;

  let bidResponse = {
    requestId: bidRequest.bidId,
    width: bidRequest.width,
    height: bidRequest.height,
    cpm: body.price,
    currency: body.currency,
    creativeId: body.creativeId,
    dealId: body.dealId || '',
    ttl: body.ttl || DEFAULT_TTL,
    netRevenue: true,
    mediaType: mediaType,
    meta: {
      advertiserDomains: body.adomain || [],
      mediaType: VIDEO
    }
  };
  if (mediaType === VIDEO) {
    bidResponse.vastXml = body.vast;
    bidResponse.renderer = newRenderer(bidRequest.bidId, playerUrl);
  } else {
    const playerTag = createPlayerTag(playerUrl);
    const renderTag = createRenderTag(bidRequest.width, bidRequest.height, body.vast);
    bidResponse.ad = `<div id="rop-prebid">${playerTag}${renderTag}</div>`;
  }
  bidResponses.push(bidResponse);

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
  let query = parseQueryStringParameters({
    placement_id: deepAccess(bid, 'params.0.placementId'),
    creative_id: deepAccess(bid, 'creativeId'),
    price: deepAccess(bid, 'cpm'),
    auction_id: deepAccess(bid, 'auctionId'),
    bid_id: deepAccess(bid, 'requestId'),
    ad_id: deepAccess(bid, 'adId'),
    ad_unit_code: deepAccess(bid, 'adUnitCode'),
    ref: window.location.href,
  }).replace(/\&$/, '');
  const bidDomain = deepAccess(bid, 'params.0.domain') || BIDDER_DOMAIN;
  const burl = `https://${bidDomain}/tr/v1/prebid/win.gif?${query}`;
  triggerPixel(burl);
}

function onTimeout(data) {
  let query = parseQueryStringParameters({
    placement_id: deepAccess(data, '0.params.0.placementId'),
    timeout: deepAccess(data, '0.timeout'),
    auction_id: deepAccess(data, '0.auctionId'),
    bid_id: deepAccess(data, '0.bidId'),
    ad_unit_code: deepAccess(data, '0.adUnitCode'),
    version: ADAPTER_VERSION,
    ref: window.location.href,
  }).replace(/\&$/, '');
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
    });
  });
}

function isBannerValid(bid) {
  if (!isMobile()) {
    return false;
  }
  const sizes = getValidSizes(deepAccess(bid, 'mediaTypes.banner.sizes'));
  if (sizes.length > 0) {
    return true;
  }
  return false;
}

function isVideoValid(bid) {
  const playerSize = getValidSizes(deepAccess(bid, 'mediaTypes.video.playerSize'));
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

export function isMobile() {
  const ua = navigator.userAgent;
  if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPod') > -1 || (ua.indexOf('Android') > -1 && ua.indexOf('Tablet') == -1)) {
    return true;
  }
  return false;
}

function hasBannerMediaType(bid) {
  return !!deepAccess(bid, 'mediaTypes.banner');
}

function hasVideoMediaType(bid) {
  return !!deepAccess(bid, 'mediaTypes.video');
}

function getValidSizes(sizes) {
  let result = [];
  if (sizes && isArray(sizes) && sizes.length > 0) {
    for (let i = 0; i < sizes.length; i++) {
      if (isArray(sizes[i]) && sizes[i].length == 2) {
        const width = sizes[i][0];
        const height = sizes[i][1];
        if (width == 1 && height == 1) {
          return [[1, 1]];
        }
        if ((width >= 300 && height >= 250)) {
          result.push([width, height]);
        }
      }
    }
  }
  return result;
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
