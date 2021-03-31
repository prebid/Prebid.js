import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepClone } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'qwarry';
export const ENDPOINT = 'https://bidder.qwarry.co/bid/adtag?prebid=true'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.zoneToken);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let bids = [];
    validBidRequests.forEach(bidRequest => {
      bids.push({
        bidId: bidRequest.bidId,
        zoneToken: bidRequest.params.zoneToken,
        pos: bidRequest.params.pos
      })
    })

    return {
      method: 'POST',
      url: ENDPOINT,
      data: { requestId: bidderRequest.bidderRequestId, bids, referer: bidderRequest.refererInfo.referer },
      options: {
        contentType: 'application/json',
        customHeaders: {
          'Rtb-Direct': true
        }
      }
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
      if (VIDEO === bid.format) {
        bid.vastXml = bid.ad;
      }

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

registerBidder(spec);
