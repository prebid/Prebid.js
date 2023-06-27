// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {
  _map,
  deepAccess,
  deepSetValue,
  getDNT,
  isArray,
  isPlainObject,
  isStr,
  mergeDeep,
  parseSizesInput,
  replaceAuctionPrice,
  triggerPixel
} from '../src/utils.js';
import {config} from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const { getConfig } = config;

const BIDDER_CODE = 'adxcg';
const SECURE_BID_URL = 'https://pbc.adxcg.net/rtb/ortb/pbc?adExchangeId=1';

const NATIVE_ASSET_IDS = { 0: 'title', 2: 'icon', 3: 'image', 5: 'sponsoredBy', 4: 'body', 1: 'cta' };
const NATIVE_PARAMS = {
  title: {
    id: 0,
    name: 'title'
  },
  icon: {
    id: 2,
    type: 1,
    name: 'img'
  },
  image: {
    id: 3,
    type: 3,
    name: 'img'
  },
  sponsoredBy: {
    id: 5,
    name: 'data',
    type: 1
  },
  body: {
    id: 4,
    name: 'data',
    type: 2
  },
  cta: {
    id: 1,
    type: 12,
    name: 'data'
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ NATIVE, BANNER, VIDEO ],
  isBidRequestValid: (bid) => {
    const params = bid.params || {};
    const { adzoneid } = params;
    return !!(adzoneid);
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let app, site;

    const commonFpd = bidderRequest.ortb2 || {};
    let { user } = commonFpd;

    if (typeof getConfig('app') === 'object') {
      app = getConfig('app') || {};
      if (commonFpd.app) {
        mergeDeep(app, commonFpd.app);
      }
    } else {
      site = getConfig('site') || {};
      if (commonFpd.site) {
        mergeDeep(site, commonFpd.site);
      }

      if (!site.page) {
        site.page = bidderRequest.refererInfo.page;
        site.domain = bidderRequest.refererInfo.domain;
      }
    }

    const device = getConfig('device') || {};
    device.w = device.w || window.innerWidth;
    device.h = device.h || window.innerHeight;
    device.ua = device.ua || navigator.userAgent;
    device.dnt = getDNT() ? 1 : 0;
    device.language = (navigator && navigator.language) ? navigator.language.split('-')[0] : '';

    const tid = bidderRequest.auctionId;
    const test = setOnAny(validBidRequests, 'params.test');
    const currency = getConfig('currency.adServerCurrency');
    const cur = currency && [ currency ];
    const eids = setOnAny(validBidRequests, 'userIdAsEids');
    const schain = setOnAny(validBidRequests, 'schain');

    const imp = validBidRequests.map((bid, id) => {
      const floorInfo = bid.getFloor ? bid.getFloor({
        currency: currency || 'USD'
      }) : {};
      const bidfloor = floorInfo.floor;
      const bidfloorcur = floorInfo.currency;
      const { adzoneid } = bid.params;

      const imp = {
        id: id + 1,
        tagid: adzoneid,
        secure: 1,
        bidfloor,
        bidfloorcur,
        ext: {
        }
      };

      const assets = _map(bid.nativeParams, (bidParams, key) => {
        const props = NATIVE_PARAMS[key];
        const asset = {
          required: bidParams.required & 1,
        };
        if (props) {
          asset.id = props.id;
          let wmin, hmin, w, h;
          let aRatios = bidParams.aspect_ratios;

          if (aRatios && aRatios[0]) {
            aRatios = aRatios[0];
            wmin = aRatios.min_width || 0;
            hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
          }

          if (bidParams.sizes) {
            const sizes = flatten(bidParams.sizes);
            w = sizes[0];
            h = sizes[1];
          }

          asset[props.name] = {
            len: bidParams.len,
            type: props.type,
            wmin,
            hmin,
            w,
            h
          };

          return asset;
        }
      }).filter(Boolean);

      if (assets.length) {
        imp.native = {
          request: JSON.stringify({assets: assets})
        };
      }

      const bannerParams = deepAccess(bid, 'mediaTypes.banner');

      if (bannerParams && bannerParams.sizes) {
        const sizes = parseSizesInput(bannerParams.sizes);
        const format = sizes.map(size => {
          const [ width, height ] = size.split('x');
          const w = parseInt(width, 10);
          const h = parseInt(height, 10);
          return { w, h };
        });

        imp.banner = {
          format
        };
      }

      const videoParams = deepAccess(bid, 'mediaTypes.video');
      if (videoParams) {
        imp.video = videoParams;
      }

      return imp;
    });

    const request = {
      id: bidderRequest.auctionId,
      site,
      app,
      user,
      geo: { utcoffset: new Date().getTimezoneOffset() },
      device,
      source: { tid, fd: 1 },
      ext: {
        prebid: {
          channel: {
            name: 'pbjs',
            version: '$prebid.version$'
          }
        }
      },
      cur,
      imp
    };

    if (test) {
      request.is_debug = !!test;
      request.test = 1;
    }
    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies') !== undefined) {
      deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies & 1);
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    if (eids) {
      deepSetValue(request, 'user.ext.eids', eids);
    }

    if (schain) {
      deepSetValue(request, 'source.ext.schain', schain);
    }

    return {
      method: 'POST',
      url: SECURE_BID_URL,
      data: JSON.stringify(request),
      options: {
        contentType: 'application/json'
      },
      bids: validBidRequests
    };
  },
  interpretResponse: function(serverResponse, { bids }) {
    if (!serverResponse.body) {
      return;
    }
    const { seatbid, cur } = serverResponse.body;

    const bidResponses = flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);

    return bids.map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (bidResponse) {
        const mediaType = deepAccess(bidResponse, 'ext.crType');
        const result = {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          creativeId: bidResponse.crid,
          ttl: bidResponse.ttl ? bidResponse.ttl : 300,
          netRevenue: bid.netRevenue === 'net',
          currency: cur,
          burl: bid.burl || '',
          mediaType: mediaType,
          width: bidResponse.w,
          height: bidResponse.h,
          dealId: bidResponse.dealid,
        };

        deepSetValue(result, 'meta.mediaType', mediaType);
        if (isArray(bidResponse.adomain)) {
          deepSetValue(result, 'meta.advertiserDomains', bidResponse.adomain);
        }

        if (isPlainObject(bidResponse.ext)) {
          if (isStr(bidResponse.ext.mediaType)) {
            deepSetValue(result, 'meta.mediaType', mediaType);
          }
          if (isStr(bidResponse.ext.advertiser_id)) {
            deepSetValue(result, 'meta.advertiserId', bidResponse.ext.advertiser_id);
          }
          if (isStr(bidResponse.ext.advertiser_name)) {
            deepSetValue(result, 'meta.advertiserName', bidResponse.ext.advertiser_name);
          }
          if (isStr(bidResponse.ext.agency_name)) {
            deepSetValue(result, 'meta.agencyName', bidResponse.ext.agency_name);
          }
        }
        if (mediaType === BANNER) {
          result.ad = bidResponse.adm;
        } else if (mediaType === NATIVE) {
          result.native = parseNative(bidResponse);
          result.width = 0;
          result.height = 0;
        } else if (mediaType === VIDEO) {
          result.vastUrl = bidResponse.nurl;
          result.vastXml = bidResponse.adm;
        }

        return result;
      }
    }).filter(Boolean);
  },
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    const syncs = [];
    let syncUrl = config.getConfig('adxcg.usersyncUrl');

    let query = [];
    if (syncOptions.pixelEnabled && syncUrl) {
      if (gdprConsent) {
        query.push('gdpr=' + (gdprConsent.gdprApplies & 1));
        query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
      }
      if (uspConsent) {
        query.push('us_privacy=' + encodeURIComponent(uspConsent));
      }

      syncs.push({
        type: 'image',
        url: syncUrl + (query.length ? '?' + query.join('&') : '')
      });
    }
    return syncs;
  },
  onBidWon: (bid) => {
    // for native requests we put the nurl as an imp tracker, otherwise if the auction takes place on prebid server
    // the server JS adapter puts the nurl in the adm as a tracking pixel and removes the attribute
    if (bid.nurl) {
      triggerPixel(replaceAuctionPrice(bid.nurl, bid.originalCpm))
    }
  }
};

registerBidder(spec);

function parseNative(bid) {
  const { assets, link, imptrackers, jstracker } = JSON.parse(bid.adm);
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || undefined,
    impressionTrackers: imptrackers || undefined,
    javascriptTrackers: jstracker ? [ jstracker ] : undefined
  };
  assets.forEach(asset => {
    const kind = NATIVE_ASSET_IDS[asset.id];
    const content = kind && asset[NATIVE_PARAMS[kind].name];
    if (content) {
      result[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });
  return result;
}

function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

function flatten(arr) {
  return [].concat(...arr);
}
