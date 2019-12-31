import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = '7xbid';
const BIDDER_ALIAS = '7xb';
const ENDPOINT_BANNER = '//bidder.7xbid.com/api/v1/prebid/banner';
const ENDPOINT_NATIVE = '//bidder.7xbid.com/api/v1/prebid/native';
const COOKIE_SYNC_URL = '//bidder.7xbid.com/api/v1/cookie/gen';
const SUPPORTED_MEDIA_TYPES = ['banner', 'native'];
const SUPPORTED_CURRENCIES = ['USD', 'JPY'];
const DEFAULT_CURRENCY = 'JPY';
const NET_REVENUE = true;

const _encodeURIComponent = function(a) {
  let b = window.encodeURIComponent(a);
  b = b.replace(/'/g, '%27');
  return b;
}

export const _getUrlVars = function(url) {
  var hash;
  var myJson = {};
  var hashes = url.slice(url.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    myJson[hash[0]] = hash[1];
  }
  return myJson;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [BIDDER_ALIAS], // short code
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid: function(bid) {
    if (!(bid.params.placementId)) {
      return false;
    }

    if (bid.params.hasOwnProperty('currency') &&
      SUPPORTED_CURRENCIES.indexOf(bid.params.currency) === -1) {
      utils.logInfo('Invalid currency type, we support only JPY and USD!')
      return false;
    }

    return true;
  },
  /**
    * Make a server request from the list of BidRequests.
    *
    * @param {validBidRequests[]} - an array of bids
    * @return ServerRequest Info describing the request to the server.
    */
  buildRequests: function(validBidRequests, bidderRequest) {
    let serverRequests = [];
    var refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }
    validBidRequests.forEach((bid, i) => {
      let endpoint = ENDPOINT_BANNER
      let data = {
        'placementid': bid.params.placementId,
        'cur': bid.params.hasOwnProperty('currency') ? bid.params.currency : DEFAULT_CURRENCY,
        'ua': navigator.userAgent,
        'loc': utils.getTopWindowUrl(),
        'topframe': (window.parent === window.self) ? 1 : 0,
        'sw': screen && screen.width,
        'sh': screen && screen.height,
        'cb': Math.floor(Math.random() * 99999999999),
        'tpaf': 1,
        'cks': 1,
        'requestid': bid.bidId
      };

      if (bid.hasOwnProperty('nativeParams')) {
        endpoint = ENDPOINT_NATIVE
        data.tkf = 1 // return url tracker
        data.ad_track = '1'
        data.apiv = '1.1.0'
      }

      if (refererInfo && refererInfo.referer) {
        data.referer = refererInfo.referer;
      } else {
        data.referer = '';
      }

      serverRequests.push({
        method: 'GET',
        url: endpoint,
        data: utils.parseQueryStringParameters(data)
      })
    })

    return serverRequests;
  },
  interpretResponse: function(serverResponse, request) {
    const data = _getUrlVars(request.data)
    const successBid = serverResponse.body || {};
    let bidResponses = [];
    if (successBid.hasOwnProperty(data.placementid)) {
      let bid = successBid[data.placementid]
      let bidResponse = {
        requestId: bid.requestid,
        cpm: bid.price,
        creativeId: bid.creativeId,
        currency: bid.cur,
        netRevenue: NET_REVENUE,
        ttl: 700
      };

      if (bid.hasOwnProperty('title')) { // it is native ad response
        bidResponse.mediaType = 'native'
        bidResponse.native = {
          title: bid.title,
          body: bid.description,
          cta: bid.cta,
          sponsoredBy: bid.advertiser,
          clickUrl: _encodeURIComponent(bid.landingURL),
          impressionTrackers: bid.trackings,
        }
        if (bid.screenshots) {
          bidResponse.native.image = {
            url: bid.screenshots.url,
            height: bid.screenshots.height,
            width: bid.screenshots.width,
          }
        }
        if (bid.icon) {
          bidResponse.native.icon = {
            url: bid.icon.url,
            height: bid.icon.height,
            width: bid.icon.width,
          }
        }
      } else {
        bidResponse.ad = bid.adm
        bidResponse.width = bid.width
        bidResponse.height = bid.height
      }

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    return [{
      type: 'image',
      url: COOKIE_SYNC_URL
    }];
  }
}
registerBidder(spec);
