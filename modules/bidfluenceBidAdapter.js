import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'bidfluence';

function stdTimezoneOffset(t) {
  const jan = new Date(t.getFullYear(), 0, 1);
  const jul = new Date(t.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}
function dst(t) {
  return t.getTimezoneOffset() < stdTimezoneOffset(t);
}
function getBdfTz(d) {
  let tz = d.getTimezoneOffset();
  if (dst(d)) {
    tz += 60;
  }
  return tz.toString();
}
function getUTCDate() {
  var m = new Date();
  var dateString = m.getUTCFullYear() + '/' +
    ('0' + (m.getUTCMonth() + 1)).slice(-2) + '/' +
    ('0' + m.getUTCDate()).slice(-2) + ' ' +
    ('0' + m.getUTCHours()).slice(-2) + ':' +
    ('0' + m.getUTCMinutes()).slice(-2) + ':' +
    ('0' + m.getUTCSeconds()).slice(-2);

  return dateString;
}

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function (bid) {
    return !!bid.params.placementId || !!bid.params.publisherId;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const body = document.getElementsByTagName('body')[0];
    const refInfo = bidderRequest.refererInfo;
    const gdpr = bidderRequest.gdprConsent;
    const vpW = Math.max(window.innerWidth || body.clientWidth || 0) + 2;
    const vpH = Math.max(window.innerHeight || body.clientHeight || 0) + 2;
    const sr = screen.height > screen.width ? screen.height + 'x' + screen.width + 'x' + screen.colorDepth : screen.width + 'x' + screen.height + 'x' + screen.colorDepth;

    var payload = {
      v: '2.0',
      azr: true,
      ck: utils.cookiesAreEnabled(),
      re: refInfo ? refInfo.referer : '',
      st: refInfo ? refInfo.stack : [],
      tz: getBdfTz(new Date()),
      sr: sr,
      tm: bidderRequest.timeout,
      vp: vpW + 'x' + vpH,
      sdt: getUTCDate(),
      top: refInfo ? refInfo.reachedTop : false,
      gdpr: gdpr ? gdpr.gdprApplies : false,
      gdprc: gdpr ? gdpr.consentString : '',
      bids: []
    };

    utils._each(validBidRequests, function (bidRequest) {
      var params = bidRequest.params;
      var sizes = utils.parseSizesInput(bidRequest.sizes)[0];
      var width = sizes.split('x')[0];
      var height = sizes.split('x')[1];

      var currentBidPayload = {
        bid: bidRequest.bidId,
        tid: params.placementId,
        pid: params.publisherId,
        rp: params.reservePrice || 0,
        w: width,
        h: height
      };

      payload.bids.push(currentBidPayload);
    });

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: `https://bdf${payload.bids[0].pid}.bidfluence.com/Prebid`,
      data: payloadString,
      options: { contentType: 'text/plain' }
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    utils._each(response.Bids, function (currentResponse) {
      var cpm = currentResponse.Cpm || 0;

      if (cpm > 0) {
        const bidResponse = {
          requestId: currentResponse.BidId,
          cpm: cpm,
          width: currentResponse.Width,
          height: currentResponse.Height,
          creativeId: currentResponse.CreativeId,
          ad: currentResponse.Ad,
          currency: 'USD',
          netRevenue: true,
          ttl: 360
        };
        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  },

  getUserSyncs: function (serverResponses) {
    if (serverResponses.userSyncs) {
      const syncs = serverResponses.UserSyncs.map((sync) => {
        return {
          type: sync.Type === 'ifr' ? 'iframe' : 'image',
          url: sync.Url
        };
      });
      return syncs;
    }
  }
};
registerBidder(spec);
