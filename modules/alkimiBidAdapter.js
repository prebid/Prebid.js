import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepClone, deepAccess } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'alkimi';
export const ENDPOINT = 'https://exchange.alkimi-onboarding.com/bid?prebid=true';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.bidFloor && bid.params.token);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let bids = [];
    let bidIds = [];
    validBidRequests.forEach(bidRequest => {
      let sizes = prepareSizes(bidRequest.sizes)

      bids.push({
        token: bidRequest.params.token,
        pos: bidRequest.params.pos,
        bidFloor: bidRequest.params.bidFloor,
        width: sizes[0].width,
        height: sizes[0].height,
        impMediaType: getFormatType(bidRequest)
      })
      bidIds.push(bidRequest.bidId)
    })

    const alkimiConfig = config.getConfig('alkimi');

    let payload = {
      requestId: bidderRequest.auctionId,
      signRequest: { bids, randomUUID: alkimiConfig && alkimiConfig.randomUUID },
      bidIds,
      referer: bidderRequest.refererInfo.referer,
      signature: alkimiConfig && alkimiConfig.signature
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
    let winUrl;
    if (bid.winUrl || bid.vastUrl) {
      winUrl = bid.winUrl ? bid.winUrl : bid.vastUrl;
      winUrl = winUrl.replace(/\$\{AUCTION_PRICE\}/, bid.cpm);
    } else if (bid.ad) {
      let trackImg = bid.ad.match(/(?!^)<img src=".+dsp-win.+">/);
      bid.ad = bid.ad.replace(trackImg[0], '');
      winUrl = trackImg[0].split('"')[1];
      winUrl = winUrl.replace(/\$%7BAUCTION_PRICE%7D/, bid.cpm);
    } else {
      return false;
    }

    ajax(winUrl, null);
    return true;
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
