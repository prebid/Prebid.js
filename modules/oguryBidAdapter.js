'use strict';

import { BANNER } from '../src/mediaTypes.js';
import { getAdUnitSizes, logWarn, isFn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'ogury';
const DEFAULT_TIMEOUT = 1000;
const BID_HOST = 'https://webmobile.presage.io/api/header-bidding-request';

function isBidRequestValid(bid) {
  const adUnitSizes = getAdUnitSizes(bid);

  const isValidSizes = Boolean(adUnitSizes) && adUnitSizes.length > 0;
  const isValidAdUnitId = !!bid.params.adUnitId;
  const isValidAssetKey = !!bid.params.assetKey;

  return (isValidSizes && isValidAdUnitId && isValidAssetKey);
}

function buildRequests(validBidRequests, bidderRequest) {
  const openRtbBidRequestBanner = {
    id: bidderRequest.auctionId,
    tmax: DEFAULT_TIMEOUT,
    at: 2,
    regs: {
      ext: {
        gdpr: 1
      },
    },
    site: {
      domain: location.hostname
    },
    user: {
      ext: {
        consent: ''
      }
    },
    imp: []
  };

  if (bidderRequest.hasOwnProperty('gdprConsent') &&
    bidderRequest.gdprConsent.hasOwnProperty('gdprApplies')) {
    openRtbBidRequestBanner.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0
  }

  if (bidderRequest.hasOwnProperty('gdprConsent') &&
    bidderRequest.gdprConsent.hasOwnProperty('consentString') &&
    bidderRequest.gdprConsent.consentString.length > 0) {
    openRtbBidRequestBanner.user.ext.consent = bidderRequest.gdprConsent.consentString
  }

  validBidRequests.forEach((bidRequest) => {
    const sizes = getAdUnitSizes(bidRequest)
      .map(size => ({ w: size[0], h: size[1] }));

    if (bidRequest.hasOwnProperty('mediaTypes') &&
      bidRequest.mediaTypes.hasOwnProperty('banner')) {
      openRtbBidRequestBanner.site.id = bidRequest.params.assetKey;

      openRtbBidRequestBanner.imp.push({
        id: bidRequest.bidId,
        tagid: bidRequest.params.adUnitId,
        bidfloor: getFloor(bidRequest),
        banner: {
          format: sizes
        }
      });
    }
  });

  return {
    method: 'POST',
    url: BID_HOST,
    data: openRtbBidRequestBanner
  };
}

function interpretResponse(openRtbBidResponse) {
  if (!openRtbBidResponse ||
    !openRtbBidResponse.body ||
    typeof openRtbBidResponse.body != 'object' ||
    Object.keys(openRtbBidResponse.body).length === 0) {
    logWarn('no response or body is malformed');
    return [];
  }

  const bidResponses = [];

  openRtbBidResponse.body.seatbid.forEach((seatbid) => {
    seatbid.bid.forEach((bid) => {
      let bidResponse = {
        requestId: bid.impid,
        cpm: bid.price,
        currency: 'USD',
        width: bid.w,
        height: bid.h,
        creativeId: bid.id,
        netRevenue: true,
        ttl: 60,
        meta: {
          advertiserDomains: bid.adomain
        }
      };

      bidResponse.ad = bid.adm;

      bidResponses.push(bidResponse);
    });
  });
  return bidResponses;
}

function getFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return 0;
  }
  let floorResult = bid.getFloor({
    currency: 'USD',
    mediaType: 'banner',
    size: '*'
  });
  return floorResult.currency === 'USD' ? floorResult.floor : 0;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getFloor
}

registerBidder(spec);
