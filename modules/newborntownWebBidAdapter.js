import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();
const BIDDER_CODE = 'newborntownWeb';

const REQUEST_URL = 'https://us-west.solortb.com/adx/api/rtb?from=4'

function randomn(n) {
  return parseInt((Math.random() + 1) * Math.pow(10, n - 1)) + '';
}
function generateGUID() {
  var d = new Date().getTime();
  var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  })
  return guid;
}
function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}
function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}
function _getDeviceType() {
  return _isMobile() ? 1 : _isConnectedTV() ? 3 : 2;
}
var platform = (function getPlatform() {
  var ua = navigator.userAgent;
  if (ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1) {
    return 'Android'
  }
  if (ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
    return 'iOS'
  }
  return 'windows'
})();
function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  isBidRequestValid: function(bid) {
    return !!(bid.params.publisher_id && bid.params.slot_id && bid.params.bidfloor);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let requestArr = []
    if (validBidRequests.length === 0) {
      return null;
    }
    var guid;
    if (storage.getDataFromLocalStorage('sax_user_id') == null) {
      storage.setDataInLocalStorage('sax_user_id', generateGUID())
    }
    guid = storage.getDataFromLocalStorage('sax_user_id')
    utils._each(validBidRequests, function(bidRequest) {
      const bidRequestObj = bidRequest.params
      var req = {
        id: randomn(12) + randomn(12),
        tmax: bidderRequest.timeout,
        bidId: bidRequest.bidId,
        user: {
          id: guid
        },
        imp: [
          {
            id: '1',
            bidfloor: bidRequestObj.bidfloor,
            bidfloorcur: 'USD',
            banner: {
              w: 0,
              h: 0
            }
          }
        ],
        site: {
          domain: window.location.host,
          id: bidRequestObj.slot_id,
          page: window.location.href,
          publisher: {
            id: bidRequestObj.publisher_id
          },
        },
        device: {
          ip: '',
          ua: navigator.userAgent,
          os: platform,
          geo: {
            country: '',
            type: 0,
            ipservice: 1,
            region: '',
            city: '',
          },
          language: getLanguage(),
          devicetype: _getDeviceType()
        },
        ext: {
          solomath: {
            slotid: bidRequestObj.slot_id
          }
        }
      };
      var sizes = bidRequest.sizes;
      if (sizes) {
        if (sizes && utils.isArray(sizes[0])) {
          req.imp[0].banner.w = sizes[0][0];
          req.imp[0].banner.h = sizes[0][1];
        } else if (sizes && utils.isNumber(sizes[0])) {
          req.imp[0].banner.w = sizes[0];
          req.imp[0].banner.h = sizes[1];
        }
      } else {
        return false;
      }
      const options = {
        withCredentials: false
      }
      requestArr.push({
        method: 'POST',
        url: REQUEST_URL,
        data: req,
        bidderRequest,
        options: options
      })
    })
    return requestArr;
  },
  interpretResponse: function(serverResponse, request) {
    var bidResponses = [];
    if (serverResponse.body.seatbid && serverResponse.body.seatbid.length > 0 && serverResponse.body.seatbid[0].bid && serverResponse.body.seatbid[0].bid.length > 0 && serverResponse.body.seatbid[0].bid[0].adm) {
      utils._each(serverResponse.body.seatbid[0].bid, function(bodyAds) {
        var adstr = '';
        adstr = bodyAds.adm;
        var bidResponse = {
          requestId: request.data.bidId || 0,
          cpm: bodyAds.price || 0,
          width: bodyAds.w ? bodyAds.w : 0,
          height: bodyAds.h ? bodyAds.h : 0,
          ad: adstr,
          netRevenue: true,
          currency: serverResponse.body.cur || 'USD',
          ttl: 600,
          creativeId: bodyAds.cid
        };
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  }
}
registerBidder(spec);
