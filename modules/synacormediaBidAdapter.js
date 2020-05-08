'use strict';

import { getAdUnitSizes, logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import includes from 'core-js-pure/features/array/includes.js';
import {config} from '../src/config.js';

const BID_HOST = 'https://prebid.technoratimedia.com';
const USER_SYNC_HOST = 'https://ad-cdn.technoratimedia.com';
const VIDEO_PARAMS = [ 'minduration', 'maxduration', 'startdelay', 'placement', 'linearity', 'mimes', 'protocols', 'api' ];
const BLOCKED_AD_SIZES = [
  '1x1',
  '1x2'
];
export const spec = {
  code: 'synacormedia',
  supportedMediaTypes: [ BANNER, VIDEO ],
  sizeMap: {},

  isVideoBid: function(bid) {
    return bid.mediaTypes !== undefined &&
      bid.mediaTypes.hasOwnProperty('video');
  },
  isBidRequestValid: function(bid) {
    const hasRequiredParams = bid && bid.params && bid.params.hasOwnProperty('placementId') && bid.params.hasOwnProperty('seatId');
    const hasAdSizes = bid && getAdUnitSizes(bid).filter(size => BLOCKED_AD_SIZES.indexOf(size.join('x')) === -1).length > 0
    return !!(hasRequiredParams && hasAdSizes);
  },

  buildRequests: function(validBidReqs, bidderRequest) {
    if (!validBidReqs || !validBidReqs.length || !bidderRequest) {
      return;
    }
    const refererInfo = bidderRequest.refererInfo;
    const openRtbBidRequest = {
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

    const schain = validBidReqs[0].schain;
    if (schain) {
      openRtbBidRequest.source = { ext: { schain } };
    }

    let seatId = null;

    validBidReqs.forEach((bid, i) => {
      if (seatId && seatId !== bid.params.seatId) {
        logWarn(`Synacormedia: there is an inconsistent seatId: ${bid.params.seatId} but only sending bid requests for ${seatId}, you should double check your configuration`);
        return;
      } else {
        seatId = bid.params.seatId;
      }
      const placementId = bid.params.placementId;
      const bidFloor = bid.params.bidfloor ? parseFloat(bid.params.bidfloor) : null;
      if (isNaN(bidFloor)) {
        logWarn(`Synacormedia: there is an invalid bid floor: ${bid.params.bidfloor}`);
      }
      let pos = parseInt(bid.params.pos, 10);
      if (isNaN(pos)) {
        logWarn(`Synacormedia: there is an invalid POS: ${bid.params.pos}`);
        pos = 0;
      }
      const videoOrBannerKey = this.isVideoBid(bid) ? 'video' : 'banner';
      getAdUnitSizes(bid)
        .filter(size => BLOCKED_AD_SIZES.indexOf(size.join('x')) === -1)
        .forEach((size, i) => {
          if (!size || size.length != 2) {
            return;
          }
          const size0 = size[0];
          const size1 = size[1];
          const imp = {
            id: `${videoOrBannerKey.substring(0, 1)}${bid.bidId}-${size0}x${size1}`,
            tagid: placementId
          };
          if (bidFloor !== null && !isNaN(bidFloor)) {
            imp.bidfloor = bidFloor;
          }

          const videoOrBannerValue = {
            w: size0,
            h: size1,
            pos
          };
          if (videoOrBannerKey === 'video') {
            if (bid.mediaTypes.video) {
              this.setValidVideoParams(bid.mediaTypes.video, bid.params.video);
            }
            if (bid.params.video) {
              this.setValidVideoParams(bid.params.video, videoOrBannerValue);
            }
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

  setValidVideoParams: function (sourceObj, destObj) {
    Object.keys(sourceObj)
      .filter(param => includes(VIDEO_PARAMS, param) && sourceObj[param] !== null && (!isNaN(parseInt(sourceObj[param], 10)) || !(sourceObj[param].length < 1)))
      .forEach(param => destObj[param] = Array.isArray(sourceObj[param]) ? sourceObj[param] : parseInt(sourceObj[param], 10));
  },
  interpretResponse: function(serverResponse) {
    const updateMacros = (bid, r) => {
      return r ? r.replace(/\${AUCTION_PRICE}/g, bid.price) : r;
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
          const creative = updateMacros(bid, bid.adm);
          const nurl = updateMacros(bid, bid.nurl);
          const [, impType, impid, width, height] = bid.impid.match(/^([vb])(.*)-(.*)x(.*)$/);
          const isVideo = impType == 'v';
          const bidObj = {
            requestId: impid,
            adId: bid.id.replace(/~/g, '-'),
            cpm: parseFloat(bid.price),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
            creativeId: `${seatbid.seat}_${bid.crid}`,
            currency: 'USD',
            netRevenue: true,
            mediaType: isVideo ? VIDEO : BANNER,
            ad: creative,
            ttl: 60
          };
          if (isVideo) {
            const [, uuid] = nurl.match(/ID=([^&]*)&?/);
            if (!config.getConfig('cache.url')) {
              bidObj.videoCacheKey = encodeURIComponent(uuid);
            }
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
