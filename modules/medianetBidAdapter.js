import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';
import { config } from 'src/config';

const BIDDER_CODE = 'medianet';
const BID_URL = '//prebid.media.net/rtb/prebid';

$$PREBID_GLOBAL$$.medianetGlobals = {};

function siteDetails(site) {
  site = site || {};
  let siteData = {
    domain: site.domain || utils.getTopWindowLocation().host,
    page: site.page || utils.getTopWindowUrl(),
    ref: site.ref || utils.getTopWindowReferrer()
  };

  return Object.assign(siteData, getPageMeta());
}

function getPageMeta() {
  let canonicalUrl = getUrlFromSelector('link[rel="canonical"]', 'href');
  let ogUrl = getUrlFromSelector('meta[property="og:url"]', 'content');
  let twitterUrl = getUrlFromSelector('meta[name="twitter:url"]', 'content');

  return Object.assign({},
    canonicalUrl && { 'canonical_url': canonicalUrl },
    ogUrl && { 'og_url': ogUrl },
    twitterUrl && { 'twitter_url': twitterUrl }
  );
}

function getUrlFromSelector(selector, attribute) {
  let attr = getAttributeFromSelector(selector, attribute);
  return attr && getAbsoluteUrl(attr);
}

function getAttributeFromSelector(selector, attribute) {
  try {
    let doc = utils.getWindowTop().document;
    let element = doc.querySelector(selector);
    if (element !== null && element[attribute]) {
      return element[attribute];
    }
  } catch (e) {}
}

function getAbsoluteUrl(url) {
  let aTag = utils.getWindowTop().document.createElement('a');
  aTag.href = url;

  return aTag.href;
}

function filterUrlsByType(urls, type) {
  return urls.filter(url => url.type === type);
}

function transformSizes(sizes) {
  if (utils.isArray(sizes) && sizes.length === 2 && !utils.isArray(sizes[0])) {
    return [getSize(sizes)];
  }

  return sizes.map(size => getSize(size))
}

function getSize(size) {
  return {
    w: parseInt(size[0], 10),
    h: parseInt(size[1], 10)
  }
}

function extParams(params, gdpr) {
  let ext = {
    customer_id: params.cid,
    prebid_version: $$PREBID_GLOBAL$$.version
  };
  ext.gdpr_applies = !!(gdpr && gdpr.gdprApplies);
  if (ext.gdpr_applies) {
    ext.gdpr_consent_string = gdpr.consentString || '';
  }
  return ext;
}

function slotParams(bidRequest) {
  // check with Media.net Account manager for  bid floor and crid parameters
  let params = {
    id: bidRequest.bidId,
    ext: {
      dfp_id: bidRequest.adUnitCode
    },
    banner: transformSizes(bidRequest.sizes),
    all: bidRequest.params
  };

  if (bidRequest.params.crid) {
    params.tagid = bidRequest.params.crid.toString();
  }

  let bidFloor = parseFloat(bidRequest.params.bidfloor);
  if (bidFloor) {
    params.bidfloor = bidFloor;
  }
  return params;
}

function generatePayload(bidRequests, bidderRequests) {
  return {
    site: siteDetails(bidRequests[0].params.site),
    ext: extParams(bidRequests[0].params, bidderRequests.gdprConsent),
    id: bidRequests[0].auctionId,
    imp: bidRequests.map(request => slotParams(request)),
    tmax: bidderRequests.timeout || config.getConfig('bidderTimeout')
  }
}

function isValidBid(bid) {
  return bid.no_bid === false && parseFloat(bid.cpm) > 0.0;
}

function fetchCookieSyncUrls(response) {
  if (!utils.isEmpty(response) && response[0].body &&
    response[0].body.ext && utils.isArray(response[0].body.ext.csUrl)) {
    return response[0].body.ext.csUrl;
  }

  return [];
}

export const spec = {

  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid (if cid is present), and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (!bid.params) {
      utils.logError(`${BIDDER_CODE} : Missing bid parameters`);
      return false;
    }

    if (!bid.params.cid || !utils.isStr(bid.params.cid) || utils.isEmptyStr(bid.params.cid)) {
      utils.logError(`${BIDDER_CODE} : cid should be a string`);
      return false;
    }

    Object.assign($$PREBID_GLOBAL$$.medianetGlobals, !$$PREBID_GLOBAL$$.medianetGlobals.cid && {cid: bid.params.cid});

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {BidderRequests} bidderRequests
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidderRequests) {
    let payload = generatePayload(bidRequests, bidderRequests);
    return {
      method: 'POST',
      url: BID_URL,
      data: JSON.stringify(payload)
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {
    let validBids = [];

    if (!serverResponse || !serverResponse.body) {
      utils.logInfo(`${BIDDER_CODE} : response is empty`);
      return validBids;
    }

    let bids = serverResponse.body.bidList;
    if (!utils.isArray(bids) || bids.length === 0) {
      utils.logInfo(`${BIDDER_CODE} : no bids`);
      return validBids;
    }
    validBids = bids.filter(bid => isValidBid(bid));

    return validBids;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    let cookieSyncUrls = fetchCookieSyncUrls(serverResponses);

    if (syncOptions.iframeEnabled) {
      return filterUrlsByType(cookieSyncUrls, 'iframe');
    }

    if (syncOptions.pixelEnabled) {
      return filterUrlsByType(cookieSyncUrls, 'image');
    }
  }
};
registerBidder(spec);
