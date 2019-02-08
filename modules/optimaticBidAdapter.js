import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
export const ENDPOINT = '//mg-bid.optimatic.com/adrequest/';

export const spec = {

  version: '1.0.4',

  code: 'optimatic',

  supportedMediaTypes: ['video'],

  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.placement && bid.params.bidfloor);
  },

  buildRequests: function(bids) {
    return bids.map(bid => {
      return {
        method: 'POST',
        url: ENDPOINT + bid.params.placement,
        data: getData(bid),
        options: {contentType: 'application/json'},
        bidRequest: bid
      }
    })
  },

  interpretResponse: function(response, { bidRequest }) {
    let bid;
    let size;
    let bidResponse;
    try {
      response = response.body;
      bid = response.seatbid[0].bid[0];
    } catch (e) {
      response = null;
    }
    if (!response || !bid || (!bid.adm && !bid.nurl) || !bid.price) {
      utils.logWarn(`No valid bids from ${spec.code} bidder`);
      return [];
    }
    size = getSize(bidRequest.sizes);
    bidResponse = {
      requestId: bidRequest.bidId,
      bidderCode: spec.code,
      cpm: bid.price,
      creativeId: bid.id,
      width: size.width,
      height: size.height,
      mediaType: 'video',
      currency: response.cur,
      ttl: 300,
      netRevenue: true
    };
    if (bid.nurl) {
      bidResponse.vastUrl = bid.nurl;
    } else if (bid.adm) {
      bidResponse.vastXml = bid.adm;
    }
    return bidResponse;
  }
};

function getSize(sizes) {
  let parsedSizes = utils.parseSizesInput(sizes);
  let [ width, height ] = parsedSizes.length ? parsedSizes[0].split('x') : [];
  return {
    width: parseInt(width, 10) || undefined,
    height: parseInt(height, 10) || undefined
  };
}

function getData (bid) {
  let size = getSize(bid.sizes);
  let loc = utils.getTopWindowLocation();
  let global = (window.top) ? window.top : window;
  return {
    id: utils.generateUUID(),
    imp: [{
      id: '1',
      bidfloor: bid.params.bidfloor,
      video: {
        mimes: ['video/mp4', 'video/ogg', 'video/webm', 'video/x-flv', 'application/javascript', 'application/x-shockwave-flash'],
        w: size.width,
        h: size.height
      }
    }],
    site: {
      id: '1',
      domain: loc.host,
      page: loc.href,
      ref: utils.getTopWindowReferrer(),
      publisher: {
        id: '1'
      }
    },
    device: {
      ua: global.navigator.userAgent,
      ip: '127.0.0.1',
      devicetype: 1
    }
  };
}

registerBidder(spec);
