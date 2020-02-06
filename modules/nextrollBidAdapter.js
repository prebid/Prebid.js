import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
import { loadExternalScript } from '../src/adloader';
import JSEncrypt from 'jsencrypt/bin/jsencrypt';
import sha256 from 'crypto-js/sha256';

const BIDDER_CODE = 'nextroll';
const BIDDER_ENDPOINT = 'https://d.adroll.com/bid/prebid/';
const PUBTAG_URL = 'https://s.adroll.com/prebid/pubtag.min.js';
const MAX_PUBTAG_AGE_IN_DAYS = 3;
const ADAPTER_VERSION = 3;

const PUBTAG_STORAGE_KEY = 'nextroll_fast_bid';
const DATE_SUFFIX = '_set_date';

export const PUBTAG_PUBKEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/TZ6Gpm7gYg0j6o8LK+sKfYsl
+Z3vY2flsA/KFllKyXKTTtC2nJSJlSTuNToIcXnW+2L3Q2V3yM8VExfhCtVg5oZd
YEe1TfPmu7UyGP4rCJM3wD7Z3+3XPy4pWWiTvGhHOO0bdT9JfwaezJYObJBcfkpK
PX0z1E1oDVf6nJT7rwIDAQAB
-----END PUBLIC KEY-----`;

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
    if (!pubtagAvailable()) {
      tryGetPubtag();

      setTimeout(() => {
        loadExternalScript(PUBTAG_URL, BIDDER_CODE);
      }, bidderRequest.timeout);
    }

    if (pubtagAvailable()) {
      const adapter = new window.NextRoll.Adapters.Prebid(ADAPTER_VERSION);
      return adapter.buildRequests(validBidRequests, bidderRequest);
    }
    return _buildRequests(validBidRequests, bidderRequest);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    if (pubtagAvailable()) {
      return window.NextRoll.Adapters.Prebid.interpretResponse(serverResponse, bidRequest);
    }
    return _interpretResponse(serverResponse, bidRequest);
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    if (pubtagAvailable()) {
      return window.NextRoll.Adapters.Prebid.getUserSyncs(syncOptions, serverResponses, gdprConsent);
    }
    return [];
  }
}

function _buildRequests(validBidRequests, bidderRequest) {
  let topLocation = _parseUrl(utils.deepAccess(bidderRequest, 'refererInfo.referer'));
  return validBidRequests.map((bidRequest, index) => {
    return {
      method: 'POST',
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

function _interpretResponse(serverResponse, _bidRequest) {
  if (!serverResponse.body) {
    return [];
  } else {
    let response = serverResponse.body
    let bids = response.seatbid.reduce((acc, seatbid) => acc.concat(seatbid.bid), []);
    return bids.map((bid) => _buildResponse(response, bid));
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

function pubtagAvailable() {
  let NextRoll = window.NextRoll
  return typeof NextRoll !== 'undefined' && NextRoll.Adapters && NextRoll.Adapters.Prebid;
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
    ip: '',
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

  return Object.keys(osTable).find(os => {
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
  let cs = clientStrings.find(cs => cs.r.test(userAgent));
  return cs ? cs.s : 'unknown';
}

function _parseUrl(url) {
  let parsed = document.createElement('a');
  parsed.href = url;
  return {
    href: parsed.href,
    hostname: parsed.hostname
  };
}

/**
 * @return {boolean}
 */
export function tryGetPubtag() {
  const hashPrefix = '// Hash: ';

  let pubtagFromStorage = null;
  let pubtagAge = null;

  try {
    pubtagFromStorage = localStorage.getItem(PUBTAG_STORAGE_KEY);
    pubtagAge = localStorage.getItem(PUBTAG_STORAGE_KEY + DATE_SUFFIX);
  } catch (e) {
    return;
  }

  if (PUBTAG_STORAGE_KEY === null || pubtagAge === null || isPubtagTooOld(pubtagAge)) {
    removePubtag();
    return;
  }

  // The value stored must contain the file's encrypted hash as first line
  const firstLineEndPosition = pubtagFromStorage.indexOf('\n');
  const firstLine = pubtagFromStorage.substr(0, firstLineEndPosition).trim();

  if (firstLine.substr(0, hashPrefix.length) !== hashPrefix) {
    utils.logWarn('No hash found in Pubtag');
    removePubtag();
  } else {
    // Remove the hash part from the locally stored value
    const publisherTagHash = firstLine.substr(hashPrefix.length);
    const publisherTag = pubtagFromStorage.substr(firstLineEndPosition + 1);

    var jsEncrypt = new JSEncrypt();
    jsEncrypt.setPublicKey(PUBTAG_PUBKEY);
    if (jsEncrypt.verify(publisherTag, publisherTagHash, sha256)) {
      utils.logInfo('Using NextRoll Pubtag');
      insertTag(publisherTag);
    } else {
      utils.logWarn('Invalid NextRoll Pubtag found');
      removePubtag();
    }
  }
}

function insertTag(publisherTag) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = publisherTag;
  utils.insertElement(script);
}

function removePubtag() {
  localStorage.removeItem(PUBTAG_STORAGE_KEY);
  localStorage.removeItem(PUBTAG_STORAGE_KEY + DATE_SUFFIX);
}

function isPubtagTooOld(pubtagAge) {
  const currentDate = (new Date()).getTime();
  const ptSetDate = parseInt(pubtagAge);
  const maxAgeMs = MAX_PUBTAG_AGE_IN_DAYS * 1000 * 60 * 60 * 24;

  if (currentDate - ptSetDate > maxAgeMs) {
    return true
  }
  return false
}

registerBidder(spec);
