import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { parseUrl, deepAccess, _each, formatQS, getUniqueIdentifierStr, triggerPixel } from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'amx';
const storage = getStorageManager(737, BIDDER_CODE);
const SIMPLE_TLD_TEST = /\.co\.\w{2,4}$/;
const DEFAULT_ENDPOINT = 'https://prebid.a-mo.net/a/c';
const VERSION = 'pba1.2';
const xmlDTDRxp = /^\s*<\?xml[^\?]+\?>/;
const VAST_RXP = /^\s*<\??(?:vast|xml)/i;
const TRACKING_ENDPOINT = 'https://1x1.a-mo.net/hbx/';
const AMUID_KEY = '__amuidpb';

const getLocation = (request) =>
  parseUrl(deepAccess(request, 'refererInfo.canonicalUrl', location.href))

const largestSize = (sizes, mediaTypes) => {
  const allSizes = sizes
    .concat(deepAccess(mediaTypes, `${BANNER}.sizes`, []) || [])
    .concat(deepAccess(mediaTypes, `${VIDEO}.sizes`, []) || [])

  return allSizes.sort((a, b) => (b[0] * b[1]) - (a[0] * a[1]))[0];
}

function flatMap(input, mapFn) {
  if (input == null) {
    return []
  }
  return input.map(mapFn)
    .reduce((acc, item) => item != null && acc.concat(item), [])
}

const generateDTD = (xmlDocument) =>
  `<?xml version="${xmlDocument.xmlVersion}" encoding="${xmlDocument.xmlEncoding}" ?>`;

const isVideoADM = (html) => html != null && VAST_RXP.test(html);
const getMediaType = (bid) => isVideoADM(bid.adm) ? VIDEO : BANNER;
const nullOrType = (value, type) =>
  value == null || (typeof value) === type // eslint-disable-line valid-typeof

function getID(loc) {
  const host = loc.hostname.split('.');
  const short = host.slice(
    host.length - (SIMPLE_TLD_TEST.test(loc.host) ? 3 : 2)
  ).join('.');
  return btoa(short).replace(/=+$/, '');
}

const enc = encodeURIComponent;

function getUIDSafe() {
  try {
    return storage.getDataFromLocalStorage(AMUID_KEY)
  } catch (e) {
    return null
  }
}

function setUIDSafe(uid) {
  try {
    storage.setDataInLocalStorage(AMUID_KEY, uid)
  } catch (e) {
    // do nothing
  }
}

function nestedQs (qsData) {
  const out = [];
  Object.keys(qsData || {}).forEach((key) => {
    out.push(enc(key) + '=' + enc(String(qsData[key])));
  });

  return enc(out.join('&'));
}

function createBidMap(bids) {
  const out = {};
  _each(bids, (bid) => {
    out[bid.bidId] = convertRequest(bid)
  })
  return out;
}

const trackEvent = (eventName, data) =>
  triggerPixel(`${TRACKING_ENDPOINT}g_${eventName}?${formatQS({
    ...data,
    ts: Date.now(),
    eid: getUniqueIdentifierStr(),
  })}`);

function convertRequest(bid) {
  const size = largestSize(bid.sizes, bid.mediaTypes) || [0, 0];
  const isVideoBid = bid.mediaType === VIDEO || VIDEO in bid.mediaTypes
  const av = isVideoBid || size[1] > 100;
  const tid = deepAccess(bid, 'params.tagId')

  const au = bid.params != null && typeof bid.params.adUnitId === 'string'
    ? bid.params.adUnitId : bid.adUnitCode;

  const multiSizes = [
    bid.sizes,
    deepAccess(bid, `mediaTypes.${BANNER}.sizes`, []) || [],
    deepAccess(bid, `mediaTypes.${VIDEO}.sizes`, []) || [],
  ]

  const params = {
    au,
    av,
    vr: isVideoBid,
    ms: multiSizes,
    aw: size[0],
    ah: size[1],
    tf: 0,
  };

  if (typeof tid === 'string' && tid.length > 0) {
    params.i = tid;
  }
  return params;
}

