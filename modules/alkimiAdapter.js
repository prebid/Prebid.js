import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepClone, deepAccess } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'alkimi';
export const ENDPOINT = 'https://exchange-dev.alkimi.asteriosoft.com/bid?prebid=true'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.bidFloor && bid.params.token);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let bids = [];
    validBidRequests.forEach(bidRequest => {
      let sizes = prepareSizes(bidRequest.sizes)

      bids.push({
        bidId: bidRequest.bidId,
        token: bidRequest.params.token,
        pos: bidRequest.params.pos,
        bidFloor: bidRequest.params.bidFloor,
        width: sizes[0].width,
        height: sizes[0].height,
        impMediaType: getFormatType(bidRequest)
      })
    })

    let payload = {
      requestId: bidderRequest.bidderRequestId,
      bids,
      referer: bidderRequest.refererInfo.referer
    }

    const options = {
      contentType: 'application/json',
      customHeaders: {
        'Rtb-Direct': true
      }
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: payload,
      options
    };
  },

  interpretResponse: function (serverResponse, request) {
    const serverBody = serverResponse.body;
    if (!serverBody || typeof serverBody !== 'object') {
      return [];
    }

    const { prebidResponse } = serverBody;
    if (!prebidResponse || typeof prebidResponse !== 'object') {
      return [];
    }

    let bids = [];
    prebidResponse.forEach(bidResponse => {
      let bid = deepClone(bidResponse);
      bid.cpm = parseFloat(bidResponse.cpm);

      // banner or video
      if (VIDEO === bid.mediaType) {
        bid.vastXml = bid.ad;
      }

      bid.meta = {};
      bid.meta.advertiserDomains = bid.adomain || [];

      bids.push(bid);
    })

    return bids;
  },

  onBidWon: function (bid) {
    if (bid.winUrl) {
      const cpm = bid.cpm;
      const winUrl = bid.winUrl.replace(/\$\{AUCTION_PRICE\}/, cpm);
      ajax(winUrl, null);
      return true;
    }
    return false;
  }
}

function prepareSizes(sizes) {
  return sizes && sizes.map(size => ({ width: size[0], height: size[1] }));
}

const getFormatType = bidRequest => {
  if (deepAccess(bidRequest, 'mediaTypes.banner')) return 'Banner'
  if (deepAccess(bidRequest, 'mediaTypes.video')) return 'Video'
  if (deepAccess(bidRequest, 'mediaTypes.audio')) return 'Audio'
}

registerBidder(spec);
