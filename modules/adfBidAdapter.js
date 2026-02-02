// jshint esversion: 6, es3: false, node: true
'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {deepAccess, deepClone, deepSetValue, getWinDimensions, parseSizesInput, setOnAny} from '../src/utils.js';
import {Renderer} from '../src/Renderer.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';

const BIDDER_CODE = 'adf';
const GVLID = 50;
const BIDDER_ALIAS = [
  { code: 'adformOpenRTB', gvlid: GVLID },
  { code: 'adform', gvlid: GVLID }
];

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
    let app, site;

    const commonFpd = bidderRequest.ortb2 || {};
    const user = commonFpd.user || {};
    if (typeof commonFpd.app === 'object') {
      app = commonFpd.app || {};
    } else {
      site = commonFpd.site || {};
      if (!site.page) {
        site.page = bidderRequest.refererInfo.page;
      }
    }

    const device = commonFpd.device || {};
    const { innerWidth, innerHeight } = getWinDimensions();
    device.w = device.w || innerWidth;
    device.h = device.h || innerHeight;
    device.ua = device.ua || navigator.userAgent;

    const source = commonFpd.source || {};
    source.fd = 1;

    const regs = commonFpd.regs || {};

    const adxDomain = setOnAny(validBidRequests, 'params.adxDomain') || 'adx.adform.net';

    const pt = setOnAny(validBidRequests, 'params.pt') || setOnAny(validBidRequests, 'params.priceType') || 'net';
    const test = setOnAny(validBidRequests, 'params.test');
    const currency = getCurrencyFromBidderRequest(bidderRequest);
    const cur = currency && [ currency ];
    const eids = setOnAny(validBidRequests, 'userIdAsEids');
    const schain = setOnAny(validBidRequests, 'ortb2.source.ext.schain');

    if (eids) {
      deepSetValue(user, 'ext.eids', eids);
    }

    if (schain) {
      deepSetValue(source, 'ext.schain', schain);
    }

    const imp = validBidRequests.map((bid, id) => {
      bid.netRevenue = pt;

      const floorInfo = bid.getFloor ? bid.getFloor({
        currency: currency || 'USD',
        size: '*',
        mediaType: '*'
      }) : {};

      const bidfloor = floorInfo?.floor;
      const bidfloorcur = floorInfo?.currency;
      const { mid, inv, mname } = bid.params;
      const impExt = bid.ortb2Imp?.ext;

      const imp = {
        id: id + 1,
        tagid: mid,
        bidfloor,
        bidfloorcur,
        ext: {
          ...impExt,
          bidder: {
            inv,
            mname
          }
        }
      };

      if (bid.nativeOrtbRequest && bid.nativeOrtbRequest.assets) {
        const assets = bid.nativeOrtbRequest.assets;
        const requestAssets = [];
        for (let i = 0; i < assets.length; i++) {
          const asset = deepClone(assets[i]);
          const img = asset.img;
          if (img) {
            const aspectratios = img.ext && img.ext.aspectratios;

            if (aspectratios) {
              const ratioWidth = parseInt(aspectratios[0].split(':')[0], 10);
              const ratioHeight = parseInt(aspectratios[0].split(':')[1], 10);
              img.wmin = img.wmin || 0;
              img.hmin = ratioHeight * img.wmin / ratioWidth | 0;
            }
          }
          requestAssets.push(asset);
        }

        imp.native = {
          request: {
            assets: requestAssets
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
      id: bidderRequest.bidderRequestId,
      site,
      app,
      user,
      device,
      source,
      ext: { pt },
      cur,
      imp,
      regs
    };

    if (test) {
      request.is_debug = !!test;
      request.test = 1;
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
        const dsa = deepAccess(bidResponse, 'ext.dsa');
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
            advertiserDomains: bidResponse.adomain,
            dsa,
            primaryCatId: bidResponse.cat?.[0],
            secondaryCatIds: bidResponse.cat?.slice(1)
          }
        };

        if (bidResponse.native) {
          result.native = {
            ortb: bidResponse.native
          };
        } else {
          if (mediaType === VIDEO) {
            result.vastXml = bidResponse.adm;
            if (bidResponse.nurl) {
              result.vastUrl = bidResponse.nurl;
            }
          } else {
            result.ad = bidResponse.adm;
          }
        }

        if (!bid.renderer && mediaType === VIDEO && deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
          result.renderer = Renderer.install({id: bid.bidId, url: OUTSTREAM_RENDERER_URL, adUnitCode: bid.adUnitCode});
          result.renderer.setRender(renderer);
        }

        return result;
      }
      return undefined;
    }).filter(Boolean);
  }
};

registerBidder(spec);

function flatten(arr) {
  return [].concat(...arr);
}

function renderer(bid) {
  bid.renderer.push(() => {
    window.Adform.renderOutstream(bid);
  });
}
