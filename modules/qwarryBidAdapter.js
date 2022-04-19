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
        pos: bidRequest.params.pos,
        sizes: prepareSizes(bidRequest.sizes)
      })
    })

    let payload = {
      requestId: bidderRequest.bidderRequestId,
      bids,
      referer: bidderRequest.refererInfo.referer,
      schain: validBidRequests[0].schain
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdprConsent = {
        consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : false,
        consentString: bidderRequest.gdprConsent.consentString
      }
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
      if (VIDEO === bid.format) {
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

registerBidder(spec);
