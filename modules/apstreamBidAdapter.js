import { generateUUID, deepAccess, createTrackPixelHtml, getDNT } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const CONSTANTS = {
  DSU_KEY: 'apr_dsu',
  BIDDER_CODE: 'apstream',
  GVLID: 394
};
const storage = getStorageManager({gvlid: CONSTANTS.GVLID, bidderCode: CONSTANTS.BIDDER_CODE});

var dsuModule = (function() {
  'use strict';

  var DSU_KEY = 'apr_dsu';
  var DSU_VERSION_NUMBER = '1';
  var SIGNATURE_SALT = 'YicAu6ZpNG';
  var DSU_CREATOR = {'USERREPORT': '1'};

  function stringToU8(str) {
    if (typeof TextEncoder === 'function') {
      return new TextEncoder().encode(str);
    }
    str = unescape(encodeURIComponent(str));
    var bytes = new Uint8Array(str.length);
    for (var i = 0, j = str.length; i < j; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes;
  }

  function _add(a, b) {
    var rl = a.l + b.l;
    var a2 = {
      h: a.h + b.h + (rl / 2 >>> 31) >>> 0,
      l: rl >>> 0
    };
    a.h = a2.h;
    a.l = a2.l;
  }
  function _xor(a, b) {
    a.h ^= b.h;
    a.h >>>= 0;
    a.l ^= b.l;
    a.l >>>= 0;
  }
  function _rotl(a, n) {
    var a2 = {
      h: a.h << n | a.l >>> (32 - n),
      l: a.l << n | a.h >>> (32 - n)
    };
    a.h = a2.h;
    a.l = a2.l;
  }
  function _rotl32(a) {
    var al = a.l;
    a.l = a.h;
    a.h = al;
  }

  function _compress(v0, v1, v2, v3) {
    _add(v0, v1);
    _add(v2, v3);
    _rotl(v1, 13);
    _rotl(v3, 16);
    _xor(v1, v0);
    _xor(v3, v2);
    _rotl32(v0);
    _add(v2, v1);
    _add(v0, v3);
    _rotl(v1, 17);
    _rotl(v3, 21);
    _xor(v1, v2);
    _xor(v3, v0);
    _rotl32(v2);
  }
  function _getInt(a, offset) {
    return a[offset + 3] << 24 |
          a[offset + 2] << 16 |
          a[offset + 1] << 8 |
          a[offset];
  }

  function hash(key, m) {
    if (typeof m === 'string') {
      m = stringToU8(m);
    }
    var k0 = {
      h: key[1] >>> 0,
      l: key[0] >>> 0
    };
    var k1 = {
      h: key[3] >>> 0,
      l: key[2] >>> 0
    };
    var v0 = {
      h: k0.h,
      l: k0.l
    };
    var v2 = k0;
    var v1 = {
      h: k1.h,
      l: k1.l
    };
    var v3 = k1;
    var ml = m.length;
    var ml7 = ml - 7;
    var buf = new Uint8Array(new ArrayBuffer(8));
    _xor(v0, {
      h: 0x736f6d65,
      l: 0x70736575
    });
    _xor(v1, {
      h: 0x646f7261,
      l: 0x6e646f6d
    });
    _xor(v2, {
      h: 0x6c796765,
      l: 0x6e657261
    });
    _xor(v3, {
      h: 0x74656462,
      l: 0x79746573
    });
    var mp = 0;
    while (mp < ml7) {
      var mi = {
        h: _getInt(m, mp + 4),
        l: _getInt(m, mp)
      };
      _xor(v3, mi);
      _compress(v0, v1, v2, v3);
      _compress(v0, v1, v2, v3);
      _xor(v0, mi);
      mp += 8;
    }
    buf[7] = ml;
    var ic = 0;
    while (mp < ml) {
      buf[ic++] = m[mp++];
    }
    while (ic < 7) {
      buf[ic++] = 0;
    }
    var mil = {
      h: buf[7] << 24 | buf[6] << 16 | buf[5] << 8 | buf[4],
      l: buf[3] << 24 | buf[2] << 16 | buf[1] << 8 | buf[0]
    };
    _xor(v3, mil);
    _compress(v0, v1, v2, v3);
    _compress(v0, v1, v2, v3);
    _xor(v0, mil);
    _xor(v2, {
      h: 0,
      l: 0xff
    });
    _compress(v0, v1, v2, v3);
    _compress(v0, v1, v2, v3);
    _compress(v0, v1, v2, v3);
    _compress(v0, v1, v2, v3);
    var h = v0;
    _xor(h, v1);
    _xor(h, v2);
    _xor(h, v3);
    return h;
  }

  function hashHex(key, m) {
    var r = hash(key, m);
    return ('0000000' + r.h.toString(16)).substr(-8) +
            ('0000000' + r.l.toString(16)).substr(-8);
  }

  var SIPHASH_KEY = [0x86395a57, 0x6b5ba7f7, 0x69732c07, 0x2a6ef48d];
  var hashWithKey = hashHex.bind(null, SIPHASH_KEY);

  var parseUrlRegex = new RegExp('^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?');
  var overwrite = null;
  var cache = {};
  function parseUrl(url) {
    var addscheme =
    url.indexOf('/') !== 0 &&
    url.indexOf('/') !== -1 &&
    (url.indexOf(':') === -1 || url.indexOf(':') > url.indexOf('/'));

    var match = parseUrlRegex.exec(addscheme ? 'noscheme://' + url : url);
    var res = {
      scheme: addscheme ? '' : match[2] || '',
      host: match[4] || '',
      hostname: match[4] ? match[4].split(':')[0] : '',
      pathname: match[5] || '',
      search: match[7] || '',
      hash: match[9] || '',
      toString: function () {
        return url;
      }
    };

    res.origin = res.scheme + '://' + res.host;
    return res;
  }

  function location() {
    var url = overwrite || window.location.toString();
    url = url.replace(/\.demo\.audienceproject\.com\//, '/');

    if (cache.url === url) {
      return cache.parsed;
    }
    var parsed = parseUrl(url);
    cache.url = url;
    cache.parsed = parsed;
    return parsed;
  }

  function getDaysSinceApEpoch() {
    var timeDiff = (new Date()).getTime() - (new Date(2019, 0, 1)).getTime();
    var daysSinceApEpoch = Math.floor(timeDiff / (1000 * 3600 * 24));
    return daysSinceApEpoch;
  }

  function generateDsu() {
    var dsuId = generateUUID();
    var loc = location();

    var dsuIdSuffix = hashWithKey(dsuId + loc.toString());
    var suffix4 = dsuIdSuffix.substr(0, 4);
    var suffix8 = dsuIdSuffix.substr(4);

    dsuId = dsuId.substr(0, 19) + suffix4 + '-' + suffix8;

    var daysSinceApEpoch = getDaysSinceApEpoch();
    var originHash = hashWithKey(loc.origin);

    var metadata = [
      DSU_CREATOR.USERREPORT,
      daysSinceApEpoch,
      originHash
    ].join('.');
    var signature = hashWithKey(dsuId + metadata + SIGNATURE_SALT);

    return [DSU_VERSION_NUMBER, signature, dsuId, metadata].join('.');
  }

  function readOrCreateDsu() {
    var dsu;
    try {
      dsu = storage.getDataFromLocalStorage(DSU_KEY);
    } catch (err) {
      return null;
    }

    if (!dsu) {
      dsu = generateDsu();
    }

    try {
      storage.setDataInLocalStorage(DSU_KEY, dsu);
    } catch (err) {
      return null;
    }

    return dsu;
  }

  return {
    readOrCreateDsu: readOrCreateDsu
  };
})();

function serializeSizes(sizes) {
  if (Array.isArray(sizes[0]) === false) {
    sizes = [sizes];
  }

  return sizes.map(s => s[0] + 'x' + s[1]).join('_');
}

function getRawConsentString(gdprConsentConfig) {
  if (!gdprConsentConfig || gdprConsentConfig.gdprApplies === false) {
    return null;
  }

  return gdprConsentConfig.consentString;
}

function getConsentStringFromPrebid(gdprConsentConfig) {
  const consentString = getRawConsentString(gdprConsentConfig);
  if (!consentString) {
    return null;
  }

  let isIab = config.getConfig('consentManagement.cmpApi') != 'static';
  let vendorConsents = (
    gdprConsentConfig.vendorData.vendorConsents ||
    (gdprConsentConfig.vendorData.vendor || {}).consents ||
    {}
  );
  let isConsentGiven = !!vendorConsents[CONSTANTS.GVLID.toString(10)];

  return isIab && isConsentGiven ? consentString : null;
}

function getIabConsentString(bidderRequest) {
  if (deepAccess(bidderRequest, 'gdprConsent')) {
    return getConsentStringFromPrebid(bidderRequest.gdprConsent);
  }

  return 'disabled';
}

function injectPixels(ad, pixels, scripts) {
  if (!pixels && !scripts) {
    return ad;
  }

  let trackedAd = ad;
  if (pixels) {
    pixels.forEach(pixel => {
      const tracker = createTrackPixelHtml(pixel);
      trackedAd += tracker;
    });
  }

  if (scripts) {
    scripts.forEach(script => {
      const tracker = `<script src="${script}"></script>`;
      trackedAd += tracker;
    });
  }

  return trackedAd;
}

function getScreenParams() {
  return `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`;
}

function getBids(bids) {
  const bidArr = bids.map(bid => {
    const bidId = bid.bidId;

    let mediaType = '';
    const mediaTypes = Object.keys(bid.mediaTypes);
    switch (mediaTypes[0]) {
      case 'video':
        mediaType = 'v';
        break;

      case 'native':
        mediaType = 'n';
        break;

      case 'audio':
        mediaType = 'a';
        break;

      default:
        mediaType = 'b';
        break;
    }

    let adUnitCode = `,c=${bid.adUnitCode}`;
    if (bid.params.code) {
      adUnitCode = `,c=${encodeURIComponent(bid.params.code)}`;
    }
    if (bid.params.adunitId) {
      adUnitCode = `,u=${encodeURIComponent(bid.params.adunitId)}`;
    }

    return `${bidId}:t=${mediaType},s=${serializeSizes(bid.sizes)}${adUnitCode}`;
  });

  return bidArr.join(';');
};

function getEndpointsGroups(bidRequests) {
  let endpoints = [];
  const getEndpoint = bid => {
    const publisherId = bid.params.publisherId || config.getConfig('apstream.publisherId');
    const isTestConfig = bid.params.test || config.getConfig('apstream.test');

    if (isTestConfig) {
      return `https://mock-bapi.userreport.com/v2/${publisherId}/bid`;
    }

    if (bid.params.endpoint) {
      return `${bid.params.endpoint}${publisherId}/bid`;
    }

    return `https://bapi.userreport.com/v2/${publisherId}/bid`;
  }
  bidRequests.forEach(bid => {
    const endpoint = getEndpoint(bid);
    const exist = endpoints.filter(item => item.endpoint.indexOf(endpoint) > -1)[0];
    if (exist) {
      exist.bids.push(bid);
    } else {
      endpoints.push({
        endpoint: endpoint,
        bids: [bid]
      });
    }
  });

  return endpoints;
}

function isBidRequestValid(bid) {
  const publisherId = config.getConfig('apstream.publisherId');
  const isPublisherIdExist = !!(publisherId || bid.params.publisherId);
  const isOneMediaType = Object.keys(bid.mediaTypes).length === 1;

  return isPublisherIdExist && isOneMediaType;
}

function buildRequests(bidRequests, bidderRequest) {
  // convert Native ORTB definition to old-style prebid native definition
  bidRequests = convertOrtbRequestToProprietaryNative(bidRequests);
  const data = {
    med: encodeURIComponent(window.location.href),
    auid: bidderRequest.auctionId,
    ref: document.referrer,
    dnt: getDNT() ? 1 : 0,
    sr: getScreenParams()
  };

  const consentData = getRawConsentString(bidderRequest.gdprConsent);
  data.iab_consent = consentData;

  const options = {
    withCredentials: true
  };

  const isConsent = getIabConsentString(bidderRequest);
  const noDsu = config.getConfig('apstream.noDsu');
  if (!isConsent || noDsu) {
    data.dsu = '';
  } else {
    data.dsu = dsuModule.readOrCreateDsu();
  }

  if (!isConsent || isConsent === 'disabled') {
    options.withCredentials = false;
  }

  const endpoints = getEndpointsGroups(bidRequests);
  const serverRequests = endpoints.map(item => ({
    method: 'GET',
    url: item.endpoint,
    data: {
      ...data,
      bids: getBids(item.bids),
      rnd: Math.random()
    },
    options: options
  }));

  return serverRequests;
}

function interpretResponse(serverResponse) {
  let bidResponses = serverResponse && serverResponse.body;

  if (!bidResponses || !bidResponses.length) {
    return [];
  }

  return bidResponses.map(x => ({
    requestId: x.bidId,
    cpm: x.bidDetails.cpm,
    width: x.bidDetails.width,
    height: x.bidDetails.height,
    creativeId: x.bidDetails.creativeId,
    currency: x.bidDetails.currency || 'USD',
    netRevenue: x.bidDetails.netRevenue,
    dealId: x.bidDetails.dealId,
    ad: injectPixels(x.bidDetails.ad, x.bidDetails.noticeUrls, x.bidDetails.impressionScripts),
    ttl: x.bidDetails.ttl,
  }));
}

export const spec = {
  code: CONSTANTS.BIDDER_CODE,
  gvlid: CONSTANTS.GVLID,
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse
}

registerBidder(spec);
