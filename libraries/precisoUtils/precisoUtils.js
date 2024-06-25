import { convertOrtbRequestToProprietaryNative } from '../../src/native.js';
import { isFn, deepAccess, replaceAuctionPrice } from '../../src/utils.js';
import { ajax } from '../../src/ajax.js';

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
        bidFloor: getBidFloorPrice(req),
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
      buyeruid: window.localStorage.getItem('_pre|id'),
      geo: {
        country: validBidRequests[0].params.region || city,
      },

    },
    device: validBidRequests[0].ortb2.device,
    site: validBidRequests[0].ortb2.site,
    source: validBidRequests[0].ortb2.source,
    bcat: validBidRequests[0].ortb2.bcat || validBidRequests[0].params.bcat,
    badv: validBidRequests[0].ortb2.badv || validBidRequests[0].params.badv,
    wlang: validBidRequests[0].ortb2.wlang || validBidRequests[0].params.wlang,
  };
  req.site.publisher = {
    publisherId: validBidRequests[0].params.publisherId
  };

  //  req.language.indexOf('-') != -1 && (req.language = req.language.split('-')[0])
  if (bidderRequest) {
    if (bidderRequest.uspConsent) {
      req.ccpa = bidderRequest.uspConsent;
    }
    if (bidderRequest.gdprConsent) {
      req.gdpr = bidderRequest.gdprConsent
    }
    if (bidderRequest.gppConsent) {
      req.gpp = bidderRequest.gppConsent;
    }
  }

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

export const getUserSyncs = (syncEndpoint, strId, storage) => (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  // let userId = sharedId;
  let userId = readFromAllStorages(strId, storage);
  let syncs = [];
  let syncUrl = `${syncEndpoint}id=${userId}`

  if (gdprConsent) {
    syncUrl = syncUrl + `&gdpr=${Number(gdprConsent.gdprApplies && 1)}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`;
  } else {
    syncUrl = syncUrl + `&gdpr=0&gdpr_consent=`
  }
  if (uspConsent) {
    syncUrl = syncUrl + `&us_privacy=${uspConsent}`
  } else {
    syncUrl = syncUrl + `&us_privacy=`
  }

  if (syncOptions.iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: syncUrl + `&t=4`
    });
  } else {
    syncs.push({
      type: 'image',
      url: syncUrl + `&t=2`
    });
  }

  return syncs
}

export function onBidWon(bid) {
  if (bid.nurl) {
    const resolvedNurl = replaceAuctionPrice(bid.nurl, bid.price);
    ajax(resolvedNurl);
  }
}

function getBidFloorPrice(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidFloor', 0);
  }

  try {
    const bidFloorPrice = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloorPrice.floor;
  } catch (_) {
    return 0
  }
}

/* replacing auction_price macro from adm */
function macroReplace(adm, cpm) {
  let replacedadm = replaceAuctionPrice(adm, cpm);
  return replacedadm;
}

export function readFromAllStorages(name, storage) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  return fromCookie || fromLocalStorage || undefined;
}
