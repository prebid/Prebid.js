import { registerBidder } from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';
import { ajax } from '../src/ajax';

const BIDDER_CODE = 'rtbsolutions';
const ENDPOINT_URL = 'https://dsp-eu-lb.rtbsolutions.pro/bid/hb';

export const spec = {
  version: '1.0',
  code: BIDDER_CODE,
  aliases: ['rtbss'], // short code
  nurls: {},
  isBidRequestValid: function(bid) {
    return !!bid.params.blockId;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    let req = [];

    bidderRequest.bids.forEach(item => {
      const width = item.sizes[0][0];
      const height = item.sizes[0][1];

      let imp = {
        referer: bidderRequest.refererInfo.referer,
        ua: navigator.userAgent,
        lang: this.getLanguage(),
        domain: this.getDomain(),
        width: width,
        height: height,
        type: 'banner',
      };

      if (item.params.s1 !== undefined) imp.s1 = item.params.s1;
      if (item.params.s2 !== undefined) imp.s2 = item.params.s2;
      if (item.params.s3 !== undefined) imp.s3 = item.params.s3;
      if (item.params.s4 !== undefined) imp.s4 = item.params.s4;

      req.push({
        bid_id: item.bidId,
        block_id: item.params.blockId,
        ver: this.version,
        imp
      });
    });

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: req,
      options: {
        contentType: 'application/json'
      }
    }
  },
  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];

    serverResponse.body.forEach(item => {
      this.nurls[item.bid_id] = item.nurl;

      const bidResponse = {
        requestId: item.bid_id,
        cpm: item.cpm,
        width: item.width,
        height: item.height,
        creativeId: item.creative_id,
        currency: item.currency,
        netRevenue: true,
        ttl: 360,
        ad: item.ad,
      };

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },
  onBidWon: function(bid) {
    ajax(this.nurls[bid.requestId], null);
  },

  getLanguage() {
    const language = navigator.language ? 'language' : 'userLanguage';
    const lang2 = navigator[language].split('-')[0];
    if (lang2.length === 2 || lang2.length === 3) {
      return lang2;
    }
    return '';
  },
  getDomain() {
    if (!utils.inIframe()) {
      return window.location.hostname
    }
    let origins = window.document.location.ancestorOrigins;
    if (origins && origins.length > 0) {
      return origins[origins.length - 1]
    }
  }
};
registerBidder(spec);
