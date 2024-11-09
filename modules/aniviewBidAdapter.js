import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { Renderer } from '../src/Renderer.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {
  deepAccess,
  deepSetValue,
  mergeDeep,
  isFn,
  isStr,
  isEmptyStr,
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
    const isBanner = mediaType === BANNER;
    const { width, height } = getSize(context, bidRequest);
    const floor = getFloor(bidRequest, { width, height }, mediaType);

    imp.tagid = deepAccess(bidRequest, 'params.AV_CHANNELID');

    if (floor) {
      imp.bidfloor = floor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }

    if (isBanner) {
      // TODO: remove once serving will be fixed
      deepSetValue(imp, 'banner', { w: width, h: height });
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    mergeDeep(request, {
      ext: {
        [BIDDER_CODE]: {
          pbjs: 1,
          pbv: '$prebid.version$',
        }
      }
    })

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest, mediaType } = context;
    const { width, height } = getSize(context, bidRequest);
    const isVideoBid = mediaType === VIDEO;
    const isBannerBid = mediaType === BANNER;

    if (isVideoBid) {
      context.vastXml = bid.adm;
    }

    const bidResponse = buildBidResponse(bid, context);

    if (isEmptyStr(bidRequest?.bidId) || !bid.adm || bidResponse.cpm <= 0) {
      return bidResponse;
    }

    mergeDeep(bidResponse, {
      width,
      height,
      creativeId: bid.crid || 'creativeId',
      meta: { advertiserDomains: [] },
      adId: getUniqueIdentifierStr(),
    });

    if (isVideoBid) {
      if (bidRequest.mediaTypes.video.context === 'outstream') {
        bidResponse.renderer = createRenderer(bidRequest);
      }
    } else if (isBannerBid) {
      if (bid.adm?.trim().startsWith('<VAST')) {
        bidResponse.renderer = createRenderer(bidRequest);
      } else {
        bidResponse.ad = bid.adm;
      }
    }

    return bidResponse;
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
          options: { withCredentials: false },
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
    const { bids, data } = bidderRequest;
    const { body } = serverResponse;
    const bidResponse = body?.seatbid?.[0]?.bid?.[0];

    if (!bids || !data || !bidResponse) {
      return [];
    }

    const response = converter.fromORTB({ response: body, request: data });

    return response.bids.map(bid => {
      const replacements = {
        auctionPrice: bid.cpm,
        auctionId: bid.requestId,
        auctionBidId: bidResponse.impid,
        auctionImpId: bidResponse.impid,
        auctionSeatId: bid.seatBidId,
        auctionAdId: bid.adId,
      };

      const bidAdmWithReplacedMacros = replaceMacros(bidResponse.adm, replacements);

      if (bid.mediaType === VIDEO) {
        bid.vastXml = bidAdmWithReplacedMacros;

        if (bidResponse?.nurl) {
          bid.vastUrl = replaceMacros(bidResponse.nurl, replacements);
        }
      } else {
        bid.ad = bidAdmWithReplacedMacros;
      }

      return bid;
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

function getSize(context, bid) {
  const isVideoBid = context.mediaType === VIDEO;
  let size = [640, 480];

  if (isVideoBid && bid.mediaTypes?.video?.playerSize?.length) {
    size = bid.mediaTypes.video.playerSize[0];
  } else if (bid.sizes?.length) {
    size = bid.sizes[0];
  }

  return {
    width: size[0],
    height: size[1],
  };
}

// https://docs.prebid.org/dev-docs/modules/floors.html#example-getfloor-scenarios
function getFloor(bid, size, mediaType) {
  if (!isFn(bid?.getFloor)) {
    return null;
  }

  try {
    const bidFloor = bid.getFloor({
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
