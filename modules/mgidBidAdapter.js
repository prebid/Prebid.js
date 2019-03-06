import {registerBidder} from 'src/adapters/bidderFactory';
import * as utils from '../src/utils';
import * as urlUtils from '../src/url';
import { BANNER } from 'src/mediaTypes';
const BIDDER_CODE = 'mgid';
const ENDPOINT_URL = '//dsp.mgid.com/prebid/';

export const spec = {
  VERSION: '1.0',
  code: BIDDER_CODE,
  aliases: ['mgid'], // short code
  supportedMediaTypes: [BANNER],
  reId: /^[0-9]+$/,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    const banner = utils.deepAccess(bid, 'mediaTypes.banner');
    const sizes = utils.deepAccess(banner, 'sizes');
    let sizesOk = typeof (sizes) == 'object' && sizes.length > 0;
    for (let f = 0; sizesOk && f < sizes.length; f++) {
      sizesOk = sizes[f].length == 2;
    }
    return typeof (bid.params) == 'object' && !!bid.params.accountId && !!bid.params.placementId &&
      typeof (bid.params.accountId) == 'string' && typeof (bid.params.placementId) == 'string' &&
      bid.params.accountId.length > 0 && bid.params.placementId.length > 0 &&
      bid.params.accountId.toString().match(spec.reId) > 0 && bid.params.placementId.toString().match(spec.reId) &&
      typeof (banner) == 'object' && sizesOk;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    utils.logInfo(`MGID DEBUG: buildRequests`);
    if (validBidRequests.length == 0) {
      return null;
    }
    const referer = utils.deepAccess(bidderRequest, 'refererInfo.referer');
    const hostname = urlUtils.parse(referer).hostname;
    let domain = extractDomainFromHost(hostname) || hostname;
    const accountId = setOnAny(validBidRequests, 'params.accountId');
    const muid = getLocalStorageSafely('mgMuidn');
    let url = (setOnAny(validBidRequests, 'params.bidUrl') || ENDPOINT_URL) + accountId;
    if (muid != null && typeof (muid) == 'string' && muid.length > 0) {
      url += '?muid=' + muid;
    }
    const page = utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || referer;
    const secure = window.location.protocol === 'https:' ? 1 : 0;
    const imp = validBidRequests.map((bid, id) => {
      const placeId = utils.deepAccess(bid, 'params.placementId');
      const sizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes');
      let format = [];
      if (sizes.length > 1) {
        for (let f = 0; f < sizes.length; f++) {
          if (sizes[f].length == 2) {
            format.push({w: sizes[f][0], h: sizes[f][1]});
          }
        }
      }
      return {
        id: bid.bidId,
        tagid: placeId,
        banner: {
          w: sizes && sizes[0][0],
          h: sizes && sizes[0][1],
          format,
        },
        secure,
      };
    });

    let ext = {mgid_ver: spec.VERSION, prebid_ver: $$PREBID_GLOBAL$$.version};
    let user = {};
    let regs = {};
    if (bidderRequest && bidderRequest.gdprConsent) {
      user.ext = {
        consent: bidderRequest.gdprConsent.consentString
      };

      regs.ext = {
        gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
      };
    }

    const request = {
      id: utils.deepAccess(bidderRequest, 'bidderRequestId'),
      site: { domain, page },
      cur: ['USD'],
      device: {
        ua: navigator.userAgent,
        js: 1,
        dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
        h: screen.height,
        w: screen.width,
        language: getLanguage()
      },
      user,
      regs,
      ext,
      imp
    };
    utils.logInfo(`MGID DEBUG: buildRequests\n${request}`);
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(request),
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, bidRequests) => {
    if (serverResponse == null || serverResponse.body == null || serverResponse.body == '' || !serverResponse.body.seatbid || !serverResponse.body.seatbid[0]) {
      return [];
    }
    utils.logInfo(`MGID DEBUG: interpretResponse`);
    const returnedBids = [];
    const muidn = utils.deepAccess(serverResponse.body, 'ext.muidn')
    if (muidn != null && typeof (muidn) == 'string' && muidn.length > 0) {
      setLocalStorageSafely('mgMuidn', muidn)
    }
    serverResponse.body.seatbid[0].bid.forEach((value, index) => {
      returnedBids.push(prebidBid(value, serverResponse.body.cur));
    });

    utils.logInfo(`MGID DEBUG:\n${returnedBids}`);
    return returnedBids;
  },
  onBidWon: (bid) => {
    const cpm = bid.pbMg;
    if (bid.nurl != '') {
      bid.nurl = bid.nurl.replace(
        /\$\{AUCTION_PRICE\}/,
        cpm
      );
      pixel(bid.nurl);
    };
    if (bid.isBurl) {
      bid.ad = bid.ad.replace(
        /\$\{AUCTION_PRICE\}/,
        cpm
      );
    }
    utils.logInfo(`MGID DEBUG: onBidWon`);
  },
  getUserSyncs: (syncOptions, serverResponses) => {
    utils.logInfo(`MGID DEBUG: getUserSyncs`);
  }
};

registerBidder(spec);

function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = utils.deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @return Bid
 */
function prebidBid(serverBid, cur) {
  if (cur == null || cur == '') {
    cur = 'USD';
  }
  const bid = {
    requestId: serverBid.impid,
    ad: serverBid.adm,
    cpm: serverBid.price,
    creativeId: serverBid.adid,
    currency: cur,
    dealId: serverBid.dealid || '',
    width: serverBid.w,
    height: serverBid.h,
    mediaType: 'banner',
    netRevenue: true,
    ttl: serverBid.ttl || 300,
    nurl: serverBid.nurl || '',
    isBurl: typeof (serverBid.burl) == 'string' && serverBid.burl.length > 0,
  };

  return bid;
}

function extractDomainFromHost(pageHost) {
  if (pageHost == 'localhost') {
    return 'localhost'
  }
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

function pixel(url) {
  (document.createElement('IMG')).src = url;
}

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  const lang2 = navigator[language].split('-')[0];
  if (lang2.length == 2 || lang2.length == 3) {
    return lang2;
  }
  return '';
}

function getLocalStorageSafely(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function setLocalStorageSafely(key, val) {
  try {
    return localStorage.setItem(key, val);
  } catch (e) {
    return null;
  }
}
