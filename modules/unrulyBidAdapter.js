import * as utils from '../src/utils.js'
import {Renderer} from '../src/Renderer.js'
import {registerBidder} from '../src/adapters/bidderFactory.js'
import {VIDEO, BANNER} from '../src/mediaTypes.js'

function configureUniversalTag(exchangeRenderer, requestId) {
  if (!exchangeRenderer.config) throw new Error('UnrulyBidAdapter: Missing renderer config.');
  if (!exchangeRenderer.config.siteId) throw new Error('UnrulyBidAdapter: Missing renderer siteId.');

  parent.window.unruly = parent.window.unruly || {};
  parent.window.unruly['native'] = parent.window.unruly['native'] || {};
  parent.window.unruly['native'].siteId = parent.window.unruly['native'].siteId || exchangeRenderer.config.siteId;
  parent.window.unruly['native'].adSlotId = requestId;
  parent.window.unruly['native'].supplyMode = 'prebid';
}

function configureRendererQueue() {
  parent.window.unruly['native'].prebid = parent.window.unruly['native'].prebid || {};
  parent.window.unruly['native'].prebid.uq = parent.window.unruly['native'].prebid.uq || [];
}

function notifyRenderer(bidResponseBid) {
  parent.window.unruly['native'].prebid.uq.push(['render', bidResponseBid]);
}

const addBidFloorInfo = (validBid) => {
  Object.keys(validBid.mediaTypes).forEach((key) => {
    let floorInfo = {};
    if (typeof validBid.getFloor === 'function') {
      floorInfo = validBid.getFloor({
        currency: 'USD',
        mediaType: key,
        size: '*'
      });
    } else {
      floorInfo = {
        currency: 'USD',
        floor: validBid.params.floor || 0
      }
    }

    validBid.mediaTypes[key].floor = floorInfo.floor;
  });
};

const getRequests = (conf, validBidRequests, bidderRequest) => {
  const {bids, bidderRequestId, auctionId, bidderCode, ...bidderRequestData} = bidderRequest;
  const invalidBidsCount = bidderRequest.bids.length - validBidRequests.length;
  let requestBySiteId = {};

  validBidRequests.forEach((validBid) => {
    const currSiteId = validBid.params.siteId;
    addBidFloorInfo(validBid);
    requestBySiteId[currSiteId] = requestBySiteId[currSiteId] || [];
    requestBySiteId[currSiteId].push(validBid)
  });

  let request = [];

  Object.keys(requestBySiteId).forEach((key) => {
    let data = {
      bidderRequest: Object.assign({}, {bids: requestBySiteId[key], invalidBidsCount, ...bidderRequestData})
    };

    request.push(Object.assign({}, {data, ...conf}));
  });

  return request
};

const handleBidResponseByMediaType = (bids) => {
  let bidResponses = [];

  bids.forEach((bid) => {
    let parsedBidResponse;
    let bidMediaType = utils.deepAccess(bid, 'meta.mediaType');
    if (bidMediaType && bidMediaType.toLowerCase() === 'banner') {
      parsedBidResponse = handleBannerBid(bid)
    } else if (bidMediaType && bidMediaType.toLowerCase() === 'video') {
      let context = utils.deepAccess(bid, 'meta.videoContext');
      bid.mediaType = VIDEO;
      if (context === 'instream') {
        parsedBidResponse = handleInStreamBid(bid)
      } else if (context === 'outstream') {
        parsedBidResponse = handleOutStreamBid(bid)
      }
    }

    if (parsedBidResponse) {
      bidResponses.push(parsedBidResponse);
    }
  });

  return bidResponses
};

const handleBannerBid = (bid) => {
  if (!bid.ad) {
    utils.logError(new Error('UnrulyBidAdapter: Missing ad config.'));
    return;
  }

  bid.mediaType = BANNER;
  return bid;
};

const handleInStreamBid = (bid) => {
  if (!bid.vastUrl) {
    utils.logError(new Error('UnrulyBidAdapter: Missing vastUrl config.'));
    return;
  }

  return bid;
};

const handleOutStreamBid = (bid) => {
  const hasConfig = !!utils.deepAccess(bid, 'ext.renderer.config');
  const hasSiteId = !!utils.deepAccess(bid, 'ext.renderer.config.siteId');

  if (!hasConfig) {
    utils.logError(new Error('UnrulyBidAdapter: Missing renderer config.'));
    return;
  }
  if (!hasSiteId) {
    utils.logError(new Error('UnrulyBidAdapter: Missing renderer siteId.'));
    return;
  }

  const exchangeRenderer = utils.deepAccess(bid, 'ext.renderer');

  configureUniversalTag(exchangeRenderer, bid.requestId);
  configureRendererQueue();

  const rendererInstance = Renderer.install(Object.assign({}, exchangeRenderer));

  const rendererConfig = Object.assign(
    {},
    bid,
    {
      renderer: rendererInstance,
      adUnitCode: utils.deepAccess(bid, 'ext.adUnitCode')
    }
  );

  rendererInstance.setRender(() => {
    notifyRenderer(rendererConfig)
  });

  bid.renderer = bid.renderer || rendererInstance;
  return bid;
};

const isMediaTypesValid = (bid) => {
  const mediaTypeVideoData = utils.deepAccess(bid, 'mediaTypes.video');
  const mediaTypeBannerData = utils.deepAccess(bid, 'mediaTypes.banner');
  let isValid = !!(mediaTypeVideoData || mediaTypeBannerData);
  if (isValid && mediaTypeVideoData) {
    isValid = isVideoMediaTypeValid(mediaTypeVideoData);
  }
  if (isValid && mediaTypeBannerData) {
    isValid = isBannerMediaTypeValid(mediaTypeBannerData)
  }
  return isValid;
};

const isVideoMediaTypeValid = (mediaTypeVideoData) => {
  if (!mediaTypeVideoData.context) {
    return false;
  }

  const supportedContexts = ['outstream', 'instream'];
  return supportedContexts.indexOf(mediaTypeVideoData.context) !== -1
};

const isBannerMediaTypeValid = (mediaTypeBannerData) => {
  return !hasDuplicates(mediaTypeBannerData.sizes);
};

const hasDuplicates = (mediaTypeSizes) => {
  let seenSizes = [];
  for (let i = 0; i < mediaTypeSizes.length; i++) {
    if (seenSizes[mediaTypeSizes[i].toString()]) {
      return true;
    } else {
      seenSizes[mediaTypeSizes[i].toString()] = true
    }
  }
  return false;
};

export const adapter = {
  code: 'unruly',
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function (bid) {
    let siteId = utils.deepAccess(bid, 'params.siteId');
    let isBidValid = siteId && isMediaTypesValid(bid);
    return !!isBidValid;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const url = 'https://targeting.unrulymedia.com/prebid';
    const method = 'POST';
    const options = {contentType: 'text/plain'};
    return getRequests({url, method, options}, validBidRequests, bidderRequest);
  },

  interpretResponse: function (serverResponse = {}) {
    const serverResponseBody = serverResponse.body;

    const noBidsResponse = [];
    const isInvalidResponse = !serverResponseBody || !serverResponseBody.bids;

    return isInvalidResponse
      ? noBidsResponse
      : handleBidResponseByMediaType(serverResponseBody.bids);
  }
};

registerBidder(adapter);
