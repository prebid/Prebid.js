import { BANNER, VIDEO } from '../../src/mediaTypes.js';
import {deepAccess, isArray, isEmptyStr, isFn, logError} from '../../src/utils.js';
/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */
/**
 * Adds userIds to payload
 *
 * @param bidRequest
 * @param payload
 */
export function fillUsersIds(bidRequest, payload) {
  if (bidRequest.hasOwnProperty('userId')) {
    let didMapping = {
      did_netid: 'userId.netId',
      did_id5: 'userId.id5id.uid',
      did_id5_linktype: 'userId.id5id.ext.linkType',
      did_uid2: 'userId.uid2',
      did_sharedid: 'userId.sharedid',
      did_pubcid: 'userId.pubcid',
      did_uqid: 'userId.utiq',
      did_cruid: 'userId.criteoid',
      did_euid: 'userId.euid',
      // did_tdid: 'unifiedId',
      did_tdid: 'userId.tdid',
      did_ppuid: function() {
        let path = 'userId.pubProvidedId';
        let value = deepAccess(bidRequest, path);
        if (isArray(value)) {
          for (const rec of value) {
            if (rec.uids && rec.uids.length > 0) {
              for (let i = 0; i < rec.uids.length; i++) {
                if ('id' in rec.uids[i] && deepAccess(rec.uids[i], 'ext.stype') === 'ppuid') {
                  return (rec.uids[i].atype ?? '') + ':' + rec.source + ':' + rec.uids[i].id;
                }
              }
            }
          }
        }
        return undefined;
      },
      did_cpubcid: 'crumbs.pubcid'
    };
    for (let paramName in didMapping) {
      let path = didMapping[paramName];

      // handle function
      if (typeof path == 'function') {
        let value = path(paramName);
        if (value) {
          payload[paramName] = value;
        }
        continue;
      }
      // direct access
      let value = deepAccess(bidRequest, path);
      if (typeof value == 'string' || typeof value == 'number') {
        payload[paramName] = value;
      } else if (typeof value == 'object') {
        // trying to find string ID value
        if (typeof deepAccess(bidRequest, path + '.id') == 'string') {
          payload[paramName] = deepAccess(bidRequest, path + '.id');
        } else {
          if (Object.keys(value).length > 0) {
            logError(`WARNING: fillUserIds had to use first key in user object to get value for bid.userId key: ${path}.`);
            payload[paramName] = value[Object.keys(value)[0]];
          }
        }
      }
    }
  }
}

export function appendToUrl(url, what) {
  if (!what) {
    return url;
  }
  return url + (url.indexOf('?') !== -1 ? '&' : '?') + what;
}

export function objectToQueryString(obj, prefix) {
  let str = [];
  let p;
  for (p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? prefix + '[' + p + ']' : p;
      let v = obj[p];
      str.push((v !== null && typeof v === 'object')
        ? objectToQueryString(v, k)
        : encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
  }
  return str.filter(n => n).join('&');
}

/**
 * Check if it's a banner bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a banner bid
 */
export function isBannerRequest(bid) {
  return bid.mediaType === 'banner' || !!deepAccess(bid, 'mediaTypes.banner') || !isVideoRequest(bid);
}

/**
 * Check if it's a video bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a video bid
 */
export function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!deepAccess(bid, 'mediaTypes.video');
}

/**
 * Get video sizes
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object}
 */
export function getVideoSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.video.playerSize') || bid.sizes);
}

/**
 * Get video context
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object}
 */
export function getVideoContext(bid) {
  return deepAccess(bid, 'mediaTypes.video.context') || 'unknown';
}

/**
 * Get banner sizes
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {object} True if it's a video bid
 */
export function getBannerSizes(bid) {
  return parseSizes(deepAccess(bid, 'mediaTypes.banner.sizes') || bid.sizes);
}

/**
 * Parse size
 * @param size
 * @returns {object} sizeObj
 */
export function parseSize(size) {
  let sizeObj = {}
  sizeObj.width = parseInt(size[0], 10);
  sizeObj.height = parseInt(size[1], 10);
  return sizeObj;
}

/**
 * Parse sizes
 * @param sizes
 * @returns {{width: number , height: number }[]}
 */
export function parseSizes(sizes) {
  if (Array.isArray(sizes[0])) { // is there several sizes ? (ie. [[728,90],[200,300]])
    return sizes.map(size => parseSize(size));
  }
  return [parseSize(sizes)]; // or a single one ? (ie. [728,90])
}

/**
 * Get MediaInfo object for server request
 *
 * @param mediaTypesInfo
 * @returns {*}
 */
export function convertMediaInfoForRequest(mediaTypesInfo) {
  let requestData = {};
  Object.keys(mediaTypesInfo).forEach(mediaType => {
    requestData[mediaType] = mediaTypesInfo[mediaType].map(size => {
      return size.width + 'x' + size.height;
    }).join(',');
  });
  return requestData;
}

/**
 * Get media types info
 *
 * @param bid
 */
export function getMediaTypesInfo(bid) {
  let mediaTypesInfo = {};

  if (bid.mediaTypes) {
    Object.keys(bid.mediaTypes).forEach(mediaType => {
      if (mediaType === BANNER) {
        mediaTypesInfo[mediaType] = getBannerSizes(bid);
      }
      if (mediaType === VIDEO) {
        mediaTypesInfo[mediaType] = getVideoSizes(bid);
      }
    });
  } else {
    mediaTypesInfo[BANNER] = getBannerSizes(bid);
  }
  return mediaTypesInfo;
}

