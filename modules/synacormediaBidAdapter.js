'use strict';

import { getAdUnitSizes, logWarn } from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';
import includes from 'core-js/library/fn/array/includes';

const BID_HOST = '//prebid.technoratimedia.com';
const USER_SYNC_HOST = '//ad-cdn.technoratimedia.com';
const VIDEO_PARAMS = [ 'minduration', 'maxduration' ];

export const spec = {
  code: 'synacormedia',
  supportedMediaTypes: [ BANNER, VIDEO ],
  sizeMap: {},

  isVideoBid: function(bid) {
    return bid.mediaTypes !== undefined &&
      bid.mediaTypes.hasOwnProperty('video');
  },
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
      let bidFloor = bid.params.bidfloor ? parseFloat(bid.params.bidfloor) : null;
      if (isNaN(bidFloor)) {
        logWarn(`Synacormedia: there is an invalid bid floor: ${bid.params.bidfloor}`);
      }
      let pos = parseInt(bid.params.pos);
      if (isNaN(pos)) {
        logWarn(`Synacormedia: there is an invalid POS: ${bid.params.pos}`);
        pos = 0;
      }
      let videoOrBannerKey = this.isVideoBid(bid) ? 'video' : 'banner';
      getAdUnitSizes(bid).forEach((size, i) => {
        if (!size || size.length != 2) {
          return;
        }
        let size0 = size[0];
        let size1 = size[1];
        let imp = {
          id: videoOrBannerKey.substring(0, 1) + bid.bidId + '-' + size0 + 'x' + size1,
          tagid: placementId
        };
        if (bidFloor !== null && !isNaN(bidFloor)) {
          imp.bidfloor = bidFloor;
        }

        let videoOrBannerValue = {
          w: size0,
          h: size1,
          pos
        };
        if (videoOrBannerKey === 'video' && bid.params.video) {
          Object.keys(bid.params.video)
            .filter(param => includes(VIDEO_PARAMS, param) && !isNaN(parseInt(bid.params.video[param], 10)))
            .forEach(param => videoOrBannerValue[param] = parseInt(bid.params.video[param], 10));
        }
        imp[videoOrBannerKey] = videoOrBannerValue;
        openRtbBidRequest.imp.push(imp);
      });
    });

    if (openRtbBidRequest.imp.length && seatId) {
      return {
        method: 'POST',
        url: `${BID_HOST}/openrtb/bids/${seatId}?src=$$REPO_AND_VERSION$$`,
        data: openRtbBidRequest,
        options: {
          contentType: 'application/json',
          withCredentials: true
        }
      };
    }
  },
  interpretResponse: function(serverResponse) {
    var updateMacros = (bid, r) => {
      return r ? r.replace(/\${AUCTION_PRICE}/g, parseFloat(bid.price)) : r;
    };

    if (!serverResponse.body || typeof serverResponse.body != 'object') {
      logWarn('Synacormedia: server returned empty/non-json response: ' + JSON.stringify(serverResponse.body));
      return;
    }

    const {id, seatbid: seatbids} = serverResponse.body;
    let bids = [];
    if (id && seatbids) {
      seatbids.forEach(seatbid => {
        seatbid.bid.forEach(bid => {
          let creative = updateMacros(bid, bid.adm);
          let nurl = updateMacros(bid, bid.nurl);
          let [, impType, impid, width, height] = bid.impid.match(/^([vb])(.*)-(.*)x(.*)$/);
          let isVideo = impType == 'v';
          let bidObj = {
            requestId: impid,
            adId: bid.id.replace(/~/g, '-'),
            cpm: parseFloat(bid.price),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
            creativeId: seatbid.seat + '_' + bid.crid,
            currency: 'USD',
            netRevenue: true,
            mediaType: (isVideo ? VIDEO : BANNER),
            ad: creative,
            ttl: 60
          };
          if (isVideo) {
            let [, uuid] = nurl.match(/ID=([^&]*)&?/);
            bidObj.videoCacheKey = encodeURIComponent(uuid);
            bidObj.vastUrl = nurl;
          }
          bids.push(bidObj);
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
        url: `${USER_SYNC_HOST}/html/usersync.html?src=$$REPO_AND_VERSION$$`
      });
    } else {
      logWarn('Synacormedia: Please enable iframe based user sync.');
    }
    return syncs;
  }
};

registerBidder(spec);