function decorateADM(bid) {
  const impressions = deepAccess(bid, 'ext.himp', [])
    .concat(bid.nurl != null ? [bid.nurl] : [])
    .filter((imp) => imp != null && imp.length > 0)
    .map((src) => `<img src="${src}" width="0" height="0"/>`)
    .join('');
  return bid.adm + impressions;
}

function transformXmlSimple(bid) {
  const pixels = []
  _each([bid.nurl].concat(bid.ext != null && bid.ext.himp != null ? bid.ext.himp : []), (pixel) => {
    if (pixel != null) {
      pixels.push(`<Impression><![CDATA[${pixel}]]></Impression>`)
    }
  });
  // find the current "Impression" here & slice ours in
  const impressionIndex = bid.adm.indexOf('<Impression')
  return bid.adm.slice(0, impressionIndex) + pixels.join('') + bid.adm.slice(impressionIndex)
}

function getOuterHTML(node) {
  return 'outerHTML' in node && node.outerHTML != null
    ? node.outerHTML : (new XMLSerializer()).serializeToString(node)
}

function decorateVideoADM(bid) {
  if (typeof DOMParser === 'undefined' || DOMParser.prototype.parseFromString == null) {
    return transformXmlSimple(bid)
  }

  const doc = new DOMParser().parseFromString(bid.adm, 'text/xml');
  if (doc == null || doc.querySelector('parsererror') != null) {
    return null;
  }

  const root = doc.querySelector('InLine,Wrapper')
  if (root == null) {
    return null;
  }

  const pixels = [bid.nurl].concat(bid.ext != null && bid.ext.himp != null ? bid.ext.himp : [])
    .filter((url) => url != null);

  _each(pixels, (pxl) => {
    const imagePixel = doc.createElement('Impression');
    const cdata = doc.createCDATASection(pxl);
    imagePixel.appendChild(cdata);
    root.appendChild(imagePixel);
  });

  const dtdMatch = xmlDTDRxp.exec(bid.adm);
  return (dtdMatch != null ? dtdMatch[0] : generateDTD(doc)) + getOuterHTML(doc.documentElement);
}

function resolveSize(bid, request, bidId) {
  if (bid.w != null && bid.w > 1 && bid.h != null && bid.h > 1) {
    return [bid.w, bid.h];
  }

  const bidRequest = request.m[bidId];
  if (bidRequest == null) {
    return [0, 0];
  }

  return [bidRequest.aw, bidRequest.ah];
}

