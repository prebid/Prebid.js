import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { mergeDeep } from '../src/utils.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { Renderer } from '../src/Renderer.js';
import { ajax } from '../src/ajax.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';

const BIDDER_CODE = 'silverpush';
const bidderConfig = 'sp_pb_ortb';
const bidderVersion = '1.0.0';
const DEFAULT_CURRENCY = 'USD';

export const REQUEST_URL = 'https://prebid.chocolateplatform.co/bidder/?identifier=prebidchoc';
export const SP_OUTSTREAM_PLAYER_URL = 'https://xaido.sgp1.cdn.digitaloceanspaces.com/prebid/spoutstream.min.js';

const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];

export const VIDEO_ORTB_REQUIRED = ['api', 'mimes', 'placement', 'protocols', 'minduration', 'maxduration', 'startdelay'];

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
  getRequest: function(endpoint) {
    ajax(endpoint, null, undefined, {method: 'GET'});
  },
  getOS: function(ua) {
    if (ua.indexOf('Windows') !== -1) { return 'Windows'; } else if (ua.match(/(iPhone|iPod|iPad)/)) { return 'iOS'; } else if (ua.indexOf('Mac OS X') !== -1) { return 'macOS'; } else if (ua.match(/Android/)) { return 'Android'; } else if (ua.indexOf('Linux') !== -1) { return 'Linux'; } else { return 'Unknown'; }
  }
};

registerBidder(spec);

export const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300
  },
  imp(buildImp, bidRequest, context) {
    let imp = buildImp(bidRequest, context);

    if (bidRequest.mediaTypes[VIDEO]) {
      imp = buildVideoImp(bidRequest, imp);
    } else if (bidRequest.mediaTypes[BANNER]) {
      imp = buildBannerImp(bidRequest, imp);
    }

    const bidFloor = getBidFloor(bidRequest, bidRequest.bidderRequest);

    utils.deepSetValue(imp, 'bidfloor', bidFloor);

    if (bidRequest.params.deals && bidRequest.params.deals.length > 0) {
      utils.deepSetValue(imp, 'pmp', { deals: bidRequest.params.deals });
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    mergeDeep(req, {
      at: 1,
      ext: {
        bc: `${bidderConfig}_${bidderVersion}`
      }
    })

    const userAgent = navigator.userAgent;
    utils.deepSetValue(req, 'device.os', spec.getOS(userAgent));
    utils.deepSetValue(req, 'device.devicetype', _isMobile() ? 1 : _isConnectedTV() ? 3 : 2);

    const bid = context.bidRequests[0];
    if (bid.params.publisherId) {
      utils.deepSetValue(req, 'site.publisher.id', bid.params.publisherId);
    }

    return req;
  },

  bidResponse(buildBidResponse, bid, context) {
    let bidResponse = buildBidResponse(bid, context);

    if (bid.ext) {
      bidResponse.meta.networkId = bid.ext.dsp_id;
      bidResponse.meta.advertiserId = bid.ext.buyer_id;
      bidResponse.meta.brandId = bid.ext.brand_id;
    }

    if (context.ortbResponse.ext && context.ortbResponse.ext.paf) {
      bidResponse.meta.paf = Object.assign({}, context.ortbResponse.ext.paf);
      bidResponse.meta.paf.content_id = utils.deepAccess(bid, 'ext.paf.content_id');
    }

    bidResponse = buildVideoVastResponse(bidResponse);
    bidResponse = buildVideoOutstreamResponse(bidResponse, context)

    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context);

    let fledgeAuctionConfigs = utils.deepAccess(ortbResponse, 'ext.fledge_auction_configs');
    if (fledgeAuctionConfigs) {
      fledgeAuctionConfigs = Object.entries(fledgeAuctionConfigs).map(([bidId, cfg]) => {
        return Object.assign({
          bidId,
          auctionSignals: {}
        }, cfg);
      });
      return {
        bids: response.bids,
        paapi: fledgeAuctionConfigs,
      }
    } else {
      return response.bids
    }
  }
});

function isBidRequestValid(bidRequest) {
  return (isPublisherIdValid(bidRequest) && (isValidBannerRequest(bidRequest) || isValidVideoRequest(bidRequest)));
}

function isPublisherIdValid(bidRequest) {
  const pubId = utils.deepAccess(bidRequest, 'params.publisherId');
  return (pubId !== undefined && utils.isStr(pubId) && pubId !== '');
}

function isValidBannerRequest(bidRequest) {
  const bannerSizes = utils.deepAccess(bidRequest, `mediaTypes.${BANNER}.sizes`);

  return utils.isArray(bannerSizes) && bannerSizes.length > 0 && bannerSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
}

function isValidVideoRequest(bidRequest) {
  const videoSizes = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}.playerSize`);
  const PARAM_EXISTS = VIDEO_ORTB_REQUIRED.every(param => utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}.${param}`) != null);

  return PARAM_EXISTS && utils.isArray(videoSizes) && videoSizes.length > 0 && videoSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
}

