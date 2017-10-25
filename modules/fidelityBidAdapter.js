import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'fidelity';
const BIDDER_SERVER = 'x.fidelity-media.com';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.zoneid);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      var server = bidRequest.params.server || BIDDER_SERVER;

      const payload = {
        from: 'hb',
        v: '1.0',
        requestid: bidRequest.bidderRequestId,
        impid: bidRequest.bidId,
        zoneid: bidRequest.params.zoneid,
        floor: parseFloat(bidRequest.params.floor) > 0 ? bidRequest.params.floor : 0,
        charset: document.charSet || document.characterSet,
        defloc: utils.getTopWindowUrl(),
        altloc: window.location.href,
        subid: 'hb',
        flashver: getFlashVersion(),
        tmax: bidderRequest.timeout,
      };
      if (document.referrer) {
        payload.referrer = document.referrer;
      }

      return {
        method: 'GET',
        url: '//' + server + '/delivery/hb.php',
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
          width: bid.width,
          height: bid.height,
          ad: bid.adm,
          netRevenue: bid.netRevenue,
          currency: bid.cur,
          ttl: bid.ttl,
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
        url: '//' + BIDDER_SERVER + '/delivery/matches.php?type=iframe',
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

registerBidder(spec);
