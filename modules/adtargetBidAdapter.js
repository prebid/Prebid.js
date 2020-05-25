import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import find from 'core-js-pure/features/array/find.js';

const ENDPOINT = 'https://ghb.console.adtarget.com.tr/v2/auction/';
const BIDDER_CODE = 'adtarget';
const DISPLAY = 'display';
const syncsCache = {};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: function (bid) {
    return !!utils.deepAccess(bid, 'params.aid');
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];

    function addSyncs(bid) {
      const uris = bid.cookieURLs;
      const types = bid.cookieURLSTypes || [];

      if (Array.isArray(uris)) {
        uris.forEach((uri, i) => {
          const type = types[i] || 'image';

          if ((!syncOptions.pixelEnabled && type === 'image') ||
            (!syncOptions.iframeEnabled && type === 'iframe') ||
            syncsCache[uri]) {
            return;
          }

          syncsCache[uri] = true;
          syncs.push({
            type: type,
            url: uri
          })
        })
      }
    }

    if (syncOptions.pixelEnabled || syncOptions.iframeEnabled) {
      utils.isArray(serverResponses) && serverResponses.forEach((response) => {
        if (response.body) {
          if (utils.isArray(response.body)) {
            response.body.forEach(b => {
              addSyncs(b);
            })
          } else {
            addSyncs(response.body)
          }
        }
      })
    }
    return syncs;
  },

  buildRequests: function (bidRequests, adapterRequest) {
    const adapterSettings = config.getConfig(adapterRequest.bidderCode)
    const chunkSize = utils.deepAccess(adapterSettings, 'chunkSize', 10);
    const { tag, bids } = bidToTag(bidRequests, adapterRequest);
    const bidChunks = utils.chunk(bids, chunkSize);
    return utils._map(bidChunks, (bids) => {
      return {
        data: Object.assign({}, tag, { BidRequests: bids }),
        adapterRequest,
        method: 'POST',
        url: ENDPOINT
      };
    })
  },
  interpretResponse: function (serverResponse, { adapterRequest }) {
    serverResponse = serverResponse.body;
    let bids = [];

    if (!utils.isArray(serverResponse)) {
      return parseResponse(serverResponse, adapterRequest);
    }

    serverResponse.forEach(serverBidResponse => {
      bids = utils.flatten(bids, parseResponse(serverBidResponse, adapterRequest));
    });

    return bids;
  }
};

function parseResponse(serverResponse, adapterRequest) {
  const isInvalidValidResp = !serverResponse || !utils.isArray(serverResponse.bids);
  const bids = [];

  if (isInvalidValidResp) {
    const extMessage = serverResponse && serverResponse.ext && serverResponse.ext.message ? `: ${serverResponse.ext.message}` : '';
    const errorMessage = `in response for ${adapterRequest.bidderCode} adapter ${extMessage}`;

    utils.logError(errorMessage);

    return bids;
  }

  serverResponse.bids.forEach(serverBid => {
    const request = find(adapterRequest.bids, (bidRequest) => {
      return bidRequest.bidId === serverBid.requestId;
    });

    if (serverBid.cpm !== 0 && request !== undefined) {
      const bid = createBid(serverBid, request);

      bids.push(bid);
    }
  });

  return bids;
}

function bidToTag(bidRequests, adapterRequest) {
  const tag = {
    Domain: utils.deepAccess(adapterRequest, 'refererInfo.referer')
  };
  if (config.getConfig('coppa') === true) {
    tag.Coppa = 1;
  }
  if (utils.deepAccess(adapterRequest, 'gdprConsent.gdprApplies')) {
    tag.GDPR = 1;
    tag.GDPRConsent = utils.deepAccess(adapterRequest, 'gdprConsent.consentString');
  }
  if (utils.deepAccess(adapterRequest, 'uspConsent')) {
    tag.USP = utils.deepAccess(adapterRequest, 'uspConsent');
  }
  if (utils.deepAccess(bidRequests[0], 'schain')) {
    tag.Schain = utils.deepAccess(bidRequests[0], 'schain');
  }
  if (utils.deepAccess(bidRequests[0], 'userId')) {
    tag.UserIds = utils.deepAccess(bidRequests[0], 'userId');
  }

  const bids = []

  for (let i = 0, length = bidRequests.length; i < length; i++) {
    const bid = prepareBidRequests(bidRequests[i]);
    bids.push(bid);
  }

  return { tag, bids };
}

function prepareBidRequests(bidReq) {
  const mediaType = utils.deepAccess(bidReq, 'mediaTypes.video') ? VIDEO : DISPLAY;
  const sizes = mediaType === VIDEO ? utils.deepAccess(bidReq, 'mediaTypes.video.playerSize') : utils.deepAccess(bidReq, 'mediaTypes.banner.sizes');
  const bidReqParams = {
    'CallbackId': bidReq.bidId,
    'Aid': bidReq.params.aid,
    'AdType': mediaType,
    'Sizes': utils.parseSizesInput(sizes).join(',')
  };
  return bidReqParams;
}

function getMediaType(bidderRequest) {
  return utils.deepAccess(bidderRequest, 'mediaTypes.video') ? VIDEO : BANNER;
}

function createBid(bidResponse, bidRequest) {
  const mediaType = getMediaType(bidRequest)
  const bid = {
    requestId: bidResponse.requestId,
    creativeId: bidResponse.cmpId,
    height: bidResponse.height,
    currency: bidResponse.cur,
    width: bidResponse.width,
    cpm: bidResponse.cpm,
    netRevenue: true,
    mediaType,
    ttl: 300
  };

  if (mediaType === BANNER) {
    return Object.assign(bid, {
      ad: bidResponse.ad
    });
  }
  Object.assign(bid, {
    vastUrl: bidResponse.vastUrl
  });
  return bid;
}

registerBidder(spec);
