import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'rtbdemand';
const BIDDER_SERVER = 'bidding.rtbdemand.com';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.zoneid);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      var server = bidRequest.params.server || BIDDER_SERVER;
      var parse = getSize(bidderRequest.bids[0].sizes);
      const payload = {
        from: 'hb',
        v: '1.0',
        request_id: bidRequest.bidderRequestId,
        imp_id: bidRequest.bidId,
        aff: bidRequest.params.zoneid,
        bid_floor: parseFloat(bidRequest.params.floor) > 0 ? bidRequest.params.floor : 0,
        charset: document.charSet || document.characterSet,
        site_domain: document.location.hostname,
        site_page: window.location.href,
        subid: 'hb',
        flashver: getFlashVersion(),
        tmax: bidderRequest.timeout,
        hb: '1',
        name: document.location.hostname,
        width: parse.width,
        height: parse.height,
        device_width: screen.width,
        device_height: screen.height,
        dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
        secure: isSecure(),
        make: navigator.vendor ? navigator.vendor : '',
      };
      if (document.referrer) {
        payload.referrer = document.referrer;
      }

      return {
        method: 'GET',
        url: 'https://' + server + '/hb',
        data: payload
      };
    });
  },
  interpretResponse: function(serverResponse) {
    serverResponse = serverResponse.body;
    const bidResponses = [];
    if (serverResponse && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(seatBid => seatBid.bid.forEach(bid => {
        const bidResponse = {
          requestId: bid.impid,
          creativeId: bid.impid,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ad: bid.adm,
          netRevenue: true,
          currency: 'USD',
          ttl: 360,
        };

        bidResponses.push(bidResponse);
      }));
    }
    return bidResponses;
  },
  getUserSyncs: function getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://' + BIDDER_SERVER + '/delivery/matches.php?type=iframe',
      }];
    }
  }
}

function getFlashVersion() {
  var plugins, plugin, result;

  if (navigator.plugins && navigator.plugins.length > 0) {
    plugins = navigator.plugins;
    for (var i = 0; i < plugins.length && !result; i++) {
      plugin = plugins[i];
      if (plugin.name.indexOf('Shockwave Flash') > -1) {
        result = plugin.description.split('Shockwave Flash ')[1];
      }
    }
  }
  return result || '';
}

/* Get parsed size from request size */
function getSize(requestSizes) {
  const parsed = {};
  const size = utils.parseSizesInput(requestSizes)[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  const parsedSize = size.toUpperCase().split('X');
  const width = parseInt(parsedSize[0], 10);
  if (width) {
    parsed.width = width;
  }

  const height = parseInt(parsedSize[1], 10);
  if (height) {
    parsed.height = height;
  }

  return parsed;
}

function isSecure() {
  return document.location.protocol === 'https:';
}

registerBidder(spec);
