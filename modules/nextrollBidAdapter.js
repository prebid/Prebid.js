import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

import find from 'core-js/library/fn/array/find.js';

const BIDDER_CODE = 'nextroll';
const BIDDER_ENDPOINT = 'https://d.adroll.com/bid/prebid/';
const ADAPTER_VERSION = 4;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    return bidRequest !== undefined && !!bidRequest.params && !!bidRequest.bidId;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let topLocation = utils.parseUrl(utils.deepAccess(bidderRequest, 'refererInfo.referer'));
    let consent = hasCCPAConsent(bidderRequest);
    return validBidRequests.map((bidRequest, index) => {
      return {
        method: 'POST',
        options: {
          withCredentials: consent,
        },
        url: BIDDER_ENDPOINT,
        data: {
          id: bidRequest.bidId,
          imp: {
            id: bidRequest.bidId,
            bidfloor: utils.getBidIdParameter('bidfloor', bidRequest.params),
            banner: {
              format: _getSizes(bidRequest)
            },
            ext: {
              zone: {
                id: utils.getBidIdParameter('zoneId', bidRequest.params)
              },
              nextroll: {
                adapter_version: ADAPTER_VERSION
              }
            }
          },

          user: _getUser(validBidRequests),
          site: _getSite(bidRequest, topLocation),
          seller: _getSeller(bidRequest),
          device: _getDevice(bidRequest),
        }
      }
    })
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse.body) {
      return [];
    } else {
      let response = serverResponse.body
      let bids = response.seatbid.reduce((acc, seatbid) => acc.concat(seatbid.bid), []);
      return bids.map((bid) => _buildResponse(response, bid));
    }
  }
}

function _getUser(requests) {
  let id = utils.deepAccess(requests, '0.userId.nextroll');
  if (id === undefined) {
    return
  }

  return {
    ext: {
      eid: [{
        'source': 'nextroll',
        id
      }]
    }
  }
}

function _buildResponse(bidResponse, bid) {
  const adm = utils.replaceAuctionPrice(bid.adm, bid.price);
  return {
    requestId: bidResponse.id,
    cpm: bid.price,
    width: bid.w,
    height: bid.h,
    creativeId: bid.crid,
    dealId: bidResponse.dealId,
    currency: 'USD',
    netRevenue: true,
    ttl: 300,
    ad: adm
  }
}

function _getSite(bidRequest, topLocation) {
  return {
    page: topLocation.href,
    domain: topLocation.hostname,
    publisher: {
      id: utils.getBidIdParameter('publisherId', bidRequest.params)
    }
  }
}

function _getSeller(bidRequest) {
  return {
    id: utils.getBidIdParameter('sellerId', bidRequest.params)
  }
}

function _getSizes(bidRequest) {
  return bidRequest.sizes.filter(_isValidSize).map(size => {
    return {
      w: size[0],
      h: size[1]
    }
  })
}

function _isValidSize(size) {
  const isNumber = x => typeof x === 'number';
  return (size.length === 2 && isNumber(size[0]) && isNumber(size[1]));
}

function _getDevice(_bidRequest) {
  return {
    ua: navigator.userAgent,
    language: navigator['language'],
    os: _getOs(navigator.userAgent.toLowerCase()),
    osv: _getOsVersion(navigator.userAgent)
  }
}

function _getOs(userAgent) {
  const osTable = {
    'android': /android/i,
    'ios': /iphone|ipad/i,
    'mac': /mac/i,
    'linux': /linux/i,
    'windows': /windows/i
  };

  return find(Object.keys(osTable), os => {
    if (userAgent.match(osTable[os])) {
      return os;
    }
  }) || 'etc';
}

function _getOsVersion(userAgent) {
  let clientStrings = [
    { s: 'Android', r: /Android/ },
    { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
    { s: 'Mac OS X', r: /Mac OS X/ },
    { s: 'Mac OS', r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
    { s: 'Linux', r: /(Linux|X11)/ },
    { s: 'Windows 10', r: /(Windows 10.0|Windows NT 10.0)/ },
    { s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/ },
    { s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/ },
    { s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/ },
    { s: 'Windows Vista', r: /Windows NT 6.0/ },
    { s: 'Windows Server 2003', r: /Windows NT 5.2/ },
    { s: 'Windows XP', r: /(Windows NT 5.1|Windows XP)/ },
    { s: 'UNIX', r: /UNIX/ },
    { s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/ }
  ];
  let cs = find(clientStrings, cs => cs.r.test(userAgent));
  return cs ? cs.s : 'unknown';
}

export function hasCCPAConsent(bidderRequest) {
  if (typeof bidderRequest.uspConsent !== 'string') {
    return true;
  }
  const usps = bidderRequest.uspConsent;
  const version = usps[0];

  // If we don't support the consent string, assume no-consent.
  if (version !== '1' || usps.length < 3) {
    return false;
  }

  const notice = usps[1];
  const optOut = usps[2];

  if (notice === 'N' || optOut === 'Y') {
    return false;
  }
  return true;
}

registerBidder(spec);
