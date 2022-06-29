/**
 * Adapter to send bids to Undertone
 */

import {deepAccess, parseUrl} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'undertone';
const URL = 'https://hb.undertone.com/hb';
const FRAME_USER_SYNC = 'https://cdn.undertone.com/js/usersync.html';
const PIXEL_USER_SYNC_1 = 'https://usr.undertone.com/userPixel/syncOne?id=1&of=2';
const PIXEL_USER_SYNC_2 = 'https://usr.undertone.com/userPixel/syncOne?id=2&of=2';

function getBidFloor(bidRequest, mediaType) {
  if (typeof bidRequest.getFloor !== 'function') {
    return 0;
  }

  const floor = bidRequest.getFloor({
    currency: 'USD',
    mediaType: mediaType,
    size: '*'
  });

  return (floor && floor.currency === 'USD' && floor.floor) || 0;
}

function extractDomainFromHost(pageHost) {
  let domain = null;
  try {
    let domains = /[-\w]+\.([-\w]+|[-\w]{3,}|[-\w]{1,3}\.[-\w]{2})$/i.exec(pageHost);
    if (domains != null && domains.length > 0) {
      domain = domains[0];
      for (let i = 1; i < domains.length; i++) {
        if (domains[i].length > domain.length) {
          domain = domains[i];
        }
      }
    }
  } catch (e) {
    domain = null;
  }
  return domain;
}

function getGdprQueryParams(gdprConsent) {
  if (!gdprConsent) {
    return null;
  }

  let gdpr = gdprConsent.gdprApplies ? '1' : '0';
  let gdprstr = gdprConsent.consentString ? gdprConsent.consentString : '';
  return `gdpr=${gdpr}&gdprstr=${gdprstr}`;
}

function getBannerCoords(id) {
  let element = document.getElementById(id);
  let left = -1;
  let top = -1;
  if (element) {
    left = element.offsetLeft;
    top = element.offsetTop;

    let parent = element.offsetParent;
    if (parent) {
      left += parent.offsetLeft;
      top += parent.offsetTop;
    }

    return [left, top];
  } else {
    return null;
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    if (bid && bid.params && bid.params.publisherId) {
      bid.params.publisherId = parseInt(bid.params.publisherId);
      return true;
    }
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const pageSizeArray = vw == 0 || vh == 0 ? null : [vw, vh];
    const commons = {
      'adapterVersion': '$prebid.version$',
      'uids': validBidRequests[0].userId,
      'pageSize': pageSizeArray
    };
    if (validBidRequests[0].schain) {
      commons.schain = validBidRequests[0].schain;
    }
    const payload = {
      'x-ut-hb-params': [],
      'commons': commons
    };
    const referer = bidderRequest.refererInfo.topmostLocation;
    const canonicalUrl = bidderRequest.refererInfo.canonicalUrl;
    if (referer) {
      commons.referrer = referer;
    }
    if (canonicalUrl) {
      commons.canonicalUrl = canonicalUrl;
    }
    const hostname = parseUrl(referer).hostname;
    let domain = extractDomainFromHost(hostname);
    const pageUrl = canonicalUrl || referer;

    const pubid = validBidRequests[0].params.publisherId;
    let reqUrl = `${URL}?pid=${pubid}&domain=${domain}`;

    let gdprParams = getGdprQueryParams(bidderRequest.gdprConsent);
    if (gdprParams) {
      reqUrl += `&${gdprParams}`;
    }

    if (bidderRequest.uspConsent) {
      reqUrl += `&ccpa=${bidderRequest.uspConsent}`;
    }

    validBidRequests.map(bidReq => {
      const bid = {
        bidRequestId: bidReq.bidId,
        coordinates: getBannerCoords(bidReq.adUnitCode),
        hbadaptor: 'prebid',
        url: pageUrl,
        domain: domain,
        placementId: bidReq.params.placementId != undefined ? bidReq.params.placementId : null,
        publisherId: bidReq.params.publisherId,
        sizes: bidReq.sizes,
        params: bidReq.params
      };
      const videoMediaType = deepAccess(bidReq, 'mediaTypes.video');
      const mediaType = videoMediaType ? VIDEO : BANNER;
      bid.mediaType = mediaType;
      bid.bidfloor = getBidFloor(bidReq, mediaType);
      if (videoMediaType) {
        bid.video = {
          playerSize: deepAccess(bidReq, 'mediaTypes.video.playerSize') || null,
          streamType: deepAccess(bidReq, 'mediaTypes.video.context') || null,
          playbackMethod: deepAccess(bidReq, 'params.video.playbackMethod') || null,
          maxDuration: deepAccess(bidReq, 'params.video.maxDuration') || null,
          skippable: deepAccess(bidReq, 'params.video.skippable') || null
        };
      }
      payload['x-ut-hb-params'].push(bid);
    });

    return {
      method: 'POST',
      url: reqUrl,
      withCredentials: true,
      data: JSON.stringify(payload)
    };
  },
  interpretResponse: function(serverResponse, request) {
    const bids = [];
    const body = serverResponse.body;

    if (body && Array.isArray(body) && body.length > 0) {
      body.forEach((bidRes) => {
        if (bidRes.ad && bidRes.cpm > 0) {
          const bid = {
            requestId: bidRes.bidRequestId,
            cpm: bidRes.cpm,
            width: bidRes.width,
            height: bidRes.height,
            creativeId: bidRes.adId,
            currency: bidRes.currency,
            netRevenue: bidRes.netRevenue,
            ttl: bidRes.ttl || 360,
            meta: { advertiserDomains: bidRes.adomain ? bidRes.adomain : [] }
          };
          if (bidRes.mediaType && bidRes.mediaType === 'video') {
            bid.vastXml = bidRes.ad;
            bid.mediaType = bidRes.mediaType;
          } else {
            bid.ad = bidRes.ad
          }
          bids.push(bid);
        }
      });
    }
    return bids;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, usPrivacy) {
    const syncs = [];

    let gdprParams = getGdprQueryParams(gdprConsent);
    let iframePrivacyParams = '';
    let pixelPrivacyParams = '';

    if (gdprParams) {
      iframePrivacyParams += `?${gdprParams}`;
      pixelPrivacyParams += `&${gdprParams}`;
    }

    if (usPrivacy) {
      if (iframePrivacyParams != '') {
        iframePrivacyParams += '&'
      } else {
        iframePrivacyParams += '?'
      }
      iframePrivacyParams += `ccpa=${usPrivacy}`;
      pixelPrivacyParams += `&ccpa=${usPrivacy}`;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: FRAME_USER_SYNC + iframePrivacyParams
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: PIXEL_USER_SYNC_1 + pixelPrivacyParams
      },
      {
        type: 'image',
        url: PIXEL_USER_SYNC_2 + pixelPrivacyParams
      });
    }
    return syncs;
  }
};
registerBidder(spec);
