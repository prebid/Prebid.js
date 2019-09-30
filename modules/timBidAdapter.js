import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import * as bidfactory from '../src/bidfactory';
var CONSTANTS = require('../src/constants.json');
const BIDDER_CODE = 'tim';

function parseBidRequest(bidRequest) {
  let params = bidRequest.url.split('?')[1];
  var obj = {};
  var pairs = params.split('&');
  try {
    for (var i in pairs) {
      var split = pairs[i].split('=');
      obj[decodeURIComponent(split[0])] = decodeURIComponent(split[1]);
    }
  } catch (e) {
    utils.logError(e);
  }

  return JSON.parse(obj.br);
}

function formatAdMarkup(bid) {
  var adm = bid.adm;
  if ('nurl' in bid) {
    adm += createTrackPixelHtml(bid.nurl);
  }
  return `<!DOCTYPE html><html><head><title></title><body style='margin:0px;padding:0px;'>${adm}</body></head>`;
}

function createTrackPixelHtml(url) {
  if (!url) {
    return '';
  }
  let img = '<div style="position:absolute;left:0px;top:0px;visibility:hidden;">';
  img += '<img src="' + url + '"></div>';
  return img;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['timmedia'],

  isBidRequestValid: function(bid) {
    if (bid.params && bid.params.publisherid && bid.params.placementCode) {
      return true;
    } if (!bid.params) {
      utils.logError('bid not valid: params were not provided');
    } else if (!bid.params.publisherid) {
      utils.logError('bid not valid: publisherid was not provided');
    } else if (!bid.params.placementCode) {
      utils.logError('bid not valid: placementCode was not provided');
    } return false;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    var requests = [];
    for (var i = 0; i < validBidRequests.length; i++) {
      requests.push(this.createRTBRequestURL(validBidRequests[i]));
    }
    return requests;
  },

  createRTBRequestURL: function(bidReq) {
    // build bid request object
    var domain = window.location.host;
    var page = window.location.href;
    var publisherid = bidReq.params.publisherid;
    var bidFloor = bidReq.params.bidfloor;
    var placementCode = bidReq.params.placementCode;

    var adW = bidReq.mediaTypes.banner.sizes[0][0];
    var adH = bidReq.mediaTypes.banner.sizes[0][1];

    // build bid request with impressions
    var bidRequest = {
      id: utils.getUniqueIdentifierStr(),
      imp: [{
        id: bidReq.bidId,
        banner: {
          w: adW,
          h: adH
        },
        tagid: placementCode,
        bidfloor: bidFloor
      }],
      site: {
        domain: domain,
        page: page,
        publisher: {
          id: publisherid
        }
      },
      device: {
        'language': this.getLanguage(),
        'w': adW,
        'h': adH,
        'js': 1,
        'ua': navigator.userAgent
      }
    };
    if (!bidFloor) {
      delete bidRequest.imp['bidfloor'];
    }

    bidRequest.bidId = bidReq.bidId;
    var url = '//hb.timmedia-hb.com/api/v2/services/prebid/' + publisherid + '/' + placementCode + '?' + 'br=' + encodeURIComponent(JSON.stringify(bidRequest));
    return {
      method: 'GET',
      url: url,
      data: '',
      options: {withCredentials: false}
    };
  },

  interpretResponse: function(serverResponse, bidRequest) {
    bidRequest = parseBidRequest(bidRequest);
    var bidResp = serverResponse.body;
    const bidResponses = [];
    if ((!bidResp || !bidResp.id) ||
      (!bidResp.seatbid || bidResp.seatbid.length === 0 || !bidResp.seatbid[0].bid || bidResp.seatbid[0].bid.length === 0)) {
      return [];
    }
    bidResp.seatbid[0].bid.forEach(function (bidderBid) {
      var responseCPM;
      var placementCode = '';
      if (bidRequest) {
        var bidResponse = bidfactory.createBid(1);
        placementCode = bidRequest.placementCode;
        bidRequest.status = CONSTANTS.STATUS.GOOD;
        responseCPM = parseFloat(bidderBid.price);
        if (responseCPM === 0) {
          var bid = bidfactory.createBid(2);
          bid.bidderCode = BIDDER_CODE;
          bidResponses.push(bid);
          return bidResponses;
        }
        bidResponse.placementCode = placementCode;
        bidResponse.size = bidRequest.sizes;
        bidResponse.creativeId = bidderBid.id;
        bidResponse.bidderCode = BIDDER_CODE;
        bidResponse.cpm = responseCPM;
        bidResponse.ad = formatAdMarkup(bidderBid);
        bidResponse.width = parseInt(bidderBid.w);
        bidResponse.height = parseInt(bidderBid.h);
        bidResponse.currency = bidResp.cur;
        bidResponse.netRevenue = true;
        bidResponse.requestId = bidRequest.bidId;
        bidResponse.ttl = 180;
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  },
  getLanguage: function() {
    const language = navigator.language ? 'language' : 'userLanguage';
    return navigator[language].split('-')[0];
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = []
    return syncs;
  },

  onTimeout: function(data) {
    // Bidder specifc code
  },

  onBidWon: function(bid) {
    // Bidder specific code
  },

  onSetTargeting: function(bid) {
    // Bidder specific code
  },
}
registerBidder(spec);
