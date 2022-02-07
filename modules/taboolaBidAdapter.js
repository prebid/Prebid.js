// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'taboola';
const GVLID = 42;
const CURRENCY = 'USD';
const END_POINT_URL = 'http://taboolahb.bidder.taboolasyndication.com'

export const spec = {
  supportedMediaTypes: [BANNER],
  gvlid: GVLID,
  code: BIDDER_CODE,
  isBidRequestValid: (bidRequest) => {
    return !!(bidRequest.sizes &&
           bidRequest.params &&
           bidRequest.params.publisherId &&
           bidRequest.params.tagId);
  },
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    return [];
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const [bidRequest] = validBidRequests;
    const {bcat = [], badv = [], publisherId} = bidRequest.params;
    const site = getSiteProperties(bidRequest.params, bidderRequest.refererInfo.referer);
    const device = {ua: navigator.userAgent};
    const timeout = bidderRequest.timeout;
    const imps = getImps(validBidRequests);

    const request = {
      id: bidderRequest.auctionId,
      imp: imps,
      site,
      device,
      source: {fd: 1},
      tmax: timeout,
      bcat: bcat,
      badv: badv
    };
    const url = [END_POINT_URL, publisherId].join('?p=');

    return {
      url,
      method: 'POST',
      data: JSON.stringify(request),
      bids: validBidRequests
    };
  },
  interpretResponse: (serverResponse, {bids}) => {
    if (!bids) {
      return [];
    }

    const {bidResponses, cur: currency} = getBidResponses(serverResponse);

    if (!bidResponses) {
      return [];
    }

    return bids.map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (!bidResponse) {
        return;
      }

      const {price: cpm, crid: creativeId, adm: ad, w: width, h: height, adomain: advertiserDomains, meta = {}
      } = bidResponse;

      if (advertiserDomains && advertiserDomains.length > 0) {
        meta.advertiserDomains = advertiserDomains
      }

      return {
        requestId: bid.bidId,
        ttl: 360,
        mediaType: BANNER,
        cpm,
        creativeId,
        currency,
        ad,
        width,
        height,
        meta,
        netRevenue: false
      };
    }).filter(Boolean);
  },
};

registerBidder(spec);

function getSiteProperties({publisherId, bcat = []}, page) {
  return {
    id: publisherId,
    name: publisherId,
    domain: window.location.host,
    page,
    cat: bcat,
    publisher: {
      id: publisherId
    },
    content: {
      language: navigator.language
    }
  }
}

function getImps(validBidRequests) {
  return validBidRequests.map((bid, id) => {
    const {tagId, bidfloor = null, bidfloorcur = CURRENCY} = bid.params;

    return {
      id: id + 1,
      banner: getBanners(bid),
      tagid: tagId,
      bidfloor,
      bidfloorcur,
    };
  });
}

function getBanners(bid) {
  return getSizes(bid.sizes);
}

function getSizes(sizes) {
  return sizes.map(size => {
    return {
      h: size[0],
      w: size[1]
    }
  })
}

function getBidResponses({body}) {
  if (!body || (body && !body.bidResponse)) {
    return [];
  }

  const {seatbid, cur} = body.bidResponse;

  if (!seatbid.length && !seatbid[0] && seatbid[0].bids) {
    return [];
  }

  return {
    bidResponses: seatbid[0].bid,
    cur
  };
}
