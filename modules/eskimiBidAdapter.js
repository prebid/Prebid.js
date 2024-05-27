import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import {getBidIdParameter} from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'eskimi';
const ENDPOINT = 'https://sspback.eskimi.com/bid-request'

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const GVLID = 814;

const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'plcmt',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity',
  'battr'
];

const BANNER_ORTB_PARAMS = [
  'battr'
]

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    if (bid.burl) {
      utils.triggerPixel(bid.burl);
    }
  }
}

registerBidder(spec);

const CONVERTER = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  },
  imp(buildImp, bidRequest, context) {
    let imp = buildImp(bidRequest, context);
    imp.secure = Number(window.location.protocol === 'https:');
    if (!imp.bidfloor && bidRequest.params.bidFloor) {
      imp.bidfloor = bidRequest.params.bidFloor;
      imp.bidfloorcur = getBidIdParameter('bidFloorCur', bidRequest.params).toUpperCase() || 'USD'
    }

    if (bidRequest.mediaTypes[VIDEO]) {
      imp = buildVideoImp(bidRequest, imp);
    } else if (bidRequest.mediaTypes[BANNER]) {
      imp = buildBannerImp(bidRequest, imp);
    }

    return imp;
  }
});

function isBidRequestValid(bidRequest) {
  return (isPlacementIdValid(bidRequest) && (isValidBannerRequest(bidRequest) || isValidVideoRequest(bidRequest)));
}

function isPlacementIdValid(bidRequest) {
  return utils.isNumber(bidRequest.params.placementId);
}

function isValidBannerRequest(bidRequest) {
  const bannerSizes = utils.deepAccess(bidRequest, `mediaTypes.${BANNER}.sizes`);
  return utils.isArray(bannerSizes) && bannerSizes.length > 0 && bannerSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
}

function isValidVideoRequest(bidRequest) {
  const videoSizes = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}.playerSize`);

  return utils.isArray(videoSizes) && videoSizes.length > 0 && videoSizes.every(size => utils.isNumber(size[0]) && utils.isNumber(size[1]));
}

function buildRequests(validBids, bidderRequest) {
  let videoBids = validBids.filter(bid => isVideoBid(bid));
  let bannerBids = validBids.filter(bid => isBannerBid(bid));
  let requests = [];

  bannerBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, BANNER));
  });

  videoBids.forEach(bid => {
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });

  return requests;
}

function interpretResponse(response, request) {
  return CONVERTER.fromORTB({ request: request.data, response: response.body }).bids;
}

function buildVideoImp(bidRequest, imp) {
  const videoAdUnitParams = utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}`, {});
  const videoBidderParams = utils.deepAccess(bidRequest, `params.${VIDEO}`, {});

  const videoParams = { ...videoAdUnitParams, ...videoBidderParams };

  const videoSizes = (videoAdUnitParams && videoAdUnitParams.playerSize) || [];

  if (videoSizes && videoSizes.length > 0) {
    utils.deepSetValue(imp, 'video.w', videoSizes[0][0]);
    utils.deepSetValue(imp, 'video.h', videoSizes[0][1]);
  }

  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      utils.deepSetValue(imp, `video.${param}`, videoParams[param]);
    }
  });

  if (imp.video && videoParams?.context === 'outstream') {
    imp.video.plcmt = imp.video.plcmt || 4;
  }

  return { ...imp };
}

function buildBannerImp(bidRequest, imp) {
  const bannerAdUnitParams = utils.deepAccess(bidRequest, `mediaTypes.${BANNER}`, {});
  const bannerBidderParams = utils.deepAccess(bidRequest, `params.${BANNER}`, {});

  const bannerParams = { ...bannerAdUnitParams, ...bannerBidderParams };

  let sizes = bidRequest.mediaTypes.banner.sizes;

  if (sizes) {
    utils.deepSetValue(imp, 'banner.w', sizes[0][0]);
    utils.deepSetValue(imp, 'banner.h', sizes[0][1]);
  }

  BANNER_ORTB_PARAMS.forEach((param) => {
    if (bannerParams.hasOwnProperty(param)) {
      utils.deepSetValue(imp, `banner.${param}`, bannerParams[param]);
    }
  });

  return { ...imp };
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  const data = CONVERTER.toORTB({ bidRequests, bidderRequest, context: { mediaType } })

  const bid = bidRequests.find((b) => b.params.placementId)
  if (!data.site) data.site = {}
  data.site.ext = { placementId: bid.params.placementId }

  if (bidderRequest.gdprConsent) {
    if (!data.user) data.user = {};
    if (!data.user.ext) data.user.ext = {};
    if (!data.regs) data.regs = {};
    if (!data.regs.ext) data.regs.ext = {};
    data.user.ext.consent = bidderRequest.gdprConsent.consentString;
    data.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
  }

  if (bid.params.bcat) data.bcat = bid.params.bcat;
  if (bid.params.badv) data.badv = bid.params.badv;
  if (bid.params.bapp) data.bapp = bid.params.bapp;

  return {
    method: 'POST',
    url: ENDPOINT,
    data: data,
    options: { contentType: 'application/json;charset=UTF-8', withCredentials: false }
  }
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}
