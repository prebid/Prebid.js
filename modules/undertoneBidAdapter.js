/**
 * Adapter to send bids to Undertone
 */

import * as urlUtils from '../src/url';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'undertone';
const URL = 'https://hb.undertone.com/hb';
const FRAME_USER_SYNC = 'https://cdn.undertone.com/js/usersync.html';
const PIXEL_USER_SYNC_1 = 'https://usr.undertone.com/userPixel/syncOne?id=1&of=2';
const PIXEL_USER_SYNC_2 = 'https://usr.undertone.com/userPixel/syncOne?id=2&of=2';

function getCanonicalUrl() {
  try {
    let doc = window.top.document;
    let element = doc.querySelector("link[rel='canonical']");
    if (element !== null) {
      return element.href;
    }
  } catch (e) {
  }
  return null;
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

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (bid && bid.params && bid.params.publisherId) {
      bid.params.publisherId = parseInt(bid.params.publisherId);
      return true;
    }
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const payload = {
      'x-ut-hb-params': [],
      'commons': {
        'adapterVersion': '$prebid.version$',
        'uids': validBidRequests[0].userId
      }
    };
    const referer = bidderRequest.refererInfo.referer;
    const hostname = urlUtils.parse(referer).hostname;
    let domain = extractDomainFromHost(hostname);
    const pageUrl = getCanonicalUrl() || referer;

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
        hbadaptor: 'prebid',
        url: pageUrl,
        domain: domain,
        placementId: bidReq.params.placementId != undefined ? bidReq.params.placementId : null,
        publisherId: bidReq.params.publisherId,
        sizes: bidReq.sizes,
        params: bidReq.params
      };
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
            ad: bidRes.ad
          };
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
