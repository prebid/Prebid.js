import { convertOrtbRequestToProprietaryNative } from '../../src/native.js';
import { replaceAuctionPrice } from '../../src/utils.js';
import { ajax } from '../../src/ajax.js';
import { consentCheck } from './bidUtilsCommon.js';

export const buildRequests = (endpoint) => (validBidRequests = [], bidderRequest) => {
  // convert Native ORTB definition to old-style prebid native definition
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let req = {
    // bidRequest: bidderRequest,
    id: validBidRequests[0].auctionId,
    cur: validBidRequests[0].params.currency || ['USD'],
    imp: validBidRequests.map(req => {
      const { bidId, sizes } = req
      const impValue = {
        id: bidId,
        bidfloor: req.params.bidFloor,
        bidfloorcur: req.params.currency
      }
      if (req.mediaTypes.banner) {
        impValue.banner = {
          format: (req.mediaTypes.banner.sizes || sizes).map(size => {
            return { w: size[0], h: size[1] }
          }),

        }
      }
      return impValue
    }),
    user: {
      id: validBidRequests[0].userId.pubcid || '',
      buyeruid: validBidRequests[0].buyerUid || '',
      geo: {
        country: validBidRequests[0].params.region || city,
        region: validBidRequests[0].params.region || city,
      },

    },
    device: validBidRequests[0].ortb2.device,
    site: validBidRequests[0].ortb2.site,
    source: validBidRequests[0].ortb2.source,
    bcat: validBidRequests[0].ortb2.bcat || validBidRequests[0].params.bcat,
    badv: validBidRequests[0].ortb2.badv || validBidRequests[0].params.badv,
    wlang: validBidRequests[0].ortb2.wlang || validBidRequests[0].params.wlang,
  };
  if (req.device && req.device != 'undefined') {
    req.device.geo = {
      country: req.user.geo.country,
      region: req.user.geo.region,

    };
  };
  req.site.publisher = {
    publisherId: validBidRequests[0].params.publisherId
  };

  //  req.language.indexOf('-') != -1 && (req.language = req.language.split('-')[0])
  consentCheck(bidderRequest, req);
  return {
    method: 'POST',
    url: endpoint,
    data: req,

  };
}

export function interpretResponse(serverResponse) {
  const bidsValue = []
  const bidResponse = serverResponse.body
  bidResponse.seatbid.forEach(seat => {
    seat.bid.forEach(bid => {
      bidsValue.push({
        requestId: bid.impid,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        ad: macroReplace(bid.adm, bid.price),
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        meta: {
          advertiserDomains: bid.adomain || '',
        },
      })
    })
  })
  return bidsValue
}

export function onBidWon(bid) {
  if (bid.nurl) {
    const resolvedNurl = replaceAuctionPrice(bid.nurl, bid.price);
    ajax(resolvedNurl);
  }
}

/* replacing auction_price macro from adm */
function macroReplace(adm, cpm) {
  let replacedadm = replaceAuctionPrice(adm, cpm);
  return replacedadm;
}
