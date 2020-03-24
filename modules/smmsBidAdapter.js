import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'smms';
const ENDPOINT_BANNER = 'https://bidder.mediams.mb.softbank.jp/api/v1/prebid/banner';
const ENDPOINT_NATIVE = 'https://bidder.mediams.mb.softbank.jp/api/v1/prebid/native';
const COOKIE_SYNC_URL = 'https://bidder.mediams.mb.softbank.jp/api/v1/cookie/gen';
const SUPPORTED_MEDIA_TYPES = ['banner', 'native'];
const SUPPORTED_CURRENCIES = ['USD', 'JPY'];
const DEFAULT_CURRENCY = 'JPY';
const NET_REVENUE = true;

function _encodeURIComponent(a) {
  let b = window.encodeURIComponent(a);
  b = b.replace(/'/g, '%27');
  return b;
}

export function _getUrlVars(url) {
  let hash;
  const myJson = {};
  const hashes = url.slice(url.indexOf('?') + 1).split('&');
  for (let i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    myJson[hash[0]] = hash[1];
  }
  return myJson;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid: function(bid) {
    let valid = !!(bid.params.placementId);
    if (valid && bid.params.hasOwnProperty('currency')) {
      if (SUPPORTED_CURRENCIES.indexOf(bid.params.currency) === -1) {
        utils.logError('Invalid currency type, we support only JPY and USD!');
        valid = false;
      }
    }

    return valid;
  },
  /**
    * Make a server request from the list of BidRequests.
    *
    * @param {validBidRequests[]} - an array of bids
    * @return ServerRequest Info describing the request to the server.
    */
  buildRequests: function(validBidRequests, bidderRequest) {
    const serverRequests = [];
    let refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }

    const g = (typeof (geparams) !== 'undefined' && typeof (geparams) == 'object' && geparams) ? geparams : {};
    validBidRequests.forEach((bid, i) => {
      let endpoint = ENDPOINT_BANNER;
      let data = {
        'placementid': bid.params.placementId,
        'cur': bid.params.hasOwnProperty('currency') ? bid.params.currency : DEFAULT_CURRENCY,
        'ua': navigator.userAgent,
        'adtk': _encodeURIComponent(g.lat ? '0' : '1'),
        'loc': (refererInfo && refererInfo.referer) ? refererInfo.referer : '',
        'topframe': (window.parent == window.self) ? 1 : 0,
        'sw': screen && screen.width,
        'sh': screen && screen.height,
        'cb': Math.floor(Math.random() * 99999999999),
        'tpaf': 1,
        'cks': 1,
        'requestid': bid.bidId,
        'referer': (refererInfo && refererInfo.referer) ? refererInfo.referer : ''
      };

      if (bid.hasOwnProperty('nativeParams')) {
        endpoint = ENDPOINT_NATIVE;
        data.tkf = 1; // return url tracker
        data.ad_track = '1';
        data.apiv = '1.1.0';
      }

      serverRequests.push({
        method: 'GET',
        url: endpoint,
        data: utils.parseQueryStringParameters(data)
      });
    });

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
    let syncs = []
    syncs.push({
      type: 'image',
      url: COOKIE_SYNC_URL
    })

    return syncs;
  },
  onTimeout: function(timeoutData) {},
  onBidWon: function(bid) {},
  onSetTargeting: function(bid) {}
}
registerBidder(spec);
