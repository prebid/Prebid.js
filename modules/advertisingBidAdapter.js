'use strict';

import {deepAccess, deepSetValue, isFn, isPlainObject, logWarn, mergeDeep} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

import {config} from '../src/config.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';

const BID_SCHEME = 'https://';
const BID_DOMAIN = 'technoratimedia.com';
const USER_SYNC_IFRAME_URL = 'https://ad-cdn.technoratimedia.com/html/usersync.html';
const USER_SYNC_PIXEL_URL = 'https://sync.technoratimedia.com/services';
const VIDEO_PARAMS = [ 'minduration', 'maxduration', 'startdelay', 'placement', 'plcmt', 'linearity', 'mimes', 'protocols', 'api' ];
const BLOCKED_AD_SIZES = [
  '1x1',
  '1x2'
];
const DEFAULT_MAX_TTL = 420; // 7 minutes
export const spec = {
  code: 'advertising',
  aliases: [
    { code: 'synacormedia' },
    { code: 'imds' }
  ],
  supportedMediaTypes: [ BANNER, VIDEO ],
  sizeMap: {},

  isVideoBid: function(bid) {
    return bid.mediaTypes !== undefined &&
      bid.mediaTypes.hasOwnProperty('video');
  },
  isBidRequestValid: function(bid) {
    const hasRequiredParams = bid && bid.params && (bid.params.hasOwnProperty('placementId') || bid.params.hasOwnProperty('tagId')) && bid.params.hasOwnProperty('seatId');
    const hasAdSizes = bid && getAdUnitSizes(bid).filter(size => BLOCKED_AD_SIZES.indexOf(size.join('x')) === -1).length > 0
    return !!(hasRequiredParams && hasAdSizes);
  },

  buildRequests: function(validBidReqs, bidderRequest) {
    if (!validBidReqs || !validBidReqs.length || !bidderRequest) {
      return;
    }
    const refererInfo = bidderRequest.refererInfo;
    // start with some defaults, overridden by anything set in ortb2, if provided.
    const openRtbBidRequest = mergeDeep({
      id: bidderRequest.bidderRequestId,
      site: {
        domain: refererInfo.domain,
        page: refererInfo.page,
        ref: refererInfo.ref
      },
      device: {
        ua: navigator.userAgent
      },
      imp: []
    }, bidderRequest.ortb2 || {});

    const tmax = bidderRequest.timeout;
    if (tmax) {
      openRtbBidRequest.tmax = tmax;
    }

    const schain = validBidReqs[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      openRtbBidRequest.source = { ext: { schain } };
    }

    let seatId = null;

    validBidReqs.forEach((bid, i) => {
      if (seatId && seatId !== bid.params.seatId) {
        logWarn(`Advertising.com: there is an inconsistent seatId: ${bid.params.seatId} but only sending bid requests for ${seatId}, you should double check your configuration`);
        return;
      } else {
        seatId = bid.params.seatId;
      }
      const tagIdOrPlacementId = bid.params.tagId || bid.params.placementId;
      let pos = parseInt(bid.params.pos || deepAccess(bid.mediaTypes, 'video.pos'), 10);
      if (isNaN(pos)) {
        logWarn(`Advertising.com: there is an invalid POS: ${bid.params.pos}`);
        pos = 0;
      }
      const videoOrBannerKey = this.isVideoBid(bid) ? 'video' : 'banner';
      const adSizes = getAdUnitSizes(bid)
        .filter(size => BLOCKED_AD_SIZES.indexOf(size.join('x')) === -1);

      let imps = [];
      if (videoOrBannerKey === 'banner') {
        imps = this.buildBannerImpressions(adSizes, bid, tagIdOrPlacementId, pos, videoOrBannerKey);
      } else if (videoOrBannerKey === 'video') {
        imps = this.buildVideoImpressions(adSizes, bid, tagIdOrPlacementId, pos, videoOrBannerKey);
      }
      if (imps.length > 0) {
        imps.forEach(i => {
          // Deeply add ext section to all imp[] for GPID, prebid slot id, and anything else down the line
          const extSection = deepAccess(bid, 'ortb2Imp.ext');
          if (extSection) {
            deepSetValue(i, 'ext', extSection);
          }

          // Add imp[] to request object
          openRtbBidRequest.imp.push(i);
        });
      }
    });

    // Move us_privacy from regs.ext to regs if there isn't already a us_privacy in regs
    if (openRtbBidRequest.regs?.ext?.us_privacy && !openRtbBidRequest.regs?.us_privacy) {
      deepSetValue(openRtbBidRequest, 'regs.us_privacy', openRtbBidRequest.regs.ext.us_privacy);
    }

    // Remove regs.ext.us_privacy
    if (openRtbBidRequest.regs?.ext?.us_privacy) {
      delete openRtbBidRequest.regs.ext.us_privacy;
      if (Object.keys(openRtbBidRequest.regs.ext).length < 1) {
        delete openRtbBidRequest.regs.ext;
      }
    }

    // User ID
    if (validBidReqs[0] && validBidReqs[0].userIdAsEids && Array.isArray(validBidReqs[0].userIdAsEids)) {
      const eids = validBidReqs[0].userIdAsEids;
      if (eids.length) {
        deepSetValue(openRtbBidRequest, 'user.ext.eids', eids);
      }
    }

    if (openRtbBidRequest.imp.length && seatId) {
      return {
        method: 'POST',
        url: `${BID_SCHEME}${seatId}.${BID_DOMAIN}/openrtb/bids/${seatId}?src=pbjs%2F$prebid.version$`,
        data: openRtbBidRequest,
        options: {
          contentType: 'application/json',
          withCredentials: true
        }
      };
    }
  },

  buildBannerImpressions: function (adSizes, bid, tagIdOrPlacementId, pos, videoOrBannerKey) {
    const format = [];
    const imps = [];
    adSizes.forEach((size, i) => {
      if (!size || size.length !== 2) {
        return;
      }

      format.push({
        w: size[0],
        h: size[1],
      });
    });

    if (format.length > 0) {
      const imp = {
        id: `${videoOrBannerKey.substring(0, 1)}${bid.bidId}`,
        banner: {
          format,
          pos
        },
        tagid: tagIdOrPlacementId,
      };
      const bidFloor = getBidFloor(bid, 'banner', '*');
      if (isNaN(bidFloor)) {
        logWarn(`Advertising.com: there is an invalid bid floor: ${bid.params.bidfloor}`);
      }
      if (bidFloor !== null && !isNaN(bidFloor)) {
        imp.bidfloor = bidFloor;
      }
      imps.push(imp);
    }
    return imps;
  },

  buildVideoImpressions: function(adSizes, bid, tagIdOrPlacementId, pos, videoOrBannerKey) {
    const imps = [];
    adSizes.forEach((size, i) => {
      if (!size || size.length !== 2) {
        return;
      }
      const size0 = size[0];
      const size1 = size[1];
      const imp = {
        id: `${videoOrBannerKey.substring(0, 1)}${bid.bidId}-${size0}x${size1}`,
        tagid: tagIdOrPlacementId
      };
      const bidFloor = getBidFloor(bid, 'video', size);
      if (isNaN(bidFloor)) {
        logWarn(`Advertising.com: there is an invalid bid floor: ${bid.params.bidfloor}`);
      }

      if (bidFloor !== null && !isNaN(bidFloor)) {
        imp.bidfloor = bidFloor;
      }

      const videoOrBannerValue = {
        w: size0,
        h: size1,
        pos
      };
      if (bid.mediaTypes.video) {
        if (!bid.params.video) {
          bid.params.video = {};
        }
        this.setValidVideoParams(bid.mediaTypes.video, bid.params.video);
      }
      if (bid.params.video) {
        this.setValidVideoParams(bid.params.video, videoOrBannerValue);
      }
      imp[videoOrBannerKey] = videoOrBannerValue;
      imps.push(imp);
    });
    return imps;
  },

  setValidVideoParams: function (sourceObj, destObj) {
    Object.keys(sourceObj)
      .filter(param => VIDEO_PARAMS.includes(param) && sourceObj[param] !== null && (!isNaN(parseInt(sourceObj[param], 10)) || !(sourceObj[param].length < 1)))
      .forEach(param => {
        destObj[param] = Array.isArray(sourceObj[param]) ? sourceObj[param] : parseInt(sourceObj[param], 10);
      });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const updateMacros = (bid, r) => {
      return r ? r.replace(/\${AUCTION_PRICE}/g, bid.price) : r;
    };

    if (!serverResponse.body || typeof serverResponse.body !== 'object') {
      return;
    }
    const {id, seatbid: seatbids} = serverResponse.body;
    const bids = [];
    if (id && seatbids) {
      seatbids.forEach(seatbid => {
        seatbid.bid.forEach(bid => {
          const creative = updateMacros(bid, bid.adm);
          const nurl = updateMacros(bid, bid.nurl);
          const [, impType, impid] = bid.impid.match(/^([vb])(.*)$/);
          let height = bid.h;
          let width = bid.w;
          const isVideo = impType === 'v';
          const isBanner = impType === 'b';
          if ((!height || !width) && bidRequest.data && bidRequest.data.imp && bidRequest.data.imp.length > 0) {
            bidRequest.data.imp.forEach(req => {
              if (bid.impid === req.id) {
                if (isVideo) {
                  height = req.video.h;
                  width = req.video.w;
                } else if (isBanner) {
                  let bannerHeight = 1;
                  let bannerWidth = 1;
                  if (req.banner.format && req.banner.format.length > 0) {
                    bannerHeight = req.banner.format[0].h;
                    bannerWidth = req.banner.format[0].w;
                  }
                  height = bannerHeight;
                  width = bannerWidth;
                } else {
                  height = 1;
                  width = 1;
                }
              }
            });
          }

          let maxTtl = DEFAULT_MAX_TTL;
          if (bid.ext && bid.ext['imds.tv'] && bid.ext['imds.tv'].ttl) {
            const bidTtlMax = parseInt(bid.ext['imds.tv'].ttl, 10);
            maxTtl = !isNaN(bidTtlMax) && bidTtlMax > 0 ? bidTtlMax : DEFAULT_MAX_TTL;
          }

          let ttl = maxTtl;
          if (bid.exp) {
            const bidTtl = parseInt(bid.exp, 10);
            ttl = !isNaN(bidTtl) && bidTtl > 0 ? Math.min(bidTtl, maxTtl) : maxTtl;
          }

          const bidObj = {
            requestId: impid,
            cpm: parseFloat(bid.price),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
            creativeId: `${seatbid.seat}_${bid.crid}`,
            currency: 'USD',
            netRevenue: true,
            mediaType: isVideo ? VIDEO : BANNER,
            ad: creative,
            ttl,
          };

          if (bid.adomain !== undefined && bid.adomain !== null) {
            bidObj.meta = { advertiserDomains: bid.adomain };
          }

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
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    const queryParams = ['src=pbjs%2F$prebid.version$'];
    if (gdprConsent) {
      queryParams.push(`gdpr=${Number(gdprConsent.gdprApplies && 1)}&consent=${encodeURIComponent(gdprConsent.consentString || '')}`);
    }
    if (uspConsent) {
      queryParams.push('us_privacy=' + encodeURIComponent(uspConsent));
    }
    if (gppConsent) {
      queryParams.push('gpp=' + encodeURIComponent(gppConsent.gppString || '') + '&gppsid=' + encodeURIComponent((gppConsent.applicableSections || []).join(',')));
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${USER_SYNC_IFRAME_URL}?${queryParams.join('&')}`
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `${USER_SYNC_PIXEL_URL}?srv=cs&${queryParams.join('&')}`
      });
    }

    return syncs;
  }
};

function getBidFloor(bid, mediaType, size) {
  if (!isFn(bid.getFloor)) {
    return bid.params.bidfloor ? parseFloat(bid.params.bidfloor) : null;
  }
  const floor = bid.getFloor({
    currency: 'USD',
    mediaType,
    size
  });

  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

registerBidder(spec);
