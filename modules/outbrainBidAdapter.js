// jshint esversion: 6, es3: false, node: true
'use strict';

import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import { NATIVE, BANNER } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, replaceAuctionPrice, _map, isArray } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'outbrain';
const GVLID = 164;
const CURRENCY = 'USD';
const NATIVE_ASSET_IDS = { 0: 'title', 2: 'icon', 3: 'image', 5: 'sponsoredBy', 4: 'body', 1: 'cta' };
const NATIVE_PARAMS = {
  title: { id: 0, name: 'title' },
  icon: { id: 2, type: 1, name: 'img' },
  image: { id: 3, type: 3, name: 'img' },
  sponsoredBy: { id: 5, name: 'data', type: 1 },
  body: { id: 4, name: 'data', type: 2 },
  cta: { id: 1, type: 12, name: 'data' }
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [ NATIVE, BANNER ],
  isBidRequestValid: (bid) => {
    if (typeof bid.params !== 'object') {
      return false;
    }

    if (typeof deepAccess(bid, 'params.publisher.id') !== 'string') {
      return false;
    }

    if (!!bid.params.tagid && typeof bid.params.tagid !== 'string') {
      return false;
    }

    if (!!bid.params.bcat && (typeof bid.params.bcat !== 'object' || !bid.params.bcat.every(item => typeof item === 'string'))) {
      return false;
    }

    if (!!bid.params.badv && (typeof bid.params.badv !== 'object' || !bid.params.badv.every(item => typeof item === 'string'))) {
      return false;
    }

    return (
      !!config.getConfig('outbrain.bidderUrl') &&
      !!(bid.nativeParams || bid.sizes)
    );
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const page = bidderRequest.refererInfo.page;
    const ua = navigator.userAgent;
    const test = setOnAny(validBidRequests, 'params.test');
    const publisher = setOnAny(validBidRequests, 'params.publisher');
    const bcat = setOnAny(validBidRequests, 'params.bcat');
    const badv = setOnAny(validBidRequests, 'params.badv');
    const eids = setOnAny(validBidRequests, 'userIdAsEids')
    const cur = CURRENCY;
    const endpointUrl = config.getConfig('outbrain.bidderUrl');
    const timeout = bidderRequest.timeout;

    const imps = validBidRequests.map((bid, id) => {
      bid.netRevenue = 'net';
      const imp = {
        id: id + 1 + ''
      }

      if (bid.params.tagid) {
        imp.tagid = bid.params.tagid
      }

      if (bid.nativeParams) {
        imp.native = {
          request: JSON.stringify({
            assets: getNativeAssets(bid)
          })
        }
      } else {
        imp.banner = {
          format: transformSizes(bid.sizes)
        }
      }

      if (typeof bid.getFloor === 'function') {
        const floor = _getFloor(bid, bid.nativeParams ? NATIVE : BANNER);
        if (floor) {
          imp.bidfloor = floor;
        }
      }

      return imp;
    });

    const request = {
      id: bidderRequest.auctionId,
      site: { page, publisher },
      device: { ua },
      source: { fd: 1 },
      cur: [cur],
      tmax: timeout,
      imp: imps,
      bcat: bcat,
      badv: badv,
      ext: {
        prebid: {
          channel: {
            name: 'pbjs',
            version: '$prebid.version$'
          }
        }
      }
    };

    if (test) {
      request.is_debug = !!test;
      request.test = 1;
    }

    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies')) {
      deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString)
      deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies & 1)
    }
    if (bidderRequest.uspConsent) {
      deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent)
    }
    if (config.getConfig('coppa') === true) {
      deepSetValue(request, 'regs.coppa', config.getConfig('coppa') & 1)
    }

    if (eids) {
      deepSetValue(request, 'user.ext.eids', eids);
    }

    return {
      method: 'POST',
      url: endpointUrl,
      data: JSON.stringify(request),
      bids: validBidRequests
    };
  },
  interpretResponse: (serverResponse, { bids }) => {
    if (!serverResponse.body) {
      return [];
    }
    const { seatbid, cur } = serverResponse.body;

    const bidResponses = flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);

    return bids.map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (bidResponse) {
        const type = bid.nativeParams ? NATIVE : BANNER;
        const bidObject = {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          creativeId: bidResponse.crid,
          ttl: 360,
          netRevenue: bid.netRevenue === 'net',
          currency: cur,
          mediaType: type,
          nurl: bidResponse.nurl,
        };
        if (type === NATIVE) {
          bidObject.native = parseNative(bidResponse);
        } else {
          bidObject.ad = bidResponse.adm;
          bidObject.width = bidResponse.w;
          bidObject.height = bidResponse.h;
        }
        bidObject.meta = {};
        if (bidResponse.adomain && bidResponse.adomain.length > 0) {
          bidObject.meta.advertiserDomains = bidResponse.adomain;
        }
        return bidObject;
      }
    }).filter(Boolean);
  },
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    const syncs = [];
    let syncUrl = config.getConfig('outbrain.usersyncUrl');

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
      ajax(replaceAuctionPrice(bid.nurl, bid.originalCpm))
    }
  }
};

registerBidder(spec);

function parseNative(bid) {
  const { assets, link, privacy, eventtrackers } = JSON.parse(bid.adm);
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || undefined
  };
  assets.forEach(asset => {
    const kind = NATIVE_ASSET_IDS[asset.id];
    const content = kind && asset[NATIVE_PARAMS[kind].name];
    if (content) {
      result[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });
  if (privacy) {
    result.privacyLink = privacy;
  }
  if (eventtrackers) {
    result.impressionTrackers = [];
    eventtrackers.forEach(tracker => {
      if (tracker.event !== 1) return;
      switch (tracker.method) {
        case 1: // img
          result.impressionTrackers.push(tracker.url);
          break;
        case 2: // js
          result.javascriptTrackers = `<script src=\"${tracker.url}\"></script>`;
          break;
      }
    });
  }
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

function getNativeAssets(bid) {
  return _map(bid.nativeParams, (bidParams, key) => {
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
        w = parseInt(sizes[0], 10);
        h = parseInt(sizes[1], 10);
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
}

/* Turn bid request sizes into ut-compatible format */
function transformSizes(requestSizes) {
  if (!isArray(requestSizes)) {
    return [];
  }

  if (requestSizes.length === 2 && !isArray(requestSizes[0])) {
    return [{
      w: parseInt(requestSizes[0], 10),
      h: parseInt(requestSizes[1], 10)
    }];
  } else if (isArray(requestSizes[0])) {
    return requestSizes.map(item =>
      ({
        w: parseInt(item[0], 10),
        h: parseInt(item[1], 10)
      })
    );
  }

  return [];
}

function _getFloor(bid, type) {
  const floorInfo = bid.getFloor({
    currency: CURRENCY,
    mediaType: type,
    size: '*'
  });
  if (typeof floorInfo === 'object' && floorInfo.currency === CURRENCY && !isNaN(parseFloat(floorInfo.floor))) {
    return parseFloat(floorInfo.floor);
  }
  return null;
}