function values(source) {
  if (Object.values != null) {
    return Object.values(source)
  }

  return Object.keys(source).map((key) => {
    return source[key]
  });
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    return nullOrType(deepAccess(bid, 'params.endpoint', null), 'string') &&
      nullOrType(deepAccess(bid, 'params.tagId', null), 'string') &&
      nullOrType(deepAccess(bid, 'params.testMode', null), 'boolean');
  },

  buildRequests(bidRequests, bidderRequest) {
    const loc = getLocation(bidderRequest);
    const tagId = deepAccess(bidRequests[0], 'params.tagId', null);
    const testMode = deepAccess(bidRequests[0], 'params.testMode', 0);
    const fbid = bidRequests[0] != null ? bidRequests[0] : {
      bidderRequestsCount: 0,
      bidderWinsCount: 0,
      bidRequestsCount: 0
    }

    const payload = {
      a: bidderRequest.auctionId,
      B: 0,
      b: loc.host,
      brc: fbid.bidderRequestsCount || 0,
      bwc: fbid.bidderWinsCount || 0,
      trc: fbid.bidRequestsCount || 0,
      tm: testMode,
      V: '$prebid.version$',
      i: (testMode && tagId != null) ? tagId : getID(loc),
      l: {},
      f: 0.01,
      cv: VERSION,
      st: 'prebid',
      h: screen.height,
      w: screen.width,
      gs: deepAccess(bidderRequest, 'gdprConsent.gdprApplies', ''),
      gc: deepAccess(bidderRequest, 'gdprConsent.consentString', ''),
      u: deepAccess(bidderRequest, 'refererInfo.canonicalUrl', loc.href),
      do: loc.host,
      re: deepAccess(bidderRequest, 'refererInfo.referer'),
      am: getUIDSafe(),
      usp: bidderRequest.uspConsent || '1---',
      smt: 1,
      d: '',
      m: createBidMap(bidRequests),
      cpp: config.getConfig('coppa') ? 1 : 0,
      fpd: config.getConfig('fpd'),
      eids: values(bidRequests.reduce((all, bid) => {
        // we only want unique ones in here
        if (bid == null || bid.userIdAsEids == null) {
          return all
        }

        _each(bid.userIdAsEids, (value) => {
          if (value == null) {
            return;
          }
          all[value.source] = value
        });
        return all;
      }, {})),
    };

    return {
      data: payload,
      method: 'POST',
      url: deepAccess(bidRequests[0], 'params.endpoint', DEFAULT_ENDPOINT),
      withCredentials: true,
    };
  },

  getUserSyncs(syncOptions, serverResponses) {
    if (serverResponses == null || serverResponses.length === 0) {
      return []
    }
    const output = []
    _each(serverResponses, function ({ body: response }) {
      if (response != null && response.p != null && response.p.hreq) {
        _each(response.p.hreq, function (syncPixel) {
          const pixelType = syncPixel.indexOf('__st=iframe') !== -1 ? 'iframe' : 'image';
          if (syncOptions.iframeEnabled || pixelType === 'image') {
            output.push({
              url: syncPixel,
              type: pixelType,
            });
          }
        });
      }
    });
    return output;
  },

  interpretResponse(serverResponse, request) {
    // validate the body/response
    const response = serverResponse.body;
    if (response == null || typeof response === 'string') {
      return [];
    }

    if (response.am && typeof response.am === 'string') {
      setUIDSafe(response.am);
    }

    return flatMap(Object.keys(response.r), (bidID) => {
      return flatMap(response.r[bidID], (siteBid) =>
        siteBid.b.map((bid) => {
          const mediaType = getMediaType(bid);
          // let ad = null;
          let ad = mediaType === BANNER ? decorateADM(bid) : decorateVideoADM(bid);
          if (ad == null) {
            return null;
          }

          const size = resolveSize(bid, request.data, bidID);

          return ({
            requestId: bidID,
            cpm: bid.price,
            width: size[0],
            height: size[1],
            creativeId: bid.crid,
            currency: 'USD',
            netRevenue: true,
            [mediaType === VIDEO ? 'vastXml' : 'ad']: ad,
            meta: {
              advertiserDomains: bid.adomain,
              mediaType,
            },
            ttl: mediaType === VIDEO ? 90 : 70
          });
        })).filter((possibleBid) => possibleBid != null);
    });
  },

  onSetTargeting(targetingData) {
    if (targetingData == null) {
      return;
    }

    trackEvent('pbst', {
      A: targetingData.bidder,
      w: targetingData.width,
      h: targetingData.height,
      bid: targetingData.adId,
      c1: targetingData.mediaType,
      np: targetingData.cpm,
      aud: targetingData.requestId,
      a: targetingData.adUnitCode,
      c2: nestedQs(targetingData.adserverTargeting),
    });
  },

  onTimeout(timeoutData) {
    if (timeoutData == null) {
      return;
    }

    trackEvent('pbto', {
      A: timeoutData.bidder,
      bid: timeoutData.bidId,
      a: timeoutData.adUnitCode,
      cn: timeoutData.timeout,
      aud: timeoutData.auctionId,
    });
  },

  onBidWon(bidWinData) {
    if (bidWinData == null) {
      return;
    }

    trackEvent('pbwin', {
      A: bidWinData.bidder,
      w: bidWinData.width,
      h: bidWinData.height,
      bid: bidWinData.adId,
      C: bidWinData.mediaType === BANNER ? 0 : 1,
      np: bidWinData.cpm,
      a: bidWinData.adUnitCode,
    });
  },
};

registerBidder(spec);