/**
 * Get Bid Floor
 * @param bid
 * @returns {number|*}
 */
export function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'EUR',
      mediaType: '*',
      size: '*',
    });
    return bidFloor?.floor;
  } catch (_) {
    return 0
  }
}

/**
 * Convert site.content to string
 * @param content
 */
export function siteContentToString(content) {
  if (!content) {
    return '';
  }
  let stringKeys = ['id', 'title', 'series', 'season', 'artist', 'genre', 'isrc', 'url', 'keywords'];
  let intKeys = ['episode', 'context', 'livestream'];
  let arrKeys = ['cat'];
  let retArr = [];
  arrKeys.forEach(k => {
    let val = deepAccess(content, k);
    if (val && Array.isArray(val)) {
      retArr.push(k + ':' + val.join('|'));
    }
  });
  intKeys.forEach(k => {
    let val = deepAccess(content, k);
    if (val && typeof val === 'number') {
      retArr.push(k + ':' + val);
    }
  });
  stringKeys.forEach(k => {
    let val = deepAccess(content, k);
    if (val && typeof val === 'string') {
      retArr.push(k + ':' + encodeURIComponent(val));
    }
  });
  return retArr.join(',');
}

/**
 * Assigns multiple values to the specified keys on an object if the values are not undefined.
 * @param {Object} target - The object to which the values will be assigned.
 * @param {Object} values - An object containing key-value pairs to be assigned.
 */
export function assignDefinedValues(target, values) {
  for (const key in values) {
    if (values[key] !== undefined) {
      target[key] = values[key];
    }
  }
}

/**
 * Extracts user segments/topics from the bid request object
 * @param {Object} bid - The bid request object
 * @returns {{segclass: *, segtax: *, segments: *}|undefined} - User segments/topics or undefined if not found
 */
export function extractUserSegments(bid) {
  const userData = deepAccess(bid, 'ortb2.user.data') || [];
  for (const dataObj of userData) {
    if (dataObj.segment && isArray(dataObj.segment) && dataObj.segment.length > 0) {
      const segments = dataObj.segment
        .filter(seg => seg.id && !isEmptyStr(seg.id) && isFinite(seg.id))
        .map(seg => Number(seg.id));
      if (segments.length > 0) {
        return {
          segtax: deepAccess(dataObj, 'ext.segtax'),
          segclass: deepAccess(dataObj, 'ext.segclass'),
          segments: segments.join(',')
        };
      }
    }
  }
  return undefined;
}

export function handleSyncUrls(syncOptions, serverResponses, gdprConsent, uspConsent) {
  if (!serverResponses || serverResponses.length === 0) {
    return [];
  }

  const syncs = [];
  let gdprParams = '';
  if (gdprConsent) {
    if ('gdprApplies' in gdprConsent && typeof gdprConsent.gdprApplies === 'boolean') {
      gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
    }
  }

  if (serverResponses.length > 0 && serverResponses[0].body.userSync) {
    if (syncOptions.iframeEnabled) {
      serverResponses[0].body.userSync.iframeUrl.forEach((url) => syncs.push({
        type: 'iframe',
        url: appendToUrl(url, gdprParams)
      }));
    }
    if (syncOptions.pixelEnabled) {
      serverResponses[0].body.userSync.imageUrl.forEach((url) => syncs.push({
        type: 'image',
        url: appendToUrl(url, gdprParams)
      }));
    }
  }
  return syncs;
}

export function interpretResponse(serverResponse, bidRequest, rendererFunc) {
  const bidResponses = [];
  const response = serverResponse.body;
  const crid = response.crid || 0;
  const cpm = response.cpm / 1000000 || 0;
  if (cpm !== 0 && crid !== 0) {
    const dealId = response.dealid || '';
    const currency = response.currency || 'EUR';
    const netRevenue = (response.netRevenue === undefined) ? true : response.netRevenue;
    const bidResponse = {
      requestId: response.bid_id,
      cpm: cpm,
      width: response.width,
      height: response.height,
      creativeId: crid,
      dealId: dealId,
      currency: currency,
      netRevenue: netRevenue,
      type: response.type,
      ttl: 60,
      meta: {
        advertiserDomains: response.adomain || []
      }
    };

    if (response.vastUrl) {
      bidResponse.vastUrl = response.vastUrl;
      bidResponse.mediaType = 'video';
    }
    if (response.vastXml) {
      bidResponse.vastXml = response.vastXml;
      bidResponse.mediaType = 'video';
    }
    if (response.renderer) {
      bidResponse.renderer = rendererFunc(bidRequest, response);
    }

    if (response.videoCacheKey) {
      bidResponse.videoCacheKey = response.videoCacheKey;
    }

    if (response.adTag) {
      bidResponse.ad = response.adTag;
    }

    if (response.bid_appendix) {
      Object.keys(response.bid_appendix).forEach(fieldName => {
        bidResponse[fieldName] = response.bid_appendix[fieldName];
      });
    }

    bidResponses.push(bidResponse);
  }
  return bidResponses;
}
