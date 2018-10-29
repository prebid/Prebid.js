/**
 * Adapter to send bids to Undertone
 */

import * as urlUtils from 'src/url';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'undertone';
const URL = '//hb.undertone.com/hb';
const FRAME_USER_SYNC = '//cdn.undertone.com/js/usersync.html';
const PIXEL_USER_SYNC_1 = '//usr.undertone.com/userPixel/syncOne?id=1&of=2';
const PIXEL_USER_SYNC_2 = '//usr.undertone.com/userPixel/syncOne?id=2&of=2';

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
      'x-ut-hb-params': []
    };
    const referer = bidderRequest.refererInfo.referer;
    const hostname = urlUtils.parse(referer).hostname;
    let domain = extractDomainFromHost(hostname);
    const pageUrl = getCanonicalUrl() || referer;

    const pubid = validBidRequests[0].params.publisherId;
    const REQ_URL = `${URL}?pid=${pubid}&domain=${domain}`;

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
      url: REQ_URL,
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
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const syncs = [];
    if (gdprConsent && gdprConsent.gdprApplies === true) {
      return syncs;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: FRAME_USER_SYNC
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: PIXEL_USER_SYNC_1
      },
      {
        type: 'image',
        url: PIXEL_USER_SYNC_2
      });
    }
    return syncs;
  }
};
registerBidder(spec);
