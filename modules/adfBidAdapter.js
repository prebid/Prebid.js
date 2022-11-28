// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {_map, deepAccess, deepSetValue, mergeDeep, parseSizesInput} from '../src/utils.js';
import {config} from '../src/config.js';
import {Renderer} from '../src/Renderer.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const { getConfig } = config;

const BIDDER_CODE = 'adf';
const GVLID = 50;
const BIDDER_ALIAS = [
  { code: 'adformOpenRTB', gvlid: GVLID },
  { code: 'adform', gvlid: GVLID }
];
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
const OUTSTREAM_RENDERER_URL = 'https://s2.adform.net/banners/scripts/video/outstream/render.js';

export const spec = {
  code: BIDDER_CODE,
  aliases: BIDDER_ALIAS,
  gvlid: GVLID,
  supportedMediaTypes: [ NATIVE, BANNER, VIDEO ],
  isBidRequestValid: (bid) => {
    const params = bid.params || {};
    const { mid, inv, mname } = params;
    return !!(mid || (inv && mname));
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
      }
    }

    const device = getConfig('device') || {};
    device.w = device.w || window.innerWidth;
    device.h = device.h || window.innerHeight;
    device.ua = device.ua || navigator.userAgent;

    const adxDomain = setOnAny(validBidRequests, 'params.adxDomain') || 'adx.adform.net';

    const pt = setOnAny(validBidRequests, 'params.pt') || setOnAny(validBidRequests, 'params.priceType') || 'net';
    const tid = bidderRequest.auctionId;
    const test = setOnAny(validBidRequests, 'params.test');
    const currency = getConfig('currency.adServerCurrency');
    const cur = currency && [ currency ];
    const eids = setOnAny(validBidRequests, 'userIdAsEids');
    const schain = setOnAny(validBidRequests, 'schain');

    const imp = validBidRequests.map((bid, id) => {
      bid.netRevenue = pt;

      const floorInfo = bid.getFloor ? bid.getFloor({
        currency: currency || 'USD'
      }) : {};
      const bidfloor = floorInfo.floor;
      const bidfloorcur = floorInfo.currency;
      const { mid, inv, mname } = bid.params;

      const imp = {
        id: id + 1,
        tagid: mid,
        bidfloor,
        bidfloorcur,
        ext: {
          bidder: {
            inv,
            mname
          }
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
          request: {
            assets
          }
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
      device,
      source: { tid, fd: 1 },
      ext: { pt },
      cur,
      imp
    };

    if (test) {
      request.is_debug = !!test;
      request.test = 1;
    }

    if (config.getConfig('coppa')) {
      deepSetValue(request, 'regs.coppa', 1);
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
      url: 'https://' + adxDomain + '/adx/openrtb',
      data: JSON.stringify(request),
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
        const mediaType = deepAccess(bidResponse, 'ext.prebid.type');
        const result = {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          creativeId: bidResponse.crid,
          ttl: 360,
          netRevenue: bid.netRevenue === 'net',
          currency: cur,
          mediaType,
          width: bidResponse.w,
          height: bidResponse.h,
          dealId: bidResponse.dealid,
          meta: {
            mediaType,
            advertiserDomains: bidResponse.adomain
          }
        };

        if (bidResponse.native) {
          result.native = parseNative(bidResponse);
        } else {
          result[ mediaType === VIDEO ? 'vastXml' : 'ad' ] = bidResponse.adm;
        }

        if (!bid.renderer && mediaType === VIDEO && deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
          result.renderer = Renderer.install({id: bid.bidId, url: OUTSTREAM_RENDERER_URL, adUnitCode: bid.adUnitCode});
          result.renderer.setRender(renderer);
        }

        return result;
      }
    }).filter(Boolean);
  }
};

registerBidder(spec);

function parseNative(bid) {
  const { assets, link, imptrackers, jstracker } = bid.native;
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

function renderer(bid) {
  bid.renderer.push(() => {
    window.Adform.renderOutstream(bid);
  });
}
