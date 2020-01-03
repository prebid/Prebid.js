import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'reklamstore';
const ENDPOINT_URL = 'https://ads.rekmob.com/m/prebid';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
  * Determines whether or not the given bid request is valid.
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function (bid) {
    return !!(bid.params.regionId);
  },
  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} - an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: function (validBidRequests, bidderRequest) {
    const url = bidderRequest.refererInfo.referer;
    let requests = [];
    utils._each(validBidRequests, function(bid) {
      requests.push({
        method: 'GET',
        url: ENDPOINT_URL,
        data: {
          regionId: bid.params.regionId,
          dt: getDeviceType(),
          os: getOS(),
          ref: extractDomain(url),
          _: (new Date().getTime()),
          mobile_web: 1
        },
        bidId: bid.bidId
      });
    });
    return requests;
  },

  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {ServerResponse} serverResponse A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function (serverResponse, bidRequest) {
    try {
      const bidResponse = serverResponse.body;
      const bidResponses = [];
      if (bidResponse) {
        bidResponses.push({
          requestId: bidRequest.bidId,
          cpm: parseFloat(bidResponse.cpm),
          width: bidResponse.w,
          height: bidResponse.h,
          creativeId: bidResponse.adId || 1,
          currency: CURRENCY,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          ad: bidResponse.ad
        });
      }
      return bidResponses;
    } catch (err) {
      utils.logError(err);
      return [];
    }
  },
  /**
  * Register the user sync pixels which should be dropped after the auction.
  *
  * @param {SyncOptions} syncOptions Which user syncs are allowed?
  * @param {ServerResponse[]} serverResponses List of server's responses.
  * @return {UserSync[]} The user syncs which should be dropped.
  */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    utils._each(serverResponses, function(bidResponse) {
      utils._each(bidResponse.body.syncs, function(sync) {
        if (syncOptions.pixelEnabled && sync.type == 'image') {
          syncs.push({
            type: sync.type,
            url: sync.url
          });
        } else if (syncOptions.iframeEnabled && sync.type == 'iframe') {
          syncs.push({
            type: sync.type,
            url: sync.url
          });
        }
      });
    });
    return syncs;
  }
}
registerBidder(spec);

function getDeviceType() {
  let PHONE = 0;
  let TABLET = 2;
  let DESKTOP = 3;
  if (isPhone()) {
    return PHONE;
  } else if (isTablet()) {
    return TABLET;
  } else {
    return DESKTOP;
  }
}
function isPhone() {
  var check = false;
  (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}
function isTablet() {
  var check = false;
  (function(a) { if (/ipad|android|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(a)) { check = true; } })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}
function getOS() {
  var ua = navigator.userAgent;
  if (ua.match(/(iPhone|iPod|iPad)/)) {
    return '1';
  } else if (ua.match(/Android/)) {
    return '0';
  } else {
    return '3';
  }
}
function extractDomain(url) {
  var domain;
  if (url.indexOf('://') > -1) {
    domain = url.split('/')[2];
  } else {
    domain = url.split('/')[0];
  }
  domain = domain.split(':')[0];
  return domain;
}
