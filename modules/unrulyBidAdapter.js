import * as utils from '../src/utils.js'
import {Renderer} from '../src/Renderer.js'
import {registerBidder} from '../src/adapters/bidderFactory.js'
import {VIDEO, BANNER} from '../src/mediaTypes.js'

function configureUniversalTag(exchangeRenderer) {
  if (!exchangeRenderer.config) throw new Error('UnrulyBidAdapter: Missing renderer config.');
  if (!exchangeRenderer.config.siteId) throw new Error('UnrulyBidAdapter: Missing renderer siteId.');

  parent.window.unruly = parent.window.unruly || {};
  parent.window.unruly['native'] = parent.window.unruly['native'] || {};
  parent.window.unruly['native'].siteId = parent.window.unruly['native'].siteId || exchangeRenderer.config.siteId;
  parent.window.unruly['native'].supplyMode = 'prebid';
}

function configureRendererQueue() {
  parent.window.unruly['native'].prebid = parent.window.unruly['native'].prebid || {};
  parent.window.unruly['native'].prebid.uq = parent.window.unruly['native'].prebid.uq || [];
}

function notifyRenderer(bidResponseBid) {
  parent.window.unruly['native'].prebid.uq.push(['render', bidResponseBid]);
}

const serverResponseToBid = (bid, rendererInstance) => ({
  requestId: bid.bidId,
  cpm: bid.cpm,
  width: bid.width,
  height: bid.height,
  vastUrl: bid.vastUrl,
  netRevenue: true,
  creativeId: bid.bidId,
  ttl: 360,
  meta: {advertiserDomains: bid && bid.adomain ? bid.adomain : []},
  currency: 'USD',
  renderer: rendererInstance,
  mediaType: VIDEO
});

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

const buildPrebidResponseAndInstallRenderer = bids =>
  bids
    .filter(serverBid => {
      const hasConfig = !!utils.deepAccess(serverBid, 'ext.renderer.config');
      const hasSiteId = !!utils.deepAccess(serverBid, 'ext.renderer.config.siteId');

      if (!hasConfig) utils.logError(new Error('UnrulyBidAdapter: Missing renderer config.'));
      if (!hasSiteId) utils.logError(new Error('UnrulyBidAdapter: Missing renderer siteId.'));

      return hasSiteId
    })
    .map(serverBid => {
      const exchangeRenderer = utils.deepAccess(serverBid, 'ext.renderer');

      configureUniversalTag(exchangeRenderer);
      configureRendererQueue();

      const rendererInstance = Renderer.install(Object.assign({}, exchangeRenderer));
      return {rendererInstance, serverBid};
    })
    .map(
      ({rendererInstance, serverBid}) => {
        const prebidBid = serverResponseToBid(serverBid, rendererInstance);

        const rendererConfig = Object.assign(
          {},
          prebidBid,
          {
            renderer: rendererInstance,
            adUnitCode: serverBid.ext.adUnitCode
          }
        );

        rendererInstance.setRender(() => {
          notifyRenderer(rendererConfig)
        });

        return prebidBid;
      }
    );

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
    const request = getRequests({url, method, options}, validBidRequests, bidderRequest);
    return request;
  },

  interpretResponse: function (serverResponse = {}) {
    const serverResponseBody = serverResponse.body;
    const noBidsResponse = [];
    const isInvalidResponse = !serverResponseBody || !serverResponseBody.bids;

    return isInvalidResponse
      ? noBidsResponse
      : buildPrebidResponseAndInstallRenderer(serverResponseBody.bids);
  }
};

registerBidder(adapter);
