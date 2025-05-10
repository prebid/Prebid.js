import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  deepAccess,
  mergeDeep,
  isFn,
  isStr,
  isPlainObject,
  getUniqueIdentifierStr
} from '../src/utils.js';

const BIDDER_CODE = 'aniview';
const GVLID = 780;
const TTL = 600;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_PLAYER_DOMAIN = 'player.aniview.com';
const SSP_ENDPOINT = 'https://rtb.aniview.com/sspRTB2';
const RENDERER_FILENAME = 'prebidRenderer.js';

const converter = ortbConverter({
  context: {
    netRevenue: true, // required
    ttl: TTL, // required
    currency: DEFAULT_CURRENCY,
  },

  imp(buildImp, bidRequest, context) {
    const { mediaType } = context;
    const imp = buildImp(bidRequest, context);
    const { width, height } = getSize(mediaType, bidRequest);
    const floor = getFloor(bidRequest, { width, height }, mediaType);

    imp.tagid = deepAccess(bidRequest, 'params.AV_CHANNELID');

    if (floor) {
      imp.bidfloor = floor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }

    if (isBannerType(mediaType)) {
      mergeDeep(imp.banner, { w: width, h: height });
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const replacements = context.bidRequests[0]?.params?.replacements;

    mergeDeep(request, {
      ext: {
        [BIDDER_CODE]: {
          pbjs: 1,
          pbv: '$prebid.version$',
        }
      }
    });

    if (isPlainObject(replacements)) {
      mergeDeep(request, { ext: { [BIDDER_CODE]: { replacements } } });
    }

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest, mediaType } = context;
    const { width, height } = getSize(mediaType, bidRequest);

    if (!bid.w || !bid.h) {
      bid.w = width;
      bid.h = height;
    }

    bid.crid ??= getUniqueIdentifierStr();
    bid.adid ??= getUniqueIdentifierStr();
    bid.bidid ??= getUniqueIdentifierStr();

    const prebidBid = buildBidResponse(bid, context);

    if (!bid.adm || prebidBid.cpm <= 0) {
      return prebidBid;
    }

    mergeDeep(prebidBid, { meta: { advertiserDomains: bid.adomain || [] } });

    if (bid.ext?.aniview) {
      prebidBid.meta.aniview = bid.ext.aniview

      if (prebidBid.meta.aniview.tag) {
        try {
          prebidBid.meta.aniview.tag = JSON.parse(bid.ext.aniview.tag)
        } catch {
          // Ignore the error
        }
      }
    }

    if (isVideoType(mediaType)) {
      if (bidRequest.mediaTypes.video.context === 'outstream') {
        prebidBid.renderer = createRenderer(bidRequest);
      }
    } else if (isBannerType(mediaType)) {
      if (bid.adm?.trim().startsWith('<VAST')) {
        prebidBid.renderer = createRenderer(bidRequest);
      } else {
        prebidBid.ad = bid.adm;
      }
    }

    return prebidBid;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['avantisvideo', 'selectmediavideo', 'vidcrunch', 'openwebvideo', 'didnavideo', 'ottadvisors', 'pgammedia'],
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid(bid) {
    return !!(bid.params?.AV_PUBLISHERID && bid.params?.AV_CHANNELID);
  },

  buildRequests(bidRequests, bidderRequest) {
    const requests = [];

    bidRequests.forEach((bidRequest) => {
      Object.keys(bidRequest.mediaTypes).forEach((mediaType) => {
        const endpoint = bidRequest.params.dev?.endpoint || SSP_ENDPOINT;

        requests.push({
          method: 'POST',
          url: endpoint,
          bids: [bidRequest],
          options: { withCredentials: true },
          data: converter.toORTB({
            bidderRequest,
            bidRequests: [bidRequest],
            context: { mediaType },
          }),
        });
      });
    });

    return requests;
  },

  interpretResponse(serverResponse, bidderRequest) {
    const { body } = serverResponse;
    const bids = body?.seatbid?.flatMap(seatbid => seatbid?.bid || []) || [];

    if (!bidderRequest.data || bids.length <= 0) {
      return [];
    }

    return converter.fromORTB({ response: body, request: bidderRequest.data }).bids.map((prebidBid, index) => {
      const bid = bids[index];
      const replacements = {
        auctionPrice: prebidBid.cpm,
        auctionId: prebidBid.requestId,
        auctionBidId: bid.bidid,
        auctionImpId: bid.impid,
        auctionSeatId: prebidBid.seatBidId,
        auctionAdId: bid.adid,
      };

      const bidAdmWithReplacedMacros = replaceMacros(bid.adm, replacements);

      if (isVideoType(prebidBid.mediaType)) {
        prebidBid.vastXml = bidAdmWithReplacedMacros;

        if (bid?.nurl) {
          prebidBid.vastUrl = replaceMacros(bid.nurl, replacements);
        }
      } else {
        prebidBid.ad = bidAdmWithReplacedMacros;
      }

      return prebidBid;
    });
  },

  getUserSyncs(syncOptions, serverResponses) {
    if (!serverResponses?.[0]?.body || serverResponses.error) {
      return [];
    }

    try {
      const syncs = serverResponses[0].body.ext?.[BIDDER_CODE]?.sync;

      if (syncs) {
        return getValidSyncs(syncs, syncOptions);
      }
    } catch (error) {}

    return [];
  },
};

function isVideoType(mediaType) {
  return mediaType === VIDEO;
}

function isBannerType(mediaType) {
  return mediaType === BANNER;
}

function getValidSyncs(syncs, options) {
  return syncs
    .filter(sync => isSyncValid(sync, options))
    .map(sync => processSync(sync)) || [];
}

function isSyncValid(sync, options) {
  return isPlainObject(sync) &&
    isStr(sync.url) &&
    (sync.e === 'inventory' || sync.e === 'sync') &&
    ((sync.t === 1 && options?.pixelEnabled) || (sync.t === 3 && options?.iframeEnabled));
}

function processSync(sync) {
  return { url: sync.url, type: sync.t === 1 ? 'image' : 'iframe' };
}

function getSize(mediaType, bidRequest) {
  const { mediaTypes, sizes } = bidRequest;
  const videoSizes = mediaTypes?.video?.playerSize;
  const bannerSizes = mediaTypes?.banner?.sizes;

  let size = [640, 480];

  if (isVideoType(mediaType) && videoSizes?.length > 0) {
    size = videoSizes[0];
  } else if (isBannerType(mediaType) && bannerSizes?.length > 0) {
    size = bannerSizes[0];
  } else if (sizes?.length > 0) {
    size = sizes[0];
  }

  return {
    width: size[0],
    height: size[1],
  };
}

// https://docs.prebid.org/dev-docs/modules/floors.html#example-getfloor-scenarios
function getFloor(bidRequest, size, mediaType) {
  if (!isFn(bidRequest?.getFloor)) {
    return null;
  }

  try {
    const bidFloor = bidRequest.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType, // or '*' for all media types
      size: [size.width, size.height], // or '*' for all sizes
    });

    if (isPlainObject(bidFloor) && !isNaN(bidFloor.floor) && bidFloor.currency === DEFAULT_CURRENCY) {
      return bidFloor.floor;
    }
  } catch {}

  return null;
}

