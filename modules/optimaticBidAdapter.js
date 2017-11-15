import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
const LOGURL = 'http://playerlog.optimatic.com/log';
const VERSION = '7.0.0.1';

let isLogActive = false;
let rand = Math.round(Math.random() * 10000);

export const ENDPOINT = '//mg-bid.optimatic.com/adrequest/';

export const spec = {
  code: 'optimatic',

  supportedMediaTypes: ['video'],

  isBidRequestValid: function(bid) {
    let isValid = !!(bid && bid.params && bid.params.placement && bid.params.bidfloor);
    if (!isValid) {
      let error = (!bid) ? 'nobid' : (!bid.params) ? 'nobidparams' : (!bid.params.placement) ? 'nobidplacement' : (!bid.params.bidfloor) ? 'nobidfloor' : 'noerror';
      let id = (bid && bid.params && bid.params.placement);
      log('bid-error', '' + id, '', '' + error, 10);
    }
    return isValid;
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
    if (!response || !bid || !bid.adm || !bid.price) {
      utils.logWarn(`No valid bids from ${spec.code} bidder`);
      let error = (!response) ? 'nullresponse' : (!bid) ? 'nullbid' : (!bid.adm) ? 'nulladm' : (!bid.price) ? 'nullprice' : 'nullerror';
      log('bid-error', '' + bidRequest.params.placement, '', '' + error, 10);
      return [];
    }
    size = getSize(bidRequest.sizes);
    bidResponse = {
      requestId: bidRequest.bidId,
      bidderCode: spec.code,
      cpm: bid.price,
      creativeId: bid.id,
      vastXml: bid.adm,
      width: size.width,
      height: size.height,
      mediaType: 'video',
      currency: response.cur,
      ttl: 300,
      netRevenue: true
    };
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
        width: size.width,
        height: size.height
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

function log (field1, field2, field3, field4, pct) {
  pct = (!pct) ? 100 : pct * 100;
  isLogActive = rand <= pct;
  if (!isLogActive) return;

  let data = [{'body': '\"' + field1 + '\",\"' + field2 + '\",\"' + field3 + '\",\"' + field4 + '\",\"' + VERSION + '\"'}];
  let jsonData = JSON.stringify(data);

  ajax(LOGURL, response => {
  }, jsonData, {method: 'POST', contentType: 'application/json'});
}

config.setConfig({ usePrebidCache: true });
registerBidder(spec);
