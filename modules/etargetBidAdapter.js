import { deepSetValue, isFn, isPlainObject } from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'etarget';
const countryMap = {
  1: 'sk',
  2: 'cz',
  3: 'hu',
  4: 'ro',
  5: 'rs',
  6: 'bg',
  7: 'pl',
  8: 'hr',
  9: 'at',
  10: 'co',
  11: 'de',
  255: 'en'
}
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ BANNER, VIDEO ],
  isBidRequestValid: function (bid) {
    return !!(bid.params.refid && bid.params.country);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    var i, l, bid, reqParams, netRevenue, gdprObject;
    var request = [];
    var bids = JSON.parse(JSON.stringify(validBidRequests));
    var lastCountry = 'sk';
    var floors = [];
    for (i = 0, l = bids.length; i < l; i++) {
      bid = bids[i];
      if (countryMap[bid.params.country]) {
        lastCountry = countryMap[bid.params.country];
      }
      reqParams = bid.params;
      reqParams.transactionId = bid.transactionId;
      request.push(formRequestUrl(reqParams));
      floors[i] = getBidFloor(bid);
    }

    request.unshift('https://' + lastCountry + '.search.etargetnet.com/hb/?hbget=1');
    netRevenue = 'net';

    if (bidderRequest) {
      if (bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
        gdprObject = {
          gdpr: bidderRequest.gdprConsent.gdprApplies,
          gdpr_consent: bidderRequest.gdprConsent.consentString
        };
        request.push('gdpr=' + gdprObject.gdpr);
        request.push('gdpr_consent=' + gdprObject.gdpr_consent);
      }
      bidderRequest.metaData = getMetaData();
      if (floors.length > 0) {
        bidderRequest.floors = floors;
      }
    }

    return {
      method: 'POST',
      url: request.join('&'),
      data: bidderRequest,
      bids: validBidRequests,
      netRevenue: netRevenue,
      bidder: 'etarget',
      gdpr: gdprObject
    };

    function getMetaData() {
      var mts = {};
      var hmetas = document.getElementsByTagName('meta');
      var wnames = ['title', 'og:title', 'description', 'og:description', 'og:url', 'base', 'keywords'];
      try {
        for (var k in hmetas) {
          if (typeof hmetas[k] == 'object') {
            var mname = hmetas[k].name || hmetas[k].getAttribute('property');
            var mcont = hmetas[k].content;
            if (!!mname && mname != 'null' && !!mcont) {
              if (wnames.indexOf(mname) >= 0) {
                if (!mts[mname]) {
                  mts[mname] = [];
                }
                mts[mname].push(mcont);
              }
            }
          }
        }
        mts['title'] = [(document.getElementsByTagName('title')[0] || []).innerHTML];
        mts['base'] = [(document.getElementsByTagName('base')[0] || {}).href];
        mts['referer'] = [document.location.href];
        mts['ortb2'] = (config.getConfig('ortb2') || {});
      } catch (e) {
        mts.error = e;
      }
      return mts;
    }

    function formRequestUrl(reqData) {
      var key;
      var url = [];

      for (key in reqData) {
        if (reqData.hasOwnProperty(key) && reqData[key]) { url.push(key, '=', reqData[key], '&'); }
      }

      return encodeURIComponent(btoa(url.join('').slice(0, -1)));
    }
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const VALID_RESPONSES = {
      banner: 1,
      video: 1
    };
    var bidObject, bid, type;
    var bidRespones = [];
    var bids = bidRequest.bids;
    var responses = serverResponse.body;
    var data = [];
    for (var i = 0; i < responses.length; i++) {
      data = responses[i];
      type = data.response === 'banner' ? BANNER : VIDEO;
      bid = bids[i];
      if (VALID_RESPONSES[data.response] && (verifySize(data, bid.sizes) || type === VIDEO)) {
        bidObject = {
          requestId: bid.bidId,
          cpm: data.win_bid ? data.win_bid : 0,
          width: data.width,
          height: data.height,
          creativeId: data.creativeId,
          currency: data.win_cur,
          netRevenue: true,
          ttl: 360,
          reason: data.reason ? data.reason : 'none',
          ad: data.banner,
          vastXml: data.vast_content,
          vastUrl: data.vast_link,
          mediaType: data.response,
          transactionId: bid.transactionId
        };
        if (bidRequest.gdpr) {
          bidObject.gdpr = bidRequest.gdpr.gdpr;
          bidObject.gdpr_consent = bidRequest.gdpr.gdpr_consent;
        }
        if (bid.adomain) {
          deepSetValue(bidObject, 'meta.advertiserDomains', Array.isArray(bid.adomain) ? bid.adomain : [bid.adomain]);
        }
        bidRespones.push(bidObject);
      }
    }

    return bidRespones;

    function verifySize(adItem, validSizes) {
      for (var j = 0, k = validSizes.length; j < k; j++) {
        if (adItem.width == validSizes[j][0] &&
            adItem.height == validSizes[j][1]) {
          return true;
        }
      }
      return false;
    }
  }
};
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return null;
  }
  let floor = bid.getFloor({
    currency: 'EUR',
    mediaType: '*',
    size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor)) {
    return floor.floor;
  }
  return null;
}
registerBidder(spec);