function buildRequests(validBids, bidderRequest) {
  const videoBids = validBids.filter(bid => isVideoBid(bid));
  const bannerBids = validBids.filter(bid => isBannerBid(bid));
  const requests = [];

  bannerBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, BANNER));
  });

  videoBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });

  return requests;
}

function buildVideoImp(bidRequest, imp) {
  if (bidRequest.mediaTypes[VIDEO]?.context === 'outstream') {
    imp.video.placement = imp.video.placement || 4;
  }

  const videoMediaType = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}`);
  const videoSizes = (videoMediaType && videoMediaType.playerSize) || [];

  if (videoSizes && videoSizes.length > 0) {
    utils.deepSetValue(imp, 'video.w', videoSizes[0][0]);
    utils.deepSetValue(imp, 'video.h', videoSizes[0][1]);
  }

  const videoAdUnitParams = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}`, {});
  const videoBidderParams = utils.deepAccess(bidRequest, `params.${VIDEO}`, {});

  const videoParams = { ...videoAdUnitParams, ...videoBidderParams };

  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      utils.deepSetValue(imp, `video.${param}`, videoParams[param]);
    }
  });

  return { ...imp };
}

function buildBannerImp(bidRequest, imp) {
  const bannerSizes = utils.deepAccess(bidRequest, `mediaTypes.${BANNER}.sizes`, []);

  if (bannerSizes && bannerSizes.length > 0) {
    utils.deepSetValue(imp, 'banner.w', bannerSizes[0][0]);
    utils.deepSetValue(imp, 'banner.h', bannerSizes[0][1]);
  }

  return {...imp};
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  return {
    method: 'POST',
    url: REQUEST_URL,
    data: CONVERTER.toORTB({ bidRequests, bidderRequest, context: { mediaType } }),
    bidderRequest
  }
}

function buildVideoVastResponse(bidResponse) {
  if (bidResponse.mediaType === VIDEO && bidResponse.vastXml) {
    bidResponse.vastUrl = bidResponse.vastXml;
  }

  return { ...bidResponse }
}

function buildVideoOutstreamResponse(bidResponse, context) {
  if (context.bidRequest.mediaTypes[VIDEO]?.context === 'outstream') {
    bidResponse.rendererUrl = SP_OUTSTREAM_PLAYER_URL;
    bidResponse.adUnitCode = context.bidRequest.adUnitCode;

    bidResponse.renderer = Renderer.install({
      id: bidResponse.requestId,
      adUnitCode: context.bidRequest.adUnitCode,
      url: bidResponse.rendererUrl
    });

    bidResponse.renderer.setRender(_renderer(bidResponse));

    bidResponse.renderer.render(bidResponse);
  }

  return {...bidResponse};
}

function getBidFloor(bid, bidderRequest) {
  const currency = getCurrencyFromBidderRequest(bidderRequest) || DEFAULT_CURRENCY;

  if (typeof bid.getFloor !== 'function') {
    return utils.deepAccess(bid, 'params.bidFloor', 0.05);
  }

  const bidFloor = bid.getFloor({
    currency: currency,
    mediaType: '*',
    size: '*',
  });
  return bidFloor?.floor;
}

function _renderer(bid) {
  bid.renderer.push(() => {
    if (typeof window.SPOutStreamPlayer === 'function') {
      const spoplayer = new window.SPOutStreamPlayer(bid);

      spoplayer.on('ready', () => {
        spoplayer.startAd();
      });

      try {
        const vastUrlbt = 'data:text/xml;charset=utf-8;base64,' + btoa(bid.vastUrl.replace(/\\"/g, '"'));
        spoplayer.load(vastUrlbt).then(function() {
          window.spoplayer = spoplayer;
        }).catch(function(reason) {
          setTimeout(function() { throw reason; }, 0);
        });
      } catch (err) {
        utils.logMessage(err);
      }
    } else {
      utils.logMessage(`Silverpush outstream player is not defined`);
    }
  });
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function interpretResponse(resp, req) {
  if (!resp.body) {
    resp.body = { nbr: 0 };
  }

  return CONVERTER.fromORTB({ request: req.data, response: resp.body });
}

function onBidWon(bid) {
  if (bid == null) { return; }
  if (bid['burl'] == null) { return; }

  let burlMac = bid['burl'];
  burlMac = burlMac.replace('$' + '{AUCTION_PRICE}', bid['cpm']);
  burlMac = burlMac.replace('$' + '{AUCTION_ID}', bid['auctionId']);
  burlMac = burlMac.replace('$' + '{AUCTION_IMP_ID}', bid['requestId']);
  burlMac = burlMac.replace('$' + '{AUCTION_AD_ID}', bid['adId']);
  burlMac = burlMac.replace('$' + '{AUCTION_SEAT_ID}', bid['seatBidId']);

  spec.getRequest(burlMac);
}

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}
