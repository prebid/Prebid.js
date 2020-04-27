import * as utils from '../src/utils.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'ebdr';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ BANNER, VIDEO ],
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.zoneid);
  },
  buildRequests: function(bids) {
    const rtbServerDomain = 'dsp.bnmla.com';
    let domain = window.location.host;
    let page = window.location.pathname + location.search + location.hash;
    let ebdrImps = [];
    const ebdrReq = {};
    let ebdrParams = {};
    let zoneid = '';
    let requestId = '';
    bids.forEach(bid => {
      utils.logInfo('Log bid', bid);
      let bidFloor = utils.getBidIdParameter('bidfloor', bid.params);
      let whArr = getWidthAndHeight(bid);
      let _mediaTypes = (bid.mediaTypes && bid.mediaTypes.video) ? VIDEO : BANNER;
      zoneid = utils.getBidIdParameter('zoneid', bid.params);
      requestId = bid.bidderRequestId;
      ebdrImps.push({
        id: bid.bidId,
        [_mediaTypes]: {
          w: whArr[0],
          h: whArr[1]
        },
        bidfloor: bidFloor
      })
      ebdrReq[bid.bidId] = {mediaTypes: _mediaTypes,
        w: whArr[0],
        h: whArr[1]
      };
      ebdrParams['latitude'] = utils.getBidIdParameter('latitude', bid.params);
      ebdrParams['longitude'] = utils.getBidIdParameter('longitude', bid.params);
      ebdrParams['ifa'] = (utils.getBidIdParameter('IDFA', bid.params).length > utils.getBidIdParameter('ADID', bid.params).length) ? utils.getBidIdParameter('IDFA', bid.params) : utils.getBidIdParameter('ADID', bid.params);
    });
    let ebdrBidReq = {
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
      url: 'https://' + rtbServerDomain + '/hb?' + '&zoneid=' + zoneid + '&br=' + encodeURIComponent(JSON.stringify(ebdrBidReq)),
      bids: ebdrReq
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    utils.logInfo('Log serverResponse', serverResponse);
    utils.logInfo('Log bidRequest', bidRequest);
    let ebdrResponseImps = [];
    const ebdrResponseObj = serverResponse.body;
    if (!ebdrResponseObj || !ebdrResponseObj.seatbid || ebdrResponseObj.seatbid.length === 0 || !ebdrResponseObj.seatbid[0].bid || ebdrResponseObj.seatbid[0].bid.length === 0) {
      return [];
    }
    ebdrResponseObj.seatbid[0].bid.forEach(ebdrBid => {
      let responseCPM;
      responseCPM = parseFloat(ebdrBid.price);
      let adm;
      let type;
      let _mediaTypes;
      let vastURL;
      if (bidRequest.bids[ebdrBid.id].mediaTypes == BANNER) {
        adm = decodeURIComponent(ebdrBid.adm)
        type = 'ad';
        _mediaTypes = BANNER;
      } else {
        adm = ebdrBid.adm
        type = 'vastXml'
        _mediaTypes = VIDEO;
        if (ebdrBid.nurl) {
          vastURL = ebdrBid.nurl;
        }
      }
      let response = {
        requestId: ebdrBid.id,
        [type]: adm,
        mediaType: _mediaTypes,
        creativeId: ebdrBid.crid,
        cpm: responseCPM,
        width: ebdrBid.w,
        height: ebdrBid.h,
        currency: 'USD',
        netRevenue: true,
        ttl: 3600 }
      if (vastURL) {
        response.vastUrl = vastURL;
      }
      ebdrResponseImps.push(response);
    });
    return ebdrResponseImps;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = []
    if (syncOptions.pixelEnabled) {
      const ebdrResponseObj = serverResponses.body;
      if (!ebdrResponseObj || !ebdrResponseObj.seatbid || ebdrResponseObj.seatbid.length === 0 || !ebdrResponseObj.seatbid[0].bid || ebdrResponseObj.seatbid[0].bid.length === 0) {
        return [];
      }
      ebdrResponseObj.seatbid[0].bid.forEach(ebdrBid => {
        if (ebdrBid.iurl && ebdrBid.iurl.length > 0) {
          syncs.push({
            type: 'image',
            url: ebdrBid.iurl
          });
        }
      });
    }
    return syncs;
  }
}
function getWidthAndHeight(bid) {
  let adW = null;
  let adH = null;
  // Handing old bidder only has size object
  if (bid.sizes && bid.sizes.length) {
    let sizeArrayLength = bid.sizes.length;
    if (sizeArrayLength === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
      adW = bid.sizes[0];
      adH = bid.sizes[1];
    }
  }
  let _mediaTypes = bid.mediaTypes && bid.mediaTypes.video ? VIDEO : BANNER;
  if (bid.mediaTypes && bid.mediaTypes[_mediaTypes]) {
    if (_mediaTypes == BANNER && bid.mediaTypes[_mediaTypes].sizes && bid.mediaTypes[_mediaTypes].sizes[0] && bid.mediaTypes[_mediaTypes].sizes[0].length === 2) {
      adW = bid.mediaTypes[_mediaTypes].sizes[0][0];
      adH = bid.mediaTypes[_mediaTypes].sizes[0][1];
    } else if (_mediaTypes == VIDEO && bid.mediaTypes[_mediaTypes].playerSize && bid.mediaTypes[_mediaTypes].playerSize.length === 2) {
      adW = bid.mediaTypes[_mediaTypes].playerSize[0];
      adH = bid.mediaTypes[_mediaTypes].playerSize[1];
    }
  }
  return [adW, adH];
}
registerBidder(spec);
