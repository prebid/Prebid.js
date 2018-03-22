import * as utils from 'src/utils';
import { VIDEO, BANNER } from 'src/mediaTypes';
import { registerBidder } from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'ebdr';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ BANNER, VIDEO ],
  isBidRequestValid: function(bid) {
    return !!(bid.params.zoneid);
  },
  buildRequests: function(bids) {
    const rtbServerDomain = 'dsp.bnmla.com';
    var domain = window.location.host;
    var page = window.location.pathname + location.search + location.hash;
    let ebdrImps = [];
    var ebdrParams = {};
    var zoneid = '';
    var requestId = '';
    bids.forEach(bid => {
      // utils.logInfo(`Log ${bid}`);
      console.log(bid);
      var bidFloor = utils.getBidIdParameter('bidfloor', bid.params);
      var whArr = getWidthAndHeight(bid);
      zoneid = utils.getBidIdParameter('zoneid', bid.params);
      requestId = bid.bidderRequestId;
      ebdrImps.push({
        id: bid.bidId,
        banner: {
          w: whArr[0],
          h: whArr[1]
        },
        bidfloor: bidFloor
      })
      ebdrParams['latitude'] = utils.getBidIdParameter('latitude', bid.params);
      ebdrParams['longitude'] = utils.getBidIdParameter('longitude', bid.params);
      ebdrParams['ifa'] = (utils.getBidIdParameter('IDFA', bid.params).length > utils.getBidIdParameter('ADID', bid.params).length) ? utils.getBidIdParameter('IDFA', bid.params) : utils.getBidIdParameter('ADID', bid.params);
    });
    var ebdrBidReq = {
      id: requestId,
      imp: ebdrImps,
      site: {
        domain: domain,
        page: page
      },
      device: {
        geo: {
          lat: ebdrParams.latitude,
          log: ebdrParams.longitude
        },
        ifa: ebdrParams.ifa
      }
    };
    return {
      method: 'GET',
      url: '//' + rtbServerDomain + '/hb?' + '&zoneid=' + zoneid + '&br=' + encodeURIComponent(JSON.stringify(ebdrBidReq)),
      bids: ebdrImps
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    console.log(serverResponse);
    console.log(bidRequest);
    let ebdrResponseImps = [];
    const ebdrResponseObj = serverResponse.body;
    if (!ebdrResponseObj || !ebdrResponseObj.seatbid || ebdrResponseObj.seatbid.length === 0 || !ebdrResponseObj.seatbid[0].bid || ebdrResponseObj.seatbid[0].bid.length === 0) {
      return [];
    }
    ebdrResponseObj.seatbid[0].bid.forEach(ebdrBid => {
      var responseCPM;
      responseCPM = parseFloat(ebdrBid.price);
      var adm = decodeURIComponent(ebdrBid.adm);
      ebdrResponseImps.push({
        requestId: ebdrBid.id,
        bidderCode: spec.code,
        ad: adm,
        creativeId: ebdrBid.crid,
        cpm: responseCPM,
        width: ebdrBid.w,
        height: ebdrBid.h,
        mediaType: BANNER,
        currency: 'USD',
        netRevenue: true,
        ttl: 3600 });
    });
    return ebdrResponseImps;
  }
}
function getWidthAndHeight(bid) {
  var adW = null;
  var adH = null;

  var sizeArrayLength = bid.sizes.length;
  if (sizeArrayLength === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
    adW = bid.sizes[0];
    adH = bid.sizes[1];
  } else {
    adW = bid.sizes[0][0];
    adH = bid.sizes[0][1];
  }

  return [adW, adH];
}
registerBidder(spec);
