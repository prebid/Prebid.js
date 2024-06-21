import { convertOrtbRequestToProprietaryNative } from '../../src/native.js';
import { isFn, deepAccess, replaceAuctionPrice } from '../../src/utils.js';
import {ajax} from '../../src/ajax.js';
import { getStorageManager } from '../../src/storageManager.js';
import { MODULE_TYPE_UID } from '../../src/activities/modules.js';

const COOKIE_NAME = '_sharedid';
const AD_URL = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
// const AD_URL = 'http://localhost:80/bid_request/openrtb';
const URL_SYNC = 'https://ck.2trk.info/rtb/user/usersync.aspx?';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'sharedId' });

export function buildRequests(validBidRequests = [], bidderRequest) {
  // convert Native ORTB definition to old-style prebid native definition
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  // if (validBidRequests !== 'undefined' && validBidRequests.length > 0) {
  //   userId = validBidRequests[0].userId.pubcid;
  // }
  // let winTop = window;
  // let location;
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
    url: AD_URL,
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
export function getUserSyncs (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  // let userId = sharedId;
  let userId = readFromAllStorages(COOKIE_NAME);
  let syncs = [];
  let { gdprApplies, consentString = '' } = gdprConsent;

  // if (serverResponses.length > 0) {
  //   logInfo('preciso bidadapter getusersync serverResponses:' + serverResponses.toString);
  // }
  if (syncOptions.iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: `${URL_SYNC}id=${userId}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=4`
    });
  } else {
    syncs.push({
      type: 'image',
      url: `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&us_privacy=${uspConsent}&t=2`
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

export function readFromAllStorages(name) {
  const fromCookie = storage.getCookie(name);
  const fromLocalStorage = storage.getDataFromLocalStorage(name);

  return fromCookie || fromLocalStorage || undefined;
}
