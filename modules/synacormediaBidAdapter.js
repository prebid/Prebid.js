'use strict';

import { getAdUnitSizes, logWarn } from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
import { REPO_AND_VERSION } from '../src/constants';

const SYNACOR_URL = '//prebid.technoratimedia.com';
export const spec = {
  code: 'synacormedia',
  supportedMediaTypes: [ BANNER ],
  sizeMap: {},

  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.placementId && bid.params.seatId);
  },
  buildRequests: function(validBidReqs, bidderRequest) {
    if (!validBidReqs || !validBidReqs.length || !bidderRequest) {
      return;
    }
    let refererInfo = bidderRequest.refererInfo;
    let openRtbBidRequest = {
      id: bidderRequest.auctionId,
      site: {
        domain: location.hostname,
        page: refererInfo.referer,
        ref: document.referrer
      },
      device: {
        ua: navigator.userAgent
      },
      imp: []
    };
    let seatId = null;
    validBidReqs.forEach((bid, i) => {
      if (seatId && seatId !== bid.params.seatId) {
        logWarn(`Synacormedia: there is an inconsistent seatId: ${bid.params.seatId} but only sending bid requests for ${seatId}, you should double check your configuration`);
        return;
      } else {
        seatId = bid.params.seatId;
      }
      let placementId = bid.params.placementId;
      let size = getAdUnitSizes(bid)[0];
      this.sizeMap[bid.bidId] = size;
      openRtbBidRequest.imp.push({
        id: bid.bidId,
        tagid: placementId,
        banner: {
          w: size[0],
          h: size[1],
          pos: 0
        }
      });
    });
    if (openRtbBidRequest.imp.length && seatId) {
      return {
        method: 'POST',
        url: `${SYNACOR_URL}/openrtb/bids/${seatId}?src=${REPO_AND_VERSION}`,
        data: openRtbBidRequest,
        options: {
          contentType: 'application/json',
          withCredentials: true
        }
      };
    }
  },
  interpretResponse: function(serverResponse) {
    if (!serverResponse.body || typeof serverResponse.body != 'object') {
      logWarn('Synacormedia: server returned empty/non-json response: ' + JSON.stringify(serverResponse.body));
      return;
    }
    const {id, seatbid: seatbids} = serverResponse.body;
    let bids = [];
    if (id && seatbids) {
      seatbids.forEach(seatbid => {
        seatbid.bid.forEach(bid => {
          let size = this.sizeMap[bid.impid] || [0, 0];
          let price = parseFloat(bid.price);
          let creative = bid.adm.replace(/\${([^}]*)}/g, (match, key) => {
            switch (key) {
              case 'AUCTION_SEAT_ID': return seatbid.seat;
              case 'AUCTION_ID': return id;
              case 'AUCTION_BID_ID': return bid.id;
              case 'AUCTION_IMP_ID': return bid.impid;
              case 'AUCTION_PRICE': return price;
              case 'AUCTION_CURRENCY': return 'USD';
            }
            return match;
          });
          bids.push({
            requestId: bid.impid,
            cpm: price,
            width: size[0],
            height: size[1],
            creativeId: seatbid.seat + '~' + bid.crid,
            currency: 'USD',
            netRevenue: true,
            mediaType: BANNER,
            ad: creative,
            ttl: 60
          });
        });
      });
    }
    return bids;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${SYNACOR_URL}/usersync/html?src=${REPO_AND_VERSION}`
      });
    } else {
      logWarn('Synacormedia: Please enable iframe based user sync.');
    }
    return syncs;
  }
};

registerBidder(spec);
