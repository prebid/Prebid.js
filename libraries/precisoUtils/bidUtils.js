import { convertOrtbRequestToProprietaryNative } from '../../src/native.js';
import { replaceAuctionPrice, deepAccess, logInfo } from '../../src/utils.js';
import { ajax } from '../../src/ajax.js';
import { NATIVE } from '../../src/mediaTypes.js';
import { consentCheck, getBidFloor } from './bidUtilsCommon.js';

export const buildRequests = (endpoint) => (validBidRequests = [], bidderRequest) => {
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  var city = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let req = {
    id: validBidRequests[0].auctionId,
    imp: validBidRequests.map(slot => mapImpression(slot, bidderRequest)),
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

function macroReplace(adm, cpm) {
  let replacedadm = replaceAuctionPrice(adm, cpm);
  return replacedadm;
}

function mapImpression(slot, bidderRequest) {
  const imp = {
    id: slot.bidId,
    bidFloor: getBidFloor(slot),
  };

  if (slot.mediaType === 'native' || deepAccess(slot, 'mediaTypes.native')) {
    imp.native = mapNative(slot)
  } else {
    imp.banner = mapBanner(slot)
  }
  return imp
}

function mapNative(slot) {
  if (slot.mediaType === 'native' || deepAccess(slot, 'mediaTypes.native')) {
    let request = {
      assets: slot.nativeOrtbRequest.assets || slot.nativeParams.ortb.assets,
      ver: '1.2'
    };
    return {
      request: JSON.stringify(request)
    }
  }
}

function mapBanner(slot) {
  if (slot.mediaTypes.banner) {
    let format = (slot.mediaTypes.banner.sizes || slot.sizes).map(size => {
      return { w: size[0], h: size[1] }
    });

    return {
      format
    }
  }
}

export function buildBidResponse(serverResponse) {
  const responseBody = serverResponse.body;
  const bids = [];
  responseBody.seatbid.forEach(seat => {
    seat.bid.forEach(serverBid => {
      if (!serverBid.price) {
        return;
      }
      if (serverBid.adm.indexOf('{') === 0) {
        bids.push({
          requestId: serverBid.impid,
          mediaType: NATIVE,
          cpm: serverBid.price,
          creativeId: serverBid.crid,
          width: 1,
          height: 1,
          ttl: 300,
          meta: {
            advertiserDomains: serverBid.adomain
          },
          netRevenue: true,
          currency: 'USD',
          native: interpretNativeAd(macroReplace(serverBid.adm, serverBid.price)),
        });
      } else {
        bids.push({
          requestId: serverBid.impid,
          cpm: serverBid.price,
          width: serverBid.w,
          height: serverBid.h,
          creativeId: serverBid.crid,
          ad: macroReplace(serverBid.adm, serverBid.price),
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          meta: {
            advertiserDomains: serverBid.adomain || '',
          },
        });
      }
    })
  });
  return bids;
}

function interpretNativeAd(adm) {
  try {
    const native = JSON.parse(adm).native;
    if (native) {
      const result = {
        clickUrl: encodeURI(native.link.url),
        impressionTrackers: native.eventtrackers[0].url,
        clickTrackers: native.link.clicktrackers[0]

      };
      native.assets.forEach(asset => {
        switch (asset.id) {
          case OPENRTB.NATIVE.ASSET_ID.TITLE:
            result.title = deepAccess(asset, 'title.text');
            break;
          case OPENRTB.NATIVE.ASSET_ID.IMAGE:
            result.image = {
              url: encodeURI(asset.img.url),
              width: deepAccess(asset, 'img.w') || 300,
              height: deepAccess(asset, 'img.h') || 250
            };
            break;
          case OPENRTB.NATIVE.ASSET_ID.ICON:
            result.icon = {
              url: encodeURI(asset.img.url),
              width: deepAccess(asset, 'img.w') || 10,
              height: deepAccess(asset, 'img.h') || 10
            };
            break;
          case OPENRTB.NATIVE.ASSET_ID.DATA:
            result.body = deepAccess(asset, 'data.value');
            break;
          case OPENRTB.NATIVE.ASSET_ID.SPONSORED:
            result.sponsoredBy = deepAccess(asset, 'data.value');
            break;
          case OPENRTB.NATIVE.ASSET_ID.CTA:
            result.cta = deepAccess(asset, 'data.value');
            break;
        }
      });
      return result;
    }
  } catch (error) {
    logInfo('Error in bidUtils interpretNativeAd' + error);
  }
}

export const OPENRTB = {
  NATIVE: {
    IMAGE_TYPE: {
      ICON: 1,
      MAIN: 3,
    },
    ASSET_ID: {
      TITLE: 1,
      IMAGE: 3,
      ICON: 2,
      DATA: 4,
      SPONSORED: 5,
      CTA: 6
    },
    DATA_ASSET_TYPE: {
      SPONSORED: 1,
      DESC: 2,
      CTA_TEXT: 12,
    },
  }
};
