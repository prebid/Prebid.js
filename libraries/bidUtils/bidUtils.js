import { convertOrtbRequestToProprietaryNative } from '../../src/native.js';
import { replaceAuctionPrice } from '../../src/utils.js';
import { getStorageManager } from '../../src/storageManager.js';
import { ajax } from '../../src/ajax.js';
import { config } from '../../src/config.js';
import { MODULE_TYPE_UID } from '../../src/activities/modules.js';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'sharedId' });

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
      country: req.user.geo.country
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

export const buildUserSyncs = (syncEndpoint) => (syncOptions, serverResponses, gdprConsent, uspConsent) => {
  let syncType = syncOptions.iframeEnabled ? 'iframe' : 'image';
  const isCk2trk = syncEndpoint.includes('ck.2trk.info');
  const isSpec = syncOptions.spec;
  if (isCk2trk) {
    if (!Object.is(isSpec, true)) {
      let syncId = storage.getCookie('_sharedid');
      syncEndpoint = syncEndpoint + 'id=' + syncId;
    } else {
      syncEndpoint = syncEndpoint + 'id=NA';
    }
  }
  // Base sync URL
  let syncUrl = isCk2trk ? syncEndpoint : `${syncEndpoint}/${syncType}?pbjs=1`;

  if (gdprConsent && gdprConsent.consentString) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      syncUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      syncUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
    }
  } else {
    syncUrl += isCk2trk ? `&gdpr=0&gdpr_consent=` : '';
  }

  if (isCk2trk) {
    syncUrl += uspConsent ? `&us_privacy=${uspConsent}` : `&us_privacy=`;
    syncUrl += (syncOptions.iframeEnabled) ? `&t=4` : `&t=2`
  } else {
    if (uspConsent && uspConsent.consentString) {
      syncUrl += `&ccpa_consent=${uspConsent.consentString}`;
    }
    const coppa = config.getConfig('coppa') ? 1 : 0;
    syncUrl += `&coppa=${coppa}`;
  }

  return [{
    type: syncType,
    url: syncUrl
  }];
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

export function consentCheck(bidderRequest, req) {
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
}