function replaceMacros(str, replacements) {
  if (!replacements || !isStr(str)) {
    return str;
  }

  return str
    .replaceAll(`\${AUCTION_PRICE}`, replacements.auctionPrice || '')
    .replaceAll(`\${AUCTION_ID}`, replacements.auctionId || '')
    .replaceAll(`\${AUCTION_BID_ID}`, replacements.auctionBidId || '')
    .replaceAll(`\${AUCTION_IMP_ID}`, replacements.auctionImpId || '')
    .replaceAll(`\${AUCTION_SEAT_ID}`, replacements.auctionSeatId || '')
    .replaceAll(`\${AUCTION_AD_ID}`, replacements.auctionAdId || '');
}

function createRenderer(bidRequest) {
  const config = {};
  const { params = {} } = bidRequest;
  const playerDomain = params.playerDomain || DEFAULT_PLAYER_DOMAIN;

  if (params.AV_PUBLISHERID) {
    config.AV_PUBLISHERID = params.AV_PUBLISHERID;
  }

  if (params.AV_CHANNELID) {
    config.AV_CHANNELID = params.AV_CHANNELID;
  }

  const renderer = Renderer.install({
    url: `https://${playerDomain}/script/6.1/${RENDERER_FILENAME}`,
    config,
    loaded: false,
  });

  try {
    renderer.setRender(avRenderer);
  } catch (error) {}

  return renderer;
}

function avRenderer(bid) {
  bid.renderer.push(function() {
    const eventsCallback = bid?.renderer?.handleVideoEvent ?? null;
    const { ad, adId, adUnitCode, vastUrl, vastXml, width, height, params = [] } = bid;

    window.aniviewRenderer.renderAd({
      id: adUnitCode + '_' + adId,
      debug: window.location.href.indexOf('pbjsDebug') >= 0,
      placement: adUnitCode,
      config: params[0]?.rendererConfig,
      width,
      height,
      vastUrl,
      vastXml: vastXml || ad,
      eventsCallback,
      bid,
    });
  });
}

registerBidder(spec);
